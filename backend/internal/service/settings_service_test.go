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

		settingsMap, serviceError := settingsService.GetAllSettings(testContext, domain.LegacyUserID)
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

		updatedSetting, updateError := settingsService.UpdateSetting(testContext, domain.LegacyUserID, " language ", " id ")
		if updateError != nil {
			subTest.Fatalf("expected no error, got: %v", updateError)
		}
		if updatedSetting.Key != "language" {
			subTest.Errorf("expected normalized key 'language', got: %s", updatedSetting.Key)
		}
		if updatedSetting.Value != "id" {
			subTest.Errorf("expected normalized value 'id', got: %s", updatedSetting.Value)
		}

		retrievedValue, getError := settingsService.GetSettingByKey(testContext, domain.LegacyUserID, "language")
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

		_, updateError := settingsService.UpdateSetting(testContext, domain.LegacyUserID, "   ", "EUR")
		if updateError != domain.ErrEmptySettingKey {
			subTest.Errorf("expected ErrEmptySettingKey, got: %v", updateError)
		}
	})

	t.Run("rejects empty setting value", func(subTest *testing.T) {
		settingsRepository := memory.NewMemorySettingsRepository()
		settingsService := service.NewSettingsService(settingsRepository)

		_, updateError := settingsService.UpdateSetting(testContext, domain.LegacyUserID, "currency", "   ")
		if updateError != domain.ErrEmptySettingValue {
			subTest.Errorf("expected ErrEmptySettingValue, got: %v", updateError)
		}
	})
}
