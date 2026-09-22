package sqlite_test

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"path/filepath"
	"testing"

	"cost-per-day/backend/internal/domain"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
)

func openTestDatabase(t *testing.T) (*sql.DB, string) {
	t.Helper()

	databasePath := filepath.Join(t.TempDir(), "cost-per-day-test.db")
	databaseConnection, openError := sqliterepository.Open(context.Background(), databasePath)
	if openError != nil {
		t.Fatalf("failed to open test database: %v", openError)
	}
	t.Cleanup(func() {
		_ = databaseConnection.Close()
	})

	return databaseConnection, databasePath
}

func TestOpenConfiguresSQLiteAndRunsMigrations(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	ctx := context.Background()

	var journalMode string
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA journal_mode").Scan(&journalMode); scanError != nil {
		t.Fatalf("failed to read journal mode: %v", scanError)
	}
	if journalMode != "wal" {
		t.Fatalf("expected WAL journal mode, got %q", journalMode)
	}

	var foreignKeysEnabled int
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA foreign_keys").Scan(&foreignKeysEnabled); scanError != nil {
		t.Fatalf("failed to read foreign key setting: %v", scanError)
	}
	if foreignKeysEnabled != 1 {
		t.Fatalf("expected foreign keys to be enabled, got %d", foreignKeysEnabled)
	}

	var busyTimeout int
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA busy_timeout").Scan(&busyTimeout); scanError != nil {
		t.Fatalf("failed to read busy timeout: %v", scanError)
	}
	if busyTimeout < 5000 {
		t.Fatalf("expected busy timeout of at least 5000ms, got %d", busyTimeout)
	}

	var schemaVersion int
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA user_version").Scan(&schemaVersion); scanError != nil {
		t.Fatalf("failed to read schema version: %v", scanError)
	}
	if schemaVersion != 1 {
		t.Fatalf("expected schema version 1, got %d", schemaVersion)
	}

	if migrationError := sqliterepository.ApplyMigrations(ctx, databaseConnection); migrationError != nil {
		t.Fatalf("expected migrations to be repeatable, got: %v", migrationError)
	}

	var itemTableCount int
	if scanError := databaseConnection.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM sqlite_master
		WHERE type = 'table' AND name = 'items'
	`).Scan(&itemTableCount); scanError != nil {
		t.Fatalf("failed to inspect items table: %v", scanError)
	}
	if itemTableCount != 1 {
		t.Fatalf("expected items table to exist exactly once, got %d", itemTableCount)
	}
}

func TestOpenRejectsDatabaseFromNewerSchema(t *testing.T) {
	ctx := context.Background()
	databasePath := filepath.Join(t.TempDir(), "newer-schema.db")

	databaseConnection, openError := sqliterepository.Open(ctx, databasePath)
	if openError != nil {
		t.Fatalf("failed to open test database: %v", openError)
	}
	if _, versionError := databaseConnection.ExecContext(ctx, "PRAGMA user_version = 99"); versionError != nil {
		t.Fatalf("failed to set newer schema version: %v", versionError)
	}
	if closeError := databaseConnection.Close(); closeError != nil {
		t.Fatalf("failed to close test database: %v", closeError)
	}

	reopenedConnection, reopenError := sqliterepository.Open(ctx, databasePath)
	if reopenError == nil {
		_ = reopenedConnection.Close()
		t.Fatal("expected opening a newer schema to fail")
	}
}

func TestSQLiteItemRepositoryCRUD(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	ctx := context.Background()

	createdItem, createError := itemRepository.Create(ctx, domain.Item{
		Name:         "Laptop",
		Price:        1234.567891,
		PurchaseDate: "2026-09-20T10:00:00Z",
	})
	if createError != nil {
		t.Fatalf("failed to create item: %v", createError)
	}
	if createdItem.ID == "" {
		t.Fatal("expected generated item ID")
	}
	if createdItem.CreatedAt.IsZero() || createdItem.UpdatedAt.IsZero() {
		t.Fatal("expected timestamps to be populated")
	}

	fetchedItem, getError := itemRepository.GetByID(ctx, createdItem.ID)
	if getError != nil {
		t.Fatalf("failed to get created item: %v", getError)
	}
	if fetchedItem.Name != "Laptop" {
		t.Fatalf("expected name Laptop, got %q", fetchedItem.Name)
	}
	if math.Abs(fetchedItem.Price-1234.567891) > 0.0000001 {
		t.Fatalf("expected price to round-trip at six-decimal precision, got %.9f", fetchedItem.Price)
	}

	var storedPriceMicros int64
	if scanError := databaseConnection.QueryRowContext(ctx, "SELECT price_micros FROM items WHERE id = ?", createdItem.ID).Scan(&storedPriceMicros); scanError != nil {
		t.Fatalf("failed to inspect stored price: %v", scanError)
	}
	if storedPriceMicros != 1234567891 {
		t.Fatalf("expected fixed-point price 1234567891 micros, got %d", storedPriceMicros)
	}

	secondItem, secondCreateError := itemRepository.Create(ctx, domain.Item{
		Name:         "Monitor",
		Price:        450.25,
		PurchaseDate: "2026-09-21T10:00:00Z",
	})
	if secondCreateError != nil {
		t.Fatalf("failed to create second item: %v", secondCreateError)
	}

	items, listError := itemRepository.List(ctx)
	if listError != nil {
		t.Fatalf("failed to list items: %v", listError)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].ID != createdItem.ID || items[1].ID != secondItem.ID {
		t.Fatalf("expected deterministic ID order, got %q then %q", items[0].ID, items[1].ID)
	}

	updatedItem, updateError := itemRepository.Update(ctx, domain.Item{
		ID:           createdItem.ID,
		Name:         "Laptop Pro",
		Price:        1500.125,
		PurchaseDate: "2026-09-22T10:00:00Z",
	})
	if updateError != nil {
		t.Fatalf("failed to update item: %v", updateError)
	}
	if updatedItem.Name != "Laptop Pro" {
		t.Fatalf("expected updated name, got %q", updatedItem.Name)
	}
	if !updatedItem.CreatedAt.Equal(createdItem.CreatedAt) {
		t.Fatal("expected update to preserve creation timestamp")
	}

	if _, missingUpdateError := itemRepository.Update(ctx, domain.Item{
		ID:           "999999",
		Name:         "Missing",
		Price:        1,
		PurchaseDate: "2026-09-22T10:00:00Z",
	}); !errors.Is(missingUpdateError, domain.ErrItemNotFound) {
		t.Fatalf("expected ErrItemNotFound for missing update, got %v", missingUpdateError)
	}

	if deleteError := itemRepository.Delete(ctx, createdItem.ID); deleteError != nil {
		t.Fatalf("failed to delete item: %v", deleteError)
	}
	if _, missingGetError := itemRepository.GetByID(ctx, createdItem.ID); !errors.Is(missingGetError, domain.ErrItemNotFound) {
		t.Fatalf("expected ErrItemNotFound after deletion, got %v", missingGetError)
	}
	if missingDeleteError := itemRepository.Delete(ctx, createdItem.ID); !errors.Is(missingDeleteError, domain.ErrItemNotFound) {
		t.Fatalf("expected ErrItemNotFound for repeated delete, got %v", missingDeleteError)
	}
}

func TestSQLiteSettingsRepositoryReadAndUpdate(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	settingsRepository := sqliterepository.NewSettingsRepository(databaseConnection)
	ctx := context.Background()

	settings, getAllError := settingsRepository.GetAll(ctx)
	if getAllError != nil {
		t.Fatalf("failed to read settings: %v", getAllError)
	}
	if settings["language"] != "en" {
		t.Fatalf("expected default language en, got %q", settings["language"])
	}
	if settings["currency"] != "USD" {
		t.Fatalf("expected default currency USD, got %q", settings["currency"])
	}

	if setError := settingsRepository.Set(ctx, "language", "id"); setError != nil {
		t.Fatalf("failed to update language: %v", setError)
	}
	language, getError := settingsRepository.GetByKey(ctx, "language")
	if getError != nil {
		t.Fatalf("failed to read updated language: %v", getError)
	}
	if language != "id" {
		t.Fatalf("expected updated language id, got %q", language)
	}

	if setError := settingsRepository.Set(ctx, "theme", "dark"); setError != nil {
		t.Fatalf("failed to create new setting: %v", setError)
	}
	theme, themeError := settingsRepository.GetByKey(ctx, "theme")
	if themeError != nil {
		t.Fatalf("failed to read new setting: %v", themeError)
	}
	if theme != "dark" {
		t.Fatalf("expected theme dark, got %q", theme)
	}

	if _, missingError := settingsRepository.GetByKey(ctx, "missing"); !errors.Is(missingError, domain.ErrSettingNotFound) {
		t.Fatalf("expected ErrSettingNotFound, got %v", missingError)
	}
}

func TestSQLiteDataPersistsAcrossReopen(t *testing.T) {
	ctx := context.Background()
	databasePath := filepath.Join(t.TempDir(), "persistent.db")

	firstConnection, firstOpenError := sqliterepository.Open(ctx, databasePath)
	if firstOpenError != nil {
		t.Fatalf("failed to open first database connection: %v", firstOpenError)
	}

	firstItemRepository := sqliterepository.NewItemRepository(firstConnection)
	firstSettingsRepository := sqliterepository.NewSettingsRepository(firstConnection)

	createdItem, createError := firstItemRepository.Create(ctx, domain.Item{
		Name:         "Orthopedic Pillow",
		Price:        675000,
		PurchaseDate: "2026-09-22T00:00:00Z",
	})
	if createError != nil {
		t.Fatalf("failed to create persistent item: %v", createError)
	}
	if setError := firstSettingsRepository.Set(ctx, "currency", "IDR"); setError != nil {
		t.Fatalf("failed to update persistent setting: %v", setError)
	}

	if closeError := firstConnection.Close(); closeError != nil {
		t.Fatalf("failed to close first database connection: %v", closeError)
	}

	secondConnection, secondOpenError := sqliterepository.Open(ctx, databasePath)
	if secondOpenError != nil {
		t.Fatalf("failed to reopen database: %v", secondOpenError)
	}
	defer secondConnection.Close()

	secondItemRepository := sqliterepository.NewItemRepository(secondConnection)
	secondSettingsRepository := sqliterepository.NewSettingsRepository(secondConnection)

	persistedItem, getItemError := secondItemRepository.GetByID(ctx, createdItem.ID)
	if getItemError != nil {
		t.Fatalf("failed to read persisted item: %v", getItemError)
	}
	if persistedItem.Name != "Orthopedic Pillow" || persistedItem.Price != 675000 {
		t.Fatalf("unexpected persisted item: %+v", persistedItem)
	}

	persistedCurrency, getSettingError := secondSettingsRepository.GetByKey(ctx, "currency")
	if getSettingError != nil {
		t.Fatalf("failed to read persisted currency: %v", getSettingError)
	}
	if persistedCurrency != "IDR" {
		t.Fatalf("expected persisted currency IDR, got %q", persistedCurrency)
	}
}
