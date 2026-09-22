package service_test

import (
	"context"
	"testing"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestSettingsService(t *testing.T) {
	testContext := context.Background()

	t.Run("returns default settings on initial retrieval", func(subTest *testing.T) {
		settingsRepository := memory.NewMemorySettingsRepository()
		settingsService := service.NewSettingsService(settingsRepository)

		settingsMap, serviceError := settingsService.GetAllSettings(testContext)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		if settingsMap["language"] != "en" {
			subTest.Errorf("expected default language 'en', got: %s", settingsMap["language"])
		}
		if settingsMap["currency"] != "USD" {
			subTest.Errorf("expected default currency 'USD', got: %s", settingsMap["currency"])
		}
	})

	t.Run("successfully updates setting", func(subTest *testing.T) {
		settingsRepository := memory.NewMemorySettingsRepository()
		settingsService := service.NewSettingsService(settingsRepository)

		updateError := settingsService.UpdateSetting(testContext, "language", "id")
		if updateError != nil {
			subTest.Fatalf("expected no error, got: %v", updateError)
		}

		retrievedValue, getError := settingsService.GetSettingByKey(testContext, "language")
		if getError != nil {
			subTest.Fatalf("expected to get setting, got error: %v", getError)
		}
		if retrievedValue != "id" {
			subTest.Errorf("expected updated setting value 'id', got: %s", retrievedValue)
		}
	})

	t.Run("rejects empty setting key", func(subTest *testing.T) {
		settingsRepository := memory.NewMemorySettingsRepository()
		settingsService := service.NewSettingsService(settingsRepository)

		updateError := settingsService.UpdateSetting(testContext, "   ", "EUR")
		if updateError != domain.ErrEmptySettingKey {
			subTest.Errorf("expected ErrEmptySettingKey, got: %v", updateError)
		}
	})

	t.Run("rejects empty setting value", func(subTest *testing.T) {
		settingsRepository := memory.NewMemorySettingsRepository()
		settingsService := service.NewSettingsService(settingsRepository)

		updateError := settingsService.UpdateSetting(testContext, "currency", "   ")
		if updateError != domain.ErrEmptySettingValue {
			subTest.Errorf("expected ErrEmptySettingValue, got: %v", updateError)
		}
	})
}
