package sqlite

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
)

func TestApplyMigrationRollsBackSchemaAndVersionOnFailure(t *testing.T) {
	ctx := context.Background()
	databasePath := filepath.Join(t.TempDir(), "migration-rollback.db")

	databaseConnection, openError := Open(ctx, databasePath)
	if openError != nil {
		t.Fatalf("failed to open test database: %v", openError)
	}
	defer databaseConnection.Close()

	failingMigration := migration{
		version: 12,
		name:    "0012_failure.sql",
		sql: `
			CREATE TABLE migration_rollback_probe (id INTEGER PRIMARY KEY);
			INSERT INTO table_that_does_not_exist (id) VALUES (1);
		`,
	}

	if migrationError := applyMigration(ctx, databaseConnection, failingMigration); migrationError == nil {
		t.Fatal("expected failing migration to return an error")
	}

	var probeTableCount int
	if scanError := databaseConnection.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM sqlite_master
		WHERE type = 'table' AND name = 'migration_rollback_probe'
	`).Scan(&probeTableCount); scanError != nil {
		t.Fatalf("failed to inspect rollback probe table: %v", scanError)
	}
	if probeTableCount != 0 {
		t.Fatalf("expected migration-created table to be rolled back, got count %d", probeTableCount)
	}

	var schemaVersion int
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA user_version").Scan(&schemaVersion); scanError != nil {
		t.Fatalf("failed to read schema version: %v", scanError)
	}
	if schemaVersion != 11 {
		t.Fatalf("expected schema version to remain 11 after failed migration, got %d", schemaVersion)
	}
}

func TestExistingUserOnboardingMigrationRequiresPersistedPreferences(t *testing.T) {
	ctx := context.Background()
	databasePath := filepath.Join(t.TempDir(), "onboarding-migration.db")
	databaseConnection, openError := sql.Open("sqlite", databasePath)
	if openError != nil {
		t.Fatalf("open migration test database: %v", openError)
	}
	defer databaseConnection.Close()

	migrations, loadError := loadMigrations()
	if loadError != nil {
		t.Fatalf("load migrations: %v", loadError)
	}
	for _, candidate := range migrations {
		if candidate.version >= 11 {
			break
		}
		if migrationError := applyMigration(ctx, databaseConnection, candidate); migrationError != nil {
			t.Fatalf("apply prerequisite migration %d: %v", candidate.version, migrationError)
		}
	}

	if _, insertError := databaseConnection.ExecContext(ctx, `
		INSERT INTO users (id, created_at, updated_at)
		VALUES ('unconfigured-user', '2026-09-28T00:00:00Z', '2026-09-28T00:00:00Z')
	`); insertError != nil {
		t.Fatalf("insert unconfigured user: %v", insertError)
	}

	var onboardingMigration migration
	for _, candidate := range migrations {
		if candidate.version == 11 {
			onboardingMigration = candidate
			break
		}
	}
	if onboardingMigration.version == 0 {
		t.Fatal("onboarding migration was not found")
	}
	if migrationError := applyMigration(ctx, databaseConnection, onboardingMigration); migrationError != nil {
		t.Fatalf("apply onboarding migration: %v", migrationError)
	}

	var configuredCompletion string
	if scanError := databaseConnection.QueryRowContext(ctx, `
		SELECT value FROM settings
		WHERE user_id = 'legacy' AND key = 'onboardingCompleted'
	`).Scan(&configuredCompletion); scanError != nil {
		t.Fatalf("read configured user completion: %v", scanError)
	}
	if configuredCompletion != "true" {
		t.Fatalf("expected configured user to be complete, got %q", configuredCompletion)
	}

	var unconfiguredCompletionCount int
	if scanError := databaseConnection.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM settings
		WHERE user_id = 'unconfigured-user' AND key = 'onboardingCompleted'
	`).Scan(&unconfiguredCompletionCount); scanError != nil {
		t.Fatalf("count unconfigured user completion markers: %v", scanError)
	}
	if unconfiguredCompletionCount != 0 {
		t.Fatalf("expected unconfigured user to remain incomplete, got %d markers", unconfiguredCompletionCount)
	}
}
