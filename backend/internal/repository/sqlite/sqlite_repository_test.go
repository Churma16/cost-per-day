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
	if schemaVersion != 5 {
		t.Fatalf("expected schema version 5, got %d", schemaVersion)
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

	var equivalentTableCount int
	if scanError := databaseConnection.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM sqlite_master
		WHERE type = 'table' AND name = 'value_equivalents'
	`).Scan(&equivalentTableCount); scanError != nil {
		t.Fatalf("failed to inspect value_equivalents table: %v", scanError)
	}
	if equivalentTableCount != 1 {
		t.Fatalf("expected value_equivalents table to exist exactly once, got %d", equivalentTableCount)
	}
}

func TestOpenRejectsDatabaseFromNewerSchemaBeforeChangingJournalMode(t *testing.T) {
	ctx := context.Background()
	databasePath := filepath.Join(t.TempDir(), "newer-schema.db")

	futureDatabase, openError := sql.Open("sqlite", databasePath)
	if openError != nil {
		t.Fatalf("failed to create newer-schema database: %v", openError)
	}
	if _, versionError := futureDatabase.ExecContext(ctx, "PRAGMA user_version = 99"); versionError != nil {
		t.Fatalf("failed to set newer schema version: %v", versionError)
	}

	var initialJournalMode string
	if scanError := futureDatabase.QueryRowContext(ctx, "PRAGMA journal_mode").Scan(&initialJournalMode); scanError != nil {
		t.Fatalf("failed to read initial journal mode: %v", scanError)
	}
	if closeError := futureDatabase.Close(); closeError != nil {
		t.Fatalf("failed to close newer-schema database: %v", closeError)
	}

	reopenedConnection, reopenError := sqliterepository.Open(ctx, databasePath)
	if reopenError == nil {
		_ = reopenedConnection.Close()
		t.Fatal("expected opening a newer schema to fail")
	}

	verificationDatabase, verificationError := sql.Open("sqlite", databasePath)
	if verificationError != nil {
		t.Fatalf("failed to reopen database for verification: %v", verificationError)
	}
	defer verificationDatabase.Close()

	var journalModeAfterRejectedOpen string
	if scanError := verificationDatabase.QueryRowContext(ctx, "PRAGMA journal_mode").Scan(&journalModeAfterRejectedOpen); scanError != nil {
		t.Fatalf("failed to read journal mode after rejected open: %v", scanError)
	}
	if journalModeAfterRejectedOpen != initialJournalMode {
		t.Fatalf("expected journal mode to remain %q, got %q", initialJournalMode, journalModeAfterRejectedOpen)
	}
}

func TestSQLiteItemRepositoryCRUD(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	ctx := context.Background()

	createdItem, createError := itemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:         "Laptop",
		Price:        1.23456789,
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
	if math.Abs(createdItem.Price-1.234568) > 0.0000001 {
		t.Fatalf("expected created price to be canonicalized to 1.234568, got %.9f", createdItem.Price)
	}

	fetchedItem, getError := itemRepository.GetByID(ctx, domain.LegacyUserID, createdItem.ID)
	if getError != nil {
		t.Fatalf("failed to get created item: %v", getError)
	}
	if fetchedItem.Name != "Laptop" {
		t.Fatalf("expected name Laptop, got %q", fetchedItem.Name)
	}
	if math.Abs(fetchedItem.Price-createdItem.Price) > 0.0000001 {
		t.Fatalf("expected fetched price %.6f to match create response, got %.9f", createdItem.Price, fetchedItem.Price)
	}

	var storedPriceMicros int64
	if scanError := databaseConnection.QueryRowContext(ctx, "SELECT price_micros FROM items WHERE id = ?", createdItem.ID).Scan(&storedPriceMicros); scanError != nil {
		t.Fatalf("failed to inspect stored price: %v", scanError)
	}
	if storedPriceMicros != 1234568 {
		t.Fatalf("expected fixed-point price 1234568 micros, got %d", storedPriceMicros)
	}

	secondItem, secondCreateError := itemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:         "Monitor",
		Price:        450.25,
		PurchaseDate: "2026-09-21T10:00:00Z",
	})
	if secondCreateError != nil {
		t.Fatalf("failed to create second item: %v", secondCreateError)
	}

	items, listError := itemRepository.List(ctx, domain.LegacyUserID)
	if listError != nil {
		t.Fatalf("failed to list items: %v", listError)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].ID != createdItem.ID || items[1].ID != secondItem.ID {
		t.Fatalf("expected deterministic ID order, got %q then %q", items[0].ID, items[1].ID)
	}

	updatedItem, updateError := itemRepository.Update(ctx, domain.LegacyUserID, domain.Item{
		ID:           createdItem.ID,
		Name:         "Laptop Pro",
		Price:        2.34567891,
		PurchaseDate: "2026-09-22T10:00:00Z",
	})
	if updateError != nil {
		t.Fatalf("failed to update item: %v", updateError)
	}
	if updatedItem.Name != "Laptop Pro" {
		t.Fatalf("expected updated name, got %q", updatedItem.Name)
	}
	if math.Abs(updatedItem.Price-2.345679) > 0.0000001 {
		t.Fatalf("expected updated price to be canonicalized to 2.345679, got %.9f", updatedItem.Price)
	}
	persistedUpdatedItem, getUpdatedError := itemRepository.GetByID(ctx, domain.LegacyUserID, createdItem.ID)
	if getUpdatedError != nil {
		t.Fatalf("failed to read updated item: %v", getUpdatedError)
	}
	if math.Abs(persistedUpdatedItem.Price-updatedItem.Price) > 0.0000001 {
		t.Fatalf("expected fetched updated price %.6f to match update response, got %.9f", updatedItem.Price, persistedUpdatedItem.Price)
	}
	if !updatedItem.CreatedAt.Equal(createdItem.CreatedAt) {
		t.Fatal("expected update to preserve creation timestamp")
	}

	if _, tinyPriceError := itemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:         "Too Small",
		Price:        0.0000004,
		PurchaseDate: "2026-09-22T10:00:00Z",
	}); tinyPriceError == nil {
		t.Fatal("expected price smaller than six-decimal storage precision to fail")
	}

	if _, boundaryPriceError := itemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:         "Boundary",
		Price:        9223372036854.7754,
		PurchaseDate: "2026-09-22T10:00:00Z",
	}); boundaryPriceError == nil {
		t.Fatal("expected price at int64 micro-unit boundary to fail")
	}

	if _, missingUpdateError := itemRepository.Update(ctx, domain.LegacyUserID, domain.Item{
		ID:           "999999",
		Name:         "Missing",
		Price:        1,
		PurchaseDate: "2026-09-22T10:00:00Z",
	}); !errors.Is(missingUpdateError, domain.ErrItemNotFound) {
		t.Fatalf("expected ErrItemNotFound for missing update, got %v", missingUpdateError)
	}

	if deleteError := itemRepository.Delete(ctx, domain.LegacyUserID, createdItem.ID); deleteError != nil {
		t.Fatalf("failed to delete item: %v", deleteError)
	}
	if _, missingGetError := itemRepository.GetByID(ctx, domain.LegacyUserID, createdItem.ID); !errors.Is(missingGetError, domain.ErrItemNotFound) {
		t.Fatalf("expected ErrItemNotFound after deletion, got %v", missingGetError)
	}
	if missingDeleteError := itemRepository.Delete(ctx, domain.LegacyUserID, createdItem.ID); !errors.Is(missingDeleteError, domain.ErrItemNotFound) {
		t.Fatalf("expected ErrItemNotFound for repeated delete, got %v", missingDeleteError)
	}
}

func TestSQLiteSettingsRepositoryReadAndUpdate(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	settingsRepository := sqliterepository.NewSettingsRepository(databaseConnection)
	ctx := context.Background()

	settings, getAllError := settingsRepository.GetAll(ctx, domain.LegacyUserID)
	if getAllError != nil {
		t.Fatalf("failed to read settings: %v", getAllError)
	}
	if settings["language"] != "en" {
		t.Fatalf("expected default language en, got %q", settings["language"])
	}
	if settings["currency"] != "USD" {
		t.Fatalf("expected default currency USD, got %q", settings["currency"])
	}

	if setError := settingsRepository.Set(ctx, domain.LegacyUserID, "language", "id"); setError != nil {
		t.Fatalf("failed to update language: %v", setError)
	}
	language, getError := settingsRepository.GetByKey(ctx, domain.LegacyUserID, "language")
	if getError != nil {
		t.Fatalf("failed to read updated language: %v", getError)
	}
	if language != "id" {
		t.Fatalf("expected updated language id, got %q", language)
	}

	if setError := settingsRepository.Set(ctx, domain.LegacyUserID, "theme", "dark"); setError != nil {
		t.Fatalf("failed to create new setting: %v", setError)
	}
	theme, themeError := settingsRepository.GetByKey(ctx, domain.LegacyUserID, "theme")
	if themeError != nil {
		t.Fatalf("failed to read new setting: %v", themeError)
	}
	if theme != "dark" {
		t.Fatalf("expected theme dark, got %q", theme)
	}

	if _, missingError := settingsRepository.GetByKey(ctx, domain.LegacyUserID, "missing"); !errors.Is(missingError, domain.ErrSettingNotFound) {
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

	createdItem, createError := firstItemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:         "Orthopedic Pillow",
		Price:        675000,
		PurchaseDate: "2026-09-22T00:00:00Z",
	})
	if createError != nil {
		t.Fatalf("failed to create persistent item: %v", createError)
	}
	if setError := firstSettingsRepository.Set(ctx, domain.LegacyUserID, "currency", "IDR"); setError != nil {
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

	persistedItem, getItemError := secondItemRepository.GetByID(ctx, domain.LegacyUserID, createdItem.ID)
	if getItemError != nil {
		t.Fatalf("failed to read persisted item: %v", getItemError)
	}
	if persistedItem.Name != "Orthopedic Pillow" || persistedItem.Price != 675000 {
		t.Fatalf("unexpected persisted item: %+v", persistedItem)
	}

	persistedCurrency, getSettingError := secondSettingsRepository.GetByKey(ctx, domain.LegacyUserID, "currency")
	if getSettingError != nil {
		t.Fatalf("failed to read persisted currency: %v", getSettingError)
	}
	if persistedCurrency != "IDR" {
		t.Fatalf("expected persisted currency IDR, got %q", persistedCurrency)
	}
}

func TestValueEquivalentRepositoryCRUDAndIsolation(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	ctx := context.Background()

	userRepository := sqliterepository.NewUserRepository(databaseConnection)
	firstUser, firstUserError := userRepository.FindOrCreateGoogleUser(ctx, domain.User{
		ID:          "user-first",
		GoogleSub:   "sub-first",
		Email:       "first@example.com",
		DisplayName: "First User",
	})
	if firstUserError != nil {
		t.Fatalf("create first user: %v", firstUserError)
	}

	secondUser, secondUserError := userRepository.FindOrCreateGoogleUser(ctx, domain.User{
		ID:          "user-second",
		GoogleSub:   "sub-second",
		Email:       "second@example.com",
		DisplayName: "Second User",
	})
	if secondUserError != nil {
		t.Fatalf("create second user: %v", secondUserError)
	}

	equivalentRepository := sqliterepository.NewValueEquivalentRepository(databaseConnection)

	createdEquivalent, createError := equivalentRepository.Create(ctx, firstUser.ID, domain.ValueEquivalent{
		Name:         "Gorengan",
		Amount:       2500,
		CurrencyCode: "IDR",
	})
	if createError != nil {
		t.Fatalf("failed to create equivalent: %v", createError)
	}
	if createdEquivalent.ID == "" {
		t.Fatal("expected non-empty created equivalent identifier")
	}
	if createdEquivalent.Name != "Gorengan" || createdEquivalent.Amount != 2500 || createdEquivalent.CurrencyCode != "IDR" {
		t.Fatalf("unexpected created equivalent: %+v", createdEquivalent)
	}

	// Isolation: second user cannot access first user's equivalent
	_, isolationGetError := equivalentRepository.GetByID(ctx, secondUser.ID, createdEquivalent.ID)
	if !errors.Is(isolationGetError, domain.ErrValueEquivalentNotFound) {
		t.Fatalf("expected ErrValueEquivalentNotFound for other user, got: %v", isolationGetError)
	}

	firstUserList, listError := equivalentRepository.List(ctx, firstUser.ID)
	if listError != nil {
		t.Fatalf("failed to list first user equivalents: %v", listError)
	}
	if len(firstUserList) != 1 {
		t.Fatalf("expected 1 equivalent for first user, got %d", len(firstUserList))
	}

	secondUserList, listError2 := equivalentRepository.List(ctx, secondUser.ID)
	if listError2 != nil {
		t.Fatalf("failed to list second user equivalents: %v", listError2)
	}
	if len(secondUserList) != 0 {
		t.Fatalf("expected 0 equivalents for second user, got %d", len(secondUserList))
	}

	// Update
	updatedEquivalent, updateError := equivalentRepository.Update(ctx, firstUser.ID, domain.ValueEquivalent{
		ID:           createdEquivalent.ID,
		Name:         "Gorengan Hangat",
		Amount:       3000,
		CurrencyCode: "IDR",
	})
	if updateError != nil {
		t.Fatalf("failed to update equivalent: %v", updateError)
	}
	if updatedEquivalent.Name != "Gorengan Hangat" || updatedEquivalent.Amount != 3000 {
		t.Fatalf("unexpected updated equivalent: %+v", updatedEquivalent)
	}

	// Delete
	deleteError := equivalentRepository.Delete(ctx, firstUser.ID, createdEquivalent.ID)
	if deleteError != nil {
		t.Fatalf("failed to delete equivalent: %v", deleteError)
	}

	_, afterDeleteGetError := equivalentRepository.GetByID(ctx, firstUser.ID, createdEquivalent.ID)
	if !errors.Is(afterDeleteGetError, domain.ErrValueEquivalentNotFound) {
		t.Fatalf("expected ErrValueEquivalentNotFound after delete, got: %v", afterDeleteGetError)
	}

	// Micro-precision normalization stability
	precisionEquivalent, precisionCreateError := equivalentRepository.Create(ctx, firstUser.ID, domain.ValueEquivalent{
		Name:         "Sub-Micro Benchmark",
		Amount:       2.5000008,
		CurrencyCode: "USD",
	})
	if precisionCreateError != nil {
		t.Fatalf("failed to create precision equivalent: %v", precisionCreateError)
	}
	if math.Abs(precisionEquivalent.Amount-2.500001) > 0.0000001 {
		t.Fatalf("expected created amount to be normalized to 2.500001, got %.9f", precisionEquivalent.Amount)
	}
	persistedPrecisionEquivalent, precisionGetError := equivalentRepository.GetByID(ctx, firstUser.ID, precisionEquivalent.ID)
	if precisionGetError != nil {
		t.Fatalf("failed to fetch precision equivalent: %v", precisionGetError)
	}
	if math.Abs(persistedPrecisionEquivalent.Amount-precisionEquivalent.Amount) > 0.0000001 {
		t.Fatalf("expected persisted amount %.9f to match created amount %.9f", persistedPrecisionEquivalent.Amount, precisionEquivalent.Amount)
	}
}

