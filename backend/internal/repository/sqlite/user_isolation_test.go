package sqlite_test

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"cost-per-day/backend/internal/domain"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
)

func seedSQLiteUser(t *testing.T, databaseConnection *sql.DB, userID string) {
	t.Helper()

	timestamp := time.Now().UTC().Format(time.RFC3339Nano)
	if _, insertError := databaseConnection.ExecContext(context.Background(), `
		INSERT INTO users (id, created_at, updated_at)
		VALUES (?, ?, ?)
	`, userID, timestamp, timestamp); insertError != nil {
		t.Fatalf("seed user %q: %v", userID, insertError)
	}
}


func TestSQLiteSettingsRepositoryReturnsDefaultsForFreshUser(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	ctx := context.Background()
	settingsRepository := sqliterepository.NewSettingsRepository(databaseConnection)

	const freshUser = "fresh-user"
	seedSQLiteUser(t, databaseConnection, freshUser)

	settings, getAllError := settingsRepository.GetAll(ctx, freshUser)
	if getAllError != nil {
		t.Fatalf("get fresh-user settings: %v", getAllError)
	}
	if settings["language"] != "en" {
		t.Fatalf("expected default language en, got %q", settings["language"])
	}
	if settings["currency"] != "USD" {
		t.Fatalf("expected default currency USD, got %q", settings["currency"])
	}

	language, languageError := settingsRepository.GetByKey(ctx, freshUser, "language")
	if languageError != nil {
		t.Fatalf("get fresh-user language: %v", languageError)
	}
	if language != "en" {
		t.Fatalf("expected default language en, got %q", language)
	}

	if _, missingError := settingsRepository.GetByKey(ctx, freshUser, "theme"); !errors.Is(missingError, domain.ErrSettingNotFound) {
		t.Fatalf("expected non-default missing setting to return ErrSettingNotFound, got %v", missingError)
	}
}

func TestSQLiteRepositoriesEnforceUserIsolation(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	ctx := context.Background()
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	settingsRepository := sqliterepository.NewSettingsRepository(databaseConnection)

	const userA = "user-a"
	const userB = "user-b"
	seedSQLiteUser(t, databaseConnection, userA)
	seedSQLiteUser(t, databaseConnection, userB)

	itemA, createAError := itemRepository.Create(ctx, userA, domain.Item{
		Name:         "User A Laptop",
		Price:        1200,
		PurchaseDate: "2026-09-01T12:00:00Z",
	})
	if createAError != nil {
		t.Fatalf("create user A item: %v", createAError)
	}
	itemB, createBError := itemRepository.Create(ctx, userB, domain.Item{
		Name:         "User B Phone",
		Price:        600,
		PurchaseDate: "2026-09-02T12:00:00Z",
	})
	if createBError != nil {
		t.Fatalf("create user B item: %v", createBError)
	}

	itemsA, listAError := itemRepository.List(ctx, userA)
	if listAError != nil {
		t.Fatalf("list user A items: %v", listAError)
	}
	if len(itemsA) != 1 || itemsA[0].ID != itemA.ID || itemsA[0].UserID != userA {
		t.Fatalf("expected only user A item, got %+v", itemsA)
	}

	itemsB, listBError := itemRepository.List(ctx, userB)
	if listBError != nil {
		t.Fatalf("list user B items: %v", listBError)
	}
	if len(itemsB) != 1 || itemsB[0].ID != itemB.ID || itemsB[0].UserID != userB {
		t.Fatalf("expected only user B item, got %+v", itemsB)
	}

	if _, getError := itemRepository.GetByID(ctx, userB, itemA.ID); !errors.Is(getError, domain.ErrItemNotFound) {
		t.Fatalf("expected cross-user detail to return ErrItemNotFound, got %v", getError)
	}
	if _, updateError := itemRepository.Update(ctx, userB, domain.Item{
		ID:           itemA.ID,
		Name:         "Tampered",
		Price:        1200,
		PurchaseDate: "2026-09-01T12:00:00Z",
	}); !errors.Is(updateError, domain.ErrItemNotFound) {
		t.Fatalf("expected cross-user update to return ErrItemNotFound, got %v", updateError)
	}
	if deleteError := itemRepository.Delete(ctx, userB, itemA.ID); !errors.Is(deleteError, domain.ErrItemNotFound) {
		t.Fatalf("expected cross-user delete to return ErrItemNotFound, got %v", deleteError)
	}

	if _, replaceError := itemRepository.ReplaceAll(ctx, userB, []domain.Item{{
		Name:         "User B Replacement",
		Price:        300,
		PurchaseDate: "2026-09-03T12:00:00Z",
	}}); replaceError != nil {
		t.Fatalf("replace user B items: %v", replaceError)
	}
	if _, getAError := itemRepository.GetByID(ctx, userA, itemA.ID); getAError != nil {
		t.Fatalf("user A item should survive user B replacement: %v", getAError)
	}

	if setError := settingsRepository.Set(ctx, userA, "language", "id"); setError != nil {
		t.Fatalf("set user A language: %v", setError)
	}
	if setError := settingsRepository.Set(ctx, userB, "language", "fr"); setError != nil {
		t.Fatalf("set user B language: %v", setError)
	}
	if setError := settingsRepository.Set(ctx, userA, "theme", "dark"); setError != nil {
		t.Fatalf("set user A private setting: %v", setError)
	}

	userALanguage, userALanguageError := settingsRepository.GetByKey(ctx, userA, "language")
	if userALanguageError != nil || userALanguage != "id" {
		t.Fatalf("expected user A language id, got %q error %v", userALanguage, userALanguageError)
	}
	userBLanguage, userBLanguageError := settingsRepository.GetByKey(ctx, userB, "language")
	if userBLanguageError != nil || userBLanguage != "fr" {
		t.Fatalf("expected user B language fr, got %q error %v", userBLanguage, userBLanguageError)
	}
	if _, privateSettingError := settingsRepository.GetByKey(ctx, userB, "theme"); !errors.Is(privateSettingError, domain.ErrSettingNotFound) {
		t.Fatalf("expected user B not to see user A setting, got %v", privateSettingError)
	}

	for _, indexName := range []string{"idx_items_user_id_id", "idx_settings_user_id_key"} {
		var indexCount int
		if scanError := databaseConnection.QueryRowContext(ctx, `
			SELECT COUNT(*)
			FROM sqlite_master
			WHERE type = 'index' AND name = ?
		`, indexName).Scan(&indexCount); scanError != nil {
			t.Fatalf("inspect index %q: %v", indexName, scanError)
		}
		if indexCount != 1 {
			t.Fatalf("expected index %q to exist exactly once, got %d", indexName, indexCount)
		}
	}
}

func TestUserOwnershipMigrationPreservesLegacyData(t *testing.T) {
	ctx := context.Background()
	databasePath := filepath.Join(t.TempDir(), "legacy-v2.db")

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
			updated_at TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'active'
				CHECK (status IN ('active', 'retired', 'sold', 'lost')),
			ended_at TEXT,
			sale_price_micros INTEGER
				CHECK (sale_price_micros IS NULL OR sale_price_micros >= 0)
		);
		CREATE TABLE settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		PRAGMA user_version = 2;
	`
	if _, schemaError := legacyDatabase.ExecContext(ctx, legacySchema); schemaError != nil {
		t.Fatalf("create legacy v2 schema: %v", schemaError)
	}

	timestamp := "2026-09-01T12:00:00Z"
	if _, insertError := legacyDatabase.ExecContext(ctx, `
		INSERT INTO items (
			id, name, price_micros, purchase_date, created_at, updated_at,
			status, ended_at, sale_price_micros
		)
		VALUES (7, 'Legacy Laptop', 1200000000, '2026-09-01T12:00:00Z', ?, ?, 'active', NULL, NULL);
	`, timestamp, timestamp); insertError != nil {
		t.Fatalf("insert legacy item: %v", insertError)
	}
	if _, insertError := legacyDatabase.ExecContext(ctx, `
		INSERT INTO settings (key, value, updated_at)
		VALUES ('language', 'id', ?), ('currency', 'IDR', ?)
	`, timestamp, timestamp); insertError != nil {
		t.Fatalf("insert legacy settings: %v", insertError)
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
	if schemaVersion != 3 {
		t.Fatalf("expected schema version 3, got %d", schemaVersion)
	}

	var legacyUserCount int
	if scanError := migratedDatabase.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE id = ?", domain.LegacyUserID).Scan(&legacyUserCount); scanError != nil {
		t.Fatalf("read legacy user: %v", scanError)
	}
	if legacyUserCount != 1 {
		t.Fatalf("expected deterministic legacy user, got count %d", legacyUserCount)
	}

	itemRepository := sqliterepository.NewItemRepository(migratedDatabase)
	legacyItem, itemError := itemRepository.GetByID(ctx, domain.LegacyUserID, "7")
	if itemError != nil {
		t.Fatalf("read migrated legacy item: %v", itemError)
	}
	if legacyItem.Name != "Legacy Laptop" || legacyItem.UserID != domain.LegacyUserID {
		t.Fatalf("legacy item was not preserved under legacy owner: %+v", legacyItem)
	}

	settingsRepository := sqliterepository.NewSettingsRepository(migratedDatabase)
	language, languageError := settingsRepository.GetByKey(ctx, domain.LegacyUserID, "language")
	if languageError != nil || language != "id" {
		t.Fatalf("expected migrated language id, got %q error %v", language, languageError)
	}
	currency, currencyError := settingsRepository.GetByKey(ctx, domain.LegacyUserID, "currency")
	if currencyError != nil || currency != "IDR" {
		t.Fatalf("expected migrated currency IDR, got %q error %v", currency, currencyError)
	}
}
