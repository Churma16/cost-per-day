package memory

import (
	"context"
	"sync"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// MemorySettingsRepository implements repository.SettingsRepository in memory.
type MemorySettingsRepository struct {
	mutex            sync.RWMutex
	settingsByUserID map[string]map[string]string
}

// NewMemorySettingsRepository creates a new thread-safe in-memory settings repository.
func NewMemorySettingsRepository() repository.SettingsRepository {
	return &MemorySettingsRepository{
		settingsByUserID: make(map[string]map[string]string),
	}
}

// GetAll returns a copy of only the current user's settings.
func (repositoryInstance *MemorySettingsRepository) GetAll(_ context.Context, userID string) (map[string]string, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	userSettings := repositoryInstance.ensureDefaultsLocked(normalizedUserID)
	settingsCopy := make(map[string]string, len(userSettings))
	for settingKey, settingValue := range userSettings {
		settingsCopy[settingKey] = settingValue
	}

	return settingsCopy, nil
}

// GetByKey retrieves one setting only for the current user.
func (repositoryInstance *MemorySettingsRepository) GetByKey(_ context.Context, userID string, settingKey string) (string, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return "", identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	settingValue, exists := repositoryInstance.ensureDefaultsLocked(normalizedUserID)[settingKey]
	if !exists {
		return "", domain.ErrSettingNotFound
	}

	return settingValue, nil
}

// Set saves or updates a configuration setting only for the current user.
func (repositoryInstance *MemorySettingsRepository) Set(_ context.Context, userID string, settingKey string, settingValue string) error {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	repositoryInstance.ensureDefaultsLocked(normalizedUserID)[settingKey] = settingValue
	return nil
}

func (repositoryInstance *MemorySettingsRepository) ensureDefaultsLocked(userID string) map[string]string {
	userSettings := repositoryInstance.settingsByUserID[userID]
	if userSettings == nil {
		userSettings = map[string]string{
			"language": "en",
			"currency": "USD",
		}
		repositoryInstance.settingsByUserID[userID] = userSettings
	}
	return userSettings
}
