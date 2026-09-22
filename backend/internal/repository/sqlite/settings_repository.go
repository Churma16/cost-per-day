package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// SettingsRepository implements repository.SettingsRepository using explicit SQLite queries.
type SettingsRepository struct {
	databaseConnection *sql.DB
}

// NewSettingsRepository creates a SQLite-backed settings repository.
func NewSettingsRepository(databaseConnection *sql.DB) repository.SettingsRepository {
	return &SettingsRepository{
		databaseConnection: databaseConnection,
	}
}

// GetAll returns all settings as a key-value map.
func (repositoryInstance *SettingsRepository) GetAll(ctx context.Context) (map[string]string, error) {
	rows, queryError := repositoryInstance.databaseConnection.QueryContext(ctx, `
		SELECT key, value
		FROM settings
		ORDER BY key ASC
	`)
	if queryError != nil {
		return nil, fmt.Errorf("list settings: %w", queryError)
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var settingKey string
		var settingValue string
		if scanError := rows.Scan(&settingKey, &settingValue); scanError != nil {
			return nil, fmt.Errorf("scan setting: %w", scanError)
		}
		settings[settingKey] = settingValue
	}

	if rowsError := rows.Err(); rowsError != nil {
		return nil, fmt.Errorf("iterate settings: %w", rowsError)
	}

	return settings, nil
}

// GetByKey retrieves a single setting value.
func (repositoryInstance *SettingsRepository) GetByKey(ctx context.Context, settingKey string) (string, error) {
	var settingValue string
	scanError := repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		SELECT value
		FROM settings
		WHERE key = ?
	`, settingKey).Scan(&settingValue)
	if errors.Is(scanError, sql.ErrNoRows) {
		return "", domain.ErrSettingNotFound
	}
	if scanError != nil {
		return "", fmt.Errorf("get setting: %w", scanError)
	}

	return settingValue, nil
}

// Set inserts or updates a setting value.
func (repositoryInstance *SettingsRepository) Set(ctx context.Context, settingKey string, settingValue string) error {
	_, executionError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		INSERT INTO settings (key, value, updated_at)
		VALUES (?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET
			value = excluded.value,
			updated_at = excluded.updated_at
	`,
		settingKey,
		settingValue,
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if executionError != nil {
		return fmt.Errorf("set setting: %w", executionError)
	}

	return nil
}
