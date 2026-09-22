package service_test

import (
	"context"
	"errors"
	"testing"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestServicesEnforceUserIsolation(t *testing.T) {
	ctx := context.Background()
	itemService := service.NewItemService(memory.NewMemoryItemRepository())
	settingsService := service.NewSettingsService(memory.NewMemorySettingsRepository())

	const userA = "user-a"
	const userB = "user-b"

	itemA, createAError := itemService.CreateItem(ctx, userA, "User A Laptop", 1200, "2026-09-01T12:00:00Z")
	if createAError != nil {
		t.Fatalf("create user A item: %v", createAError)
	}
	itemB, createBError := itemService.CreateItem(ctx, userB, "User B Phone", 600, "2026-09-02T12:00:00Z")
	if createBError != nil {
		t.Fatalf("create user B item: %v", createBError)
	}

	itemsA, listAError := itemService.ListItems(ctx, userA)
	if listAError != nil {
		t.Fatalf("list user A items: %v", listAError)
	}
	if len(itemsA) != 1 || itemsA[0].ID != itemA.ID {
		t.Fatalf("expected only user A item, got %+v", itemsA)
	}

	itemsB, listBError := itemService.ListItems(ctx, userB)
	if listBError != nil {
		t.Fatalf("list user B items: %v", listBError)
	}
	if len(itemsB) != 1 || itemsB[0].ID != itemB.ID {
		t.Fatalf("expected only user B item, got %+v", itemsB)
	}

	if _, getError := itemService.GetItemByID(ctx, userB, itemA.ID); !errors.Is(getError, domain.ErrItemNotFound) {
		t.Fatalf("expected cross-user get to return ErrItemNotFound, got %v", getError)
	}

	if _, updateError := itemService.UpdateItem(
		ctx,
		userB,
		itemA.ID,
		"Tampered",
		1200,
		"2026-09-01T12:00:00Z",
		domain.ItemStatusActive,
		nil,
		nil,
	); !errors.Is(updateError, domain.ErrItemNotFound) {
		t.Fatalf("expected cross-user update to return ErrItemNotFound, got %v", updateError)
	}

	if deleteError := itemService.DeleteItem(ctx, userB, itemA.ID); !errors.Is(deleteError, domain.ErrItemNotFound) {
		t.Fatalf("expected cross-user delete to return ErrItemNotFound, got %v", deleteError)
	}

	preservedItemA, getAError := itemService.GetItemByID(ctx, userA, itemA.ID)
	if getAError != nil {
		t.Fatalf("user A item should remain after cross-user attempts: %v", getAError)
	}
	if preservedItemA.Name != "User A Laptop" {
		t.Fatalf("user A item was modified across ownership boundary: %+v", preservedItemA)
	}

	if _, replaceError := itemService.ReplaceItems(ctx, userB, []domain.Item{{
		Name:         "User B Replacement",
		Price:        300,
		PurchaseDate: "2026-09-03T12:00:00Z",
	}}); replaceError != nil {
		t.Fatalf("replace user B items: %v", replaceError)
	}
	if _, getAAfterReplaceError := itemService.GetItemByID(ctx, userA, itemA.ID); getAAfterReplaceError != nil {
		t.Fatalf("replacing user B items should not affect user A: %v", getAAfterReplaceError)
	}

	if _, updateSettingError := settingsService.UpdateSetting(ctx, userA, "language", "id"); updateSettingError != nil {
		t.Fatalf("update user A language: %v", updateSettingError)
	}
	userALanguage, userASettingError := settingsService.GetSettingByKey(ctx, userA, "language")
	if userASettingError != nil || userALanguage != "id" {
		t.Fatalf("expected user A language id, got %q error %v", userALanguage, userASettingError)
	}
	userBLanguage, userBSettingError := settingsService.GetSettingByKey(ctx, userB, "language")
	if userBSettingError != nil || userBLanguage != "en" {
		t.Fatalf("expected user B default language en, got %q error %v", userBLanguage, userBSettingError)
	}

	if _, identityError := itemService.ListItems(ctx, "   "); !errors.Is(identityError, domain.ErrUserIdentityRequired) {
		t.Fatalf("expected missing item identity to fail, got %v", identityError)
	}
	if _, identityError := settingsService.GetAllSettings(ctx, ""); !errors.Is(identityError, domain.ErrUserIdentityRequired) {
		t.Fatalf("expected missing settings identity to fail, got %v", identityError)
	}
}
