package sqlite

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

var defaultSettingValues = map[string]string{
	"language": "en",
	"currency": "USD",
}

type settingRecord struct {
	UserID    string `gorm:"column:user_id;primaryKey"`
	Key       string `gorm:"column:key;primaryKey"`
	Value     string `gorm:"column:value;not null"`
	UpdatedAt string `gorm:"column:updated_at;not null"`
}

func (settingRecord) TableName() string {
	return "settings"
}

// SettingsRepository implements repository.SettingsRepository using user-scoped GORM queries.
type SettingsRepository struct {
	database *gorm.DB
}

// NewSettingsRepository creates a GORM-backed settings repository.
func NewSettingsRepository(database *gorm.DB) repository.SettingsRepository {
	return &SettingsRepository{
		database: database,
	}
}

// GetAll returns only the current user's settings as a key-value map.
// Built-in defaults are returned when the user has not persisted an override yet.
func (repositoryInstance *SettingsRepository) GetAll(ctx context.Context, userID string) (map[string]string, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	var records []settingRecord
	result := repositoryInstance.database.WithContext(ctx).
		Select("key", "value").
		Where("user_id = ?", normalizedUserID).
		Order("key ASC").
		Find(&records)
	if result.Error != nil {
		return nil, fmt.Errorf("list settings: %w", result.Error)
	}

	settings := make(map[string]string, len(defaultSettingValues)+len(records))
	for settingKey, settingValue := range defaultSettingValues {
		settings[settingKey] = settingValue
	}
	for _, record := range records {
		settings[record.Key] = record.Value
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

	var record settingRecord
	result := repositoryInstance.database.WithContext(ctx).
		Select("value").
		Where("user_id = ? AND key = ?", normalizedUserID, settingKey).
		First(&record)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		if defaultValue, hasDefault := defaultSettingValues[settingKey]; hasDefault {
			return defaultValue, nil
		}
		return "", domain.ErrSettingNotFound
	}
	if result.Error != nil {
		return "", fmt.Errorf("get setting: %w", result.Error)
	}

	return record.Value, nil
}

// Set inserts or updates a setting only for the current user.
func (repositoryInstance *SettingsRepository) Set(ctx context.Context, userID string, settingKey string, settingValue string) error {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return identityError
	}

	record := settingRecord{
		UserID:    normalizedUserID,
		Key:       settingKey,
		Value:     settingValue,
		UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano),
	}
	result := repositoryInstance.database.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "key"}},
			DoUpdates: clause.AssignmentColumns([]string{"value", "updated_at"}),
		}).
		Create(&record)
	if result.Error != nil {
		return fmt.Errorf("set setting: %w", result.Error)
	}

	return nil
}
