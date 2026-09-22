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

var defaultSettingValues = map[string]string{
	"language": "en",
	"currency": "USD",
}

// SettingsRepository implements repository.SettingsRepository using user-scoped SQLite queries.
type SettingsRepository struct {
	databaseConnection *sql.DB
}

// NewSettingsRepository creates a SQLite-backed settings repository.
func NewSettingsRepository(databaseConnection *sql.DB) repository.SettingsRepository {
	return &SettingsRepository{
		databaseConnection: databaseConnection,
	}
}

// GetAll returns only the current user's settings as a key-value map.
// Built-in defaults are returned when the user has not persisted an override yet.
func (repositoryInstance *SettingsRepository) GetAll(ctx context.Context, userID string) (map[string]string, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	rows, queryError := repositoryInstance.databaseConnection.QueryContext(ctx, `
		SELECT key, value
		FROM settings
		WHERE user_id = ?
		ORDER BY key ASC
	`, normalizedUserID)
	if queryError != nil {
		return nil, fmt.Errorf("list settings: %w", queryError)
	}
	defer rows.Close()

	settings := make(map[string]string, len(defaultSettingValues))
	for settingKey, settingValue := range defaultSettingValues {
		settings[settingKey] = settingValue
	}

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

// GetByKey retrieves a single setting only for the current user.
// Built-in defaults are returned when the user has not persisted an override yet.
func (repositoryInstance *SettingsRepository) GetByKey(ctx context.Context, userID string, settingKey string) (string, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return "", identityError
	}

	var settingValue string
	scanError := repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		SELECT value
		FROM settings
		WHERE user_id = ? AND key = ?
	`, normalizedUserID, settingKey).Scan(&settingValue)
	if errors.Is(scanError, sql.ErrNoRows) {
		if defaultValue, hasDefault := defaultSettingValues[settingKey]; hasDefault {
			return defaultValue, nil
		}
		return "", domain.ErrSettingNotFound
	}
	if scanError != nil {
		return "", fmt.Errorf("get setting: %w", scanError)
	}

	return settingValue, nil
}

// Set inserts or updates a setting only for the current user.
func (repositoryInstance *SettingsRepository) Set(ctx context.Context, userID string, settingKey string, settingValue string) error {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return identityError
	}

	_, executionError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		INSERT INTO settings (user_id, key, value, updated_at)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(user_id, key) DO UPDATE SET
			value = excluded.value,
			updated_at = excluded.updated_at
	`,
		normalizedUserID,
		settingKey,
		settingValue,
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if executionError != nil {
		return fmt.Errorf("set setting: %w", executionError)
	}

	return nil
}
