package service

import (
	"context"
	"strings"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// SettingsService defines the application operations available for configuration settings.
type SettingsService interface {
	GetAllSettings(ctx context.Context) (map[string]string, error)
	GetSettingByKey(ctx context.Context, settingKey string) (string, error)
	UpdateSetting(ctx context.Context, settingKey string, settingValue string) (domain.Setting, error)
}

type settingsServiceImpl struct {
	settingsRepository repository.SettingsRepository
}

// NewSettingsService creates a new SettingsService instance backed by a SettingsRepository.
func NewSettingsService(settingsRepository repository.SettingsRepository) SettingsService {
	return &settingsServiceImpl{
		settingsRepository: settingsRepository,
	}
}

// GetAllSettings retrieves all current application settings.
func (serviceInstance *settingsServiceImpl) GetAllSettings(ctx context.Context) (map[string]string, error) {
	return serviceInstance.settingsRepository.GetAll(ctx)
}

// GetSettingByKey retrieves a single setting value by its configuration key.
func (serviceInstance *settingsServiceImpl) GetSettingByKey(ctx context.Context, settingKey string) (string, error) {
	trimmedKey := strings.TrimSpace(settingKey)
	if trimmedKey == "" {
		return "", domain.ErrEmptySettingKey
	}
	return serviceInstance.settingsRepository.GetByKey(ctx, trimmedKey)
}

// UpdateSetting validates and stores an updated setting value.
func (serviceInstance *settingsServiceImpl) UpdateSetting(ctx context.Context, settingKey string, settingValue string) (domain.Setting, error) {
	trimmedKey := strings.TrimSpace(settingKey)
	if trimmedKey == "" {
		return domain.Setting{}, domain.ErrEmptySettingKey
	}

	trimmedValue := strings.TrimSpace(settingValue)
	if trimmedValue == "" {
		return domain.Setting{}, domain.ErrEmptySettingValue
	}

	if repositoryError := serviceInstance.settingsRepository.Set(ctx, trimmedKey, trimmedValue); repositoryError != nil {
		return domain.Setting{}, repositoryError
	}

	return domain.Setting{
		Key:   trimmedKey,
		Value: trimmedValue,
	}, nil
}
