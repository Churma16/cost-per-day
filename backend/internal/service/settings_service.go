package service

import (
	"context"
	"strings"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// SettingsService defines the application operations available for user-owned configuration settings.
type SettingsService interface {
	GetAllSettings(ctx context.Context, userID string) (map[string]string, error)
	GetSettingByKey(ctx context.Context, userID string, settingKey string) (string, error)
	UpdateSetting(ctx context.Context, userID string, settingKey string, settingValue string) (domain.Setting, error)
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

// GetAllSettings retrieves all settings for the current user.
func (serviceInstance *settingsServiceImpl) GetAllSettings(ctx context.Context, userID string) (map[string]string, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return nil, identityError
	}
	return serviceInstance.settingsRepository.GetAll(ctx, normalizedUserID)
}

// GetSettingByKey retrieves one setting for the current user.
func (serviceInstance *settingsServiceImpl) GetSettingByKey(ctx context.Context, userID string, settingKey string) (string, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return "", identityError
	}

	trimmedKey := strings.TrimSpace(settingKey)
	if trimmedKey == "" {
		return "", domain.ErrEmptySettingKey
	}
	return serviceInstance.settingsRepository.GetByKey(ctx, normalizedUserID, trimmedKey)
}

// UpdateSetting validates and stores an updated setting value for the current user.
func (serviceInstance *settingsServiceImpl) UpdateSetting(ctx context.Context, userID string, settingKey string, settingValue string) (domain.Setting, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.Setting{}, identityError
	}

	trimmedKey := strings.TrimSpace(settingKey)
	if trimmedKey == "" {
		return domain.Setting{}, domain.ErrEmptySettingKey
	}

	trimmedValue := strings.TrimSpace(settingValue)
	if trimmedValue == "" {
		return domain.Setting{}, domain.ErrEmptySettingValue
	}

	if repositoryError := serviceInstance.settingsRepository.Set(ctx, normalizedUserID, trimmedKey, trimmedValue); repositoryError != nil {
		return domain.Setting{}, repositoryError
	}

	return domain.Setting{
		UserID: normalizedUserID,
		Key:    trimmedKey,
		Value:  trimmedValue,
	}, nil
}

func normalizeUserID(userID string) (string, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return "", domain.ErrUserIdentityRequired
	}
	return normalizedUserID, nil
}
