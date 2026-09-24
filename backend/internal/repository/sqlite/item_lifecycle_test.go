package sqlite_test

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"cost-per-day/backend/internal/domain"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
)

func TestSQLiteLifecyclePersistence(t *testing.T) {
	databaseConnection, databasePath := openTestDatabase(t)
	ctx := context.Background()
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)

	endedAt := "2026-09-11T12:00:00Z"
	salePrice := 40.25
	createdItem, createError := itemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:         "Lifecycle Item",
		Price:        100.75,
		PurchaseDate: "2026-09-01T12:00:00Z",
		Status:       domain.ItemStatusSold,
		EndedAt:      &endedAt,
		SalePrice:    &salePrice,
	})
	if createError != nil {
		t.Fatalf("create lifecycle item: %v", createError)
	}

	if closeError := databaseConnection.Close(); closeError != nil {
		t.Fatalf("close database: %v", closeError)
	}

	reopenedConnection, reopenError := sqliterepository.Open(ctx, databasePath)
	if reopenError != nil {
		t.Fatalf("reopen database: %v", reopenError)
	}
	defer reopenedConnection.Close()

	reopenedRepository := sqliterepository.NewItemRepository(reopenedConnection)
	persistedItem, getError := reopenedRepository.GetByID(ctx, domain.LegacyUserID, createdItem.ID)
	if getError != nil {
		t.Fatalf("get lifecycle item: %v", getError)
	}
	if persistedItem.Status != domain.ItemStatusSold {
		t.Fatalf("expected sold status, got %q", persistedItem.Status)
	}
	if persistedItem.EndedAt == nil || *persistedItem.EndedAt != endedAt {
		t.Fatalf("expected endedAt %q, got %v", endedAt, persistedItem.EndedAt)
	}
	if persistedItem.SalePrice == nil || *persistedItem.SalePrice != salePrice {
		t.Fatalf("expected sale price %.2f, got %v", salePrice, persistedItem.SalePrice)
	}
}

func TestLifecycleMigrationTreatsLegacyRowsAsActive(t *testing.T) {
	ctx := context.Background()
	databasePath := filepath.Join(t.TempDir(), "legacy.db")

	legacyDatabase, openError := sql.Open("sqlite", databasePath)
	if openError != nil {
		t.Fatalf("open legacy database: %v", openError)
	}

	legacySchema := `
		CREATE TABLE items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			price_micros INTEGER NOT NULL CHECK (price_micros > 0),
			purchase_date TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		CREATE TABLE settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		INSERT INTO settings (key, value, updated_at)
		VALUES
			('language', 'en', '2026-09-01T12:00:00Z'),
			('currency', 'USD', '2026-09-01T12:00:00Z');
		PRAGMA user_version = 1;
	`
	if _, schemaError := legacyDatabase.ExecContext(ctx, legacySchema); schemaError != nil {
		t.Fatalf("create legacy schema: %v", schemaError)
	}

	timestamp := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC).Format(time.RFC3339Nano)
	if _, insertError := legacyDatabase.ExecContext(ctx, `
		INSERT INTO items (name, price_micros, purchase_date, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, "Legacy Item", int64(100_000_000), "2026-09-01T12:00:00Z", timestamp, timestamp); insertError != nil {
		t.Fatalf("insert legacy item: %v", insertError)
	}

	if closeError := legacyDatabase.Close(); closeError != nil {
		t.Fatalf("close legacy database: %v", closeError)
	}

	migratedDatabase, migrationError := sqliterepository.Open(ctx, databasePath)
	if migrationError != nil {
		t.Fatalf("migrate legacy database: %v", migrationError)
	}
	defer migratedDatabase.Close()

	var schemaVersion int
	if scanError := migratedDatabase.QueryRowContext(ctx, "PRAGMA user_version").Scan(&schemaVersion); scanError != nil {
		t.Fatalf("read schema version: %v", scanError)
	}
	if schemaVersion != 8 {
		t.Fatalf("expected schema version 8, got %d", schemaVersion)
	}

	itemRepository := sqliterepository.NewItemRepository(migratedDatabase)
	migratedItem, getError := itemRepository.GetByID(ctx, domain.LegacyUserID, "1")
	if getError != nil {
		t.Fatalf("get migrated item: %v", getError)
	}
	if migratedItem.Status != domain.ItemStatusActive {
		t.Fatalf("expected legacy item to default to active, got %q", migratedItem.Status)
	}
	if migratedItem.EndedAt != nil || migratedItem.SalePrice != nil {
		t.Fatalf("expected legacy lifecycle fields to be empty")
	}
}
