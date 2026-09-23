package sqlite

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	_ "modernc.org/sqlite"
)

const (
	busyTimeoutMilliseconds = 5000
	maxOpenConnections      = 4
)

//go:embed migrations/*.sql
var migrationFileSystem embed.FS

type migration struct {
	version int
	name    string
	sql     string
}

// Open creates a SQLite database connection, applies operational defaults, and runs pending migrations.
func Open(ctx context.Context, databasePath string) (*sql.DB, error) {
	trimmedDatabasePath := strings.TrimSpace(databasePath)
	if trimmedDatabasePath == "" {
		return nil, fmt.Errorf("database path is required")
	}

	absoluteDatabasePath, pathError := filepath.Abs(trimmedDatabasePath)
	if pathError != nil {
		return nil, fmt.Errorf("resolve database path: %w", pathError)
	}

	if directoryError := os.MkdirAll(filepath.Dir(absoluteDatabasePath), 0o755); directoryError != nil {
		return nil, fmt.Errorf("create database directory: %w", directoryError)
	}

	normalizedDatabasePath := filepath.ToSlash(absoluteDatabasePath)
	if !strings.HasPrefix(normalizedDatabasePath, "/") {
		normalizedDatabasePath = "/" + normalizedDatabasePath
	}

	databaseURL := &url.URL{
		Scheme: "file",
		Path:   normalizedDatabasePath,
	}
	queryValues := databaseURL.Query()
	queryValues.Set("_busy_timeout", strconv.Itoa(busyTimeoutMilliseconds))
	queryValues.Set("_foreign_keys", "1")
	databaseURL.RawQuery = queryValues.Encode()

	databaseConnection, openError := sql.Open("sqlite", databaseURL.String())
	if openError != nil {
		return nil, fmt.Errorf("open sqlite database: %w", openError)
	}

	databaseConnection.SetMaxOpenConns(maxOpenConnections)
	databaseConnection.SetMaxIdleConns(maxOpenConnections)

	if pingError := databaseConnection.PingContext(ctx); pingError != nil {
		_ = databaseConnection.Close()
		return nil, fmt.Errorf("ping sqlite database: %w", pingError)
	}

	if compatibilityError := verifySchemaCompatibility(ctx, databaseConnection); compatibilityError != nil {
		_ = databaseConnection.Close()
		return nil, compatibilityError
	}

	if walError := enableWALMode(ctx, databaseConnection); walError != nil {
		_ = databaseConnection.Close()
		return nil, walError
	}

	if verificationError := verifyOperationalDefaults(ctx, databaseConnection); verificationError != nil {
		_ = databaseConnection.Close()
		return nil, verificationError
	}

	if migrationError := ApplyMigrations(ctx, databaseConnection); migrationError != nil {
		_ = databaseConnection.Close()
		return nil, migrationError
	}

	return databaseConnection, nil
}

func verifySchemaCompatibility(ctx context.Context, databaseConnection *sql.DB) error {
	migrations, loadError := loadMigrations()
	if loadError != nil {
		return fmt.Errorf("load sqlite migrations: %w", loadError)
	}

	var currentVersion int
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA user_version").Scan(&currentVersion); scanError != nil {
		return fmt.Errorf("read sqlite schema version: %w", scanError)
	}

	latestVersion := migrations[len(migrations)-1].version
	if currentVersion > latestVersion {
		return fmt.Errorf("database schema version %d is newer than supported version %d", currentVersion, latestVersion)
	}

	return nil
}

func enableWALMode(ctx context.Context, databaseConnection *sql.DB) error {
	var journalMode string
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA journal_mode = WAL").Scan(&journalMode); scanError != nil {
		return fmt.Errorf("enable sqlite WAL mode: %w", scanError)
	}
	if !strings.EqualFold(journalMode, "wal") {
		return fmt.Errorf("sqlite WAL mode is not enabled")
	}
	return nil
}

func verifyOperationalDefaults(ctx context.Context, databaseConnection *sql.DB) error {
	var journalMode string
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA journal_mode").Scan(&journalMode); scanError != nil {
		return fmt.Errorf("read sqlite journal mode: %w", scanError)
	}
	if !strings.EqualFold(journalMode, "wal") {
		return fmt.Errorf("sqlite WAL mode is not enabled")
	}

	var foreignKeysEnabled int
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA foreign_keys").Scan(&foreignKeysEnabled); scanError != nil {
		return fmt.Errorf("read sqlite foreign key setting: %w", scanError)
	}
	if foreignKeysEnabled != 1 {
		return fmt.Errorf("sqlite foreign key enforcement is not enabled")
	}

	var configuredBusyTimeout int
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA busy_timeout").Scan(&configuredBusyTimeout); scanError != nil {
		return fmt.Errorf("read sqlite busy timeout: %w", scanError)
	}
	if configuredBusyTimeout < busyTimeoutMilliseconds {
		return fmt.Errorf("sqlite busy timeout is lower than required")
	}

	return nil
}

// ApplyMigrations applies embedded SQL migrations in version order.
//
// The current schema version is stored in SQLite's user_version header. Each
// migration runs in its own short transaction, including the user_version
// update, so a failed migration does not leave a partially advanced schema.
func ApplyMigrations(ctx context.Context, databaseConnection *sql.DB) error {
	migrations, loadError := loadMigrations()
	if loadError != nil {
		return fmt.Errorf("load sqlite migrations: %w", loadError)
	}

	var currentVersion int
	if scanError := databaseConnection.QueryRowContext(ctx, "PRAGMA user_version").Scan(&currentVersion); scanError != nil {
		return fmt.Errorf("read sqlite schema version: %w", scanError)
	}

	latestVersion := migrations[len(migrations)-1].version
	if currentVersion > latestVersion {
		return fmt.Errorf("database schema version %d is newer than supported version %d", currentVersion, latestVersion)
	}

	for _, pendingMigration := range migrations {
		if pendingMigration.version <= currentVersion {
			continue
		}

		if migrationError := applyMigration(ctx, databaseConnection, pendingMigration); migrationError != nil {
			return migrationError
		}
		currentVersion = pendingMigration.version
	}

	return nil
}

func loadMigrations() ([]migration, error) {
	migrationEntries, readDirectoryError := fs.ReadDir(migrationFileSystem, "migrations")
	if readDirectoryError != nil {
		return nil, readDirectoryError
	}

	migrations := make([]migration, 0, len(migrationEntries))
	seenVersions := make(map[int]string)

	for _, migrationEntry := range migrationEntries {
		if migrationEntry.IsDir() || !strings.HasSuffix(migrationEntry.Name(), ".sql") {
			continue
		}

		versionText, _, foundSeparator := strings.Cut(migrationEntry.Name(), "_")
		if !foundSeparator {
			return nil, fmt.Errorf("migration %q must start with a numeric version followed by underscore", migrationEntry.Name())
		}

		version, conversionError := strconv.Atoi(versionText)
		if conversionError != nil || version <= 0 {
			return nil, fmt.Errorf("migration %q has invalid version", migrationEntry.Name())
		}
		if duplicateName, duplicate := seenVersions[version]; duplicate {
			return nil, fmt.Errorf("migrations %q and %q share version %d", duplicateName, migrationEntry.Name(), version)
		}

		migrationSQL, readFileError := migrationFileSystem.ReadFile("migrations/" + migrationEntry.Name())
		if readFileError != nil {
			return nil, readFileError
		}

		seenVersions[version] = migrationEntry.Name()
		migrations = append(migrations, migration{
			version: version,
			name:    migrationEntry.Name(),
			sql:     string(migrationSQL),
		})
	}

	if len(migrations) == 0 {
		return nil, fmt.Errorf("no sqlite migrations found")
	}

	sort.Slice(migrations, func(firstIndex, secondIndex int) bool {
		return migrations[firstIndex].version < migrations[secondIndex].version
	})

	return migrations, nil
}

func applyMigration(ctx context.Context, databaseConnection *sql.DB, pendingMigration migration) error {
	transaction, beginError := databaseConnection.BeginTx(ctx, nil)
	if beginError != nil {
		return fmt.Errorf("begin migration %s: %w", pendingMigration.name, beginError)
	}

	if _, executionError := transaction.ExecContext(ctx, pendingMigration.sql); executionError != nil {
		_ = transaction.Rollback()
		return fmt.Errorf("apply migration %s: %w", pendingMigration.name, executionError)
	}

	setVersionStatement := fmt.Sprintf("PRAGMA user_version = %d", pendingMigration.version)
	if _, versionError := transaction.ExecContext(ctx, setVersionStatement); versionError != nil {
		_ = transaction.Rollback()
		return fmt.Errorf("record migration %s: %w", pendingMigration.name, versionError)
	}

	if commitError := transaction.Commit(); commitError != nil {
		return fmt.Errorf("commit migration %s: %w", pendingMigration.name, commitError)
	}

	return nil
}
