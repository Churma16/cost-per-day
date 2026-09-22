package sqlite

import (
	"context"
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
		version: 3,
		name:    "0002_failure.sql",
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
	if schemaVersion != 2 {
		t.Fatalf("expected schema version to remain 2 after failed migration, got %d", schemaVersion)
	}
}
