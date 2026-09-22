package memory

import (
	"context"
	"sync"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// MemorySettingsRepository implements repository.SettingsRepository in memory.
type MemorySettingsRepository struct {
	mutex       sync.RWMutex
	settingsMap map[string]string
}

// NewMemorySettingsRepository creates a new thread-safe in-memory settings repository initialized with defaults.
func NewMemorySettingsRepository() repository.SettingsRepository {
	return &MemorySettingsRepository{
		settingsMap: map[string]string{
			"language": "en",
			"currency": "USD",
		},
	}
}

// GetAll returns a copy of all current settings key-value pairs.
func (repositoryInstance *MemorySettingsRepository) GetAll(_ context.Context) (map[string]string, error) {
	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	settingsCopy := make(map[string]string, len(repositoryInstance.settingsMap))
	for settingKey, settingValue := range repositoryInstance.settingsMap {
		settingsCopy[settingKey] = settingValue
	}

	return settingsCopy, nil
}

// GetByKey retrieves the value for a specific settings key.
func (repositoryInstance *MemorySettingsRepository) GetByKey(_ context.Context, settingKey string) (string, error) {
	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	settingValue, exists := repositoryInstance.settingsMap[settingKey]
	if !exists {
		return "", domain.ErrSettingNotFound
	}

	return settingValue, nil
}

// Set saves or updates a configuration setting value.
func (repositoryInstance *MemorySettingsRepository) Set(_ context.Context, settingKey string, settingValue string) error {
	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	repositoryInstance.settingsMap[settingKey] = settingValue
	return nil
}
