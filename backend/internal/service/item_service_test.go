package service_test

import (
	"context"
	"testing"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestItemService_CreateItem(t *testing.T) {
	testContext := context.Background()

	t.Run("successfully creates item with valid inputs", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		createdItem, serviceError := itemService.CreateItem(
			testContext, domain.LegacyUserID,
			"Espresso Machine",
			599.99,
			"2026-09-20T12:00:00Z",
		)

		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}
		if createdItem.ID == "" {
			subTest.Errorf("expected non-empty item ID")
		}
		if createdItem.Name != "Espresso Machine" {
			subTest.Errorf("expected name 'Espresso Machine', got: %s", createdItem.Name)
		}
		if createdItem.Price != 599.99 {
			subTest.Errorf("expected price 599.99, got: %f", createdItem.Price)
		}
		if createdItem.PurchaseDate != "2026-09-20T12:00:00Z" {
			subTest.Errorf("expected purchaseDate '2026-09-20T12:00:00Z', got: %s", createdItem.PurchaseDate)
		}
	})

	t.Run("successfully creates item with date-only string", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		createdItem, serviceError := itemService.CreateItem(
			testContext, domain.LegacyUserID,
			"Mechanical Keyboard",
			149.50,
			"2026-09-15",
		)

		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}
		expectedFormattedDate := time.Date(2026, 9, 15, 0, 0, 0, 0, time.UTC).Format(time.RFC3339)
		if createdItem.PurchaseDate != expectedFormattedDate {
			subTest.Errorf("expected purchaseDate %s, got: %s", expectedFormattedDate, createdItem.PurchaseDate)
		}
	})

	t.Run("rejects empty name", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		_, serviceError := itemService.CreateItem(testContext, domain.LegacyUserID, "   ", 100.0, "2026-09-20T12:00:00Z")
		if serviceError != domain.ErrEmptyItemName {
			subTest.Errorf("expected ErrEmptyItemName, got: %v", serviceError)
		}
	})

	t.Run("rejects non-positive price", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		_, zeroPriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Book", 0.0, "2026-09-20T12:00:00Z")
		if zeroPriceError != domain.ErrInvalidItemPrice {
			subTest.Errorf("expected ErrInvalidItemPrice for zero price, got: %v", zeroPriceError)
		}

		_, negativePriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Book", -15.5, "2026-09-20T12:00:00Z")
		if negativePriceError != domain.ErrInvalidItemPrice {
			subTest.Errorf("expected ErrInvalidItemPrice for negative price, got: %v", negativePriceError)
		}
	})

	t.Run("rejects prices outside supported storage range", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		_, tinyPriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Tiny", 0.0000004, "2026-09-20T12:00:00Z")
		if tinyPriceError != domain.ErrUnsupportedItemPrice {
			subTest.Errorf("expected ErrUnsupportedItemPrice for sub-micro price, got: %v", tinyPriceError)
		}

		_, boundaryPriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Boundary", 9223372036854.7754, "2026-09-20T12:00:00Z")
		if boundaryPriceError != domain.ErrUnsupportedItemPrice {
			subTest.Errorf("expected ErrUnsupportedItemPrice at int64 boundary, got: %v", boundaryPriceError)
		}

		_, hugePriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Huge", 10000000000000.0, "2026-09-20T12:00:00Z")
		if hugePriceError != domain.ErrUnsupportedItemPrice {
			subTest.Errorf("expected ErrUnsupportedItemPrice for oversized price, got: %v", hugePriceError)
		}
	})

	t.Run("rejects invalid purchase date format", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		_, invalidDateError := itemService.CreateItem(testContext, domain.LegacyUserID, "Chair", 80.0, "not-a-valid-date")
		if invalidDateError != domain.ErrInvalidPurchaseDate {
			subTest.Errorf("expected ErrInvalidPurchaseDate, got: %v", invalidDateError)
		}
	})
}

func TestItemService_GetUpdateDelete(t *testing.T) {
	testContext := context.Background()
	itemRepository := memory.NewMemoryItemRepository()
	itemService := service.NewItemService(itemRepository)

	createdItem, serviceError := itemService.CreateItem(
		testContext, domain.LegacyUserID,
		"Smart Watch",
		299.00,
		"2026-09-01T08:00:00Z",
	)
	if serviceError != nil {
		t.Fatalf("failed to seed item: %v", serviceError)
	}

	t.Run("retrieves item by ID", func(subTest *testing.T) {
		foundItem, getError := itemService.GetItemByID(testContext, domain.LegacyUserID, createdItem.ID)
		if getError != nil {
			subTest.Fatalf("expected to find item, got error: %v", getError)
		}
		if foundItem.Name != "Smart Watch" {
			subTest.Errorf("expected 'Smart Watch', got: %s", foundItem.Name)
		}
	})

	t.Run("returns not found for non-existent ID", func(subTest *testing.T) {
		_, getError := itemService.GetItemByID(testContext, domain.LegacyUserID, "999999")
		if getError != domain.ErrItemNotFound {
			subTest.Errorf("expected ErrItemNotFound, got: %v", getError)
		}
	})

	t.Run("updates item successfully", func(subTest *testing.T) {
		updatedItem, updateError := itemService.UpdateItem(
			testContext, domain.LegacyUserID,
			createdItem.ID,
			"Smart Watch Series 2",
			349.00,
			"2026-09-02T08:00:00Z",
			domain.ItemStatusActive,
			nil,
			nil,
		)
		if updateError != nil {
			subTest.Fatalf("expected successful update, got: %v", updateError)
		}
		if updatedItem.Name != "Smart Watch Series 2" {
			subTest.Errorf("expected updated name, got: %s", updatedItem.Name)
		}
		if updatedItem.Price != 349.00 {
			subTest.Errorf("expected updated price, got: %f", updatedItem.Price)
		}
	})

	t.Run("deletes item successfully", func(subTest *testing.T) {
		deleteError := itemService.DeleteItem(testContext, domain.LegacyUserID, createdItem.ID)
		if deleteError != nil {
			subTest.Fatalf("expected successful delete, got: %v", deleteError)
		}

		_, getAfterDeleteError := itemService.GetItemByID(testContext, domain.LegacyUserID, createdItem.ID)
		if getAfterDeleteError != domain.ErrItemNotFound {
			subTest.Errorf("expected ErrItemNotFound after deletion, got: %v", getAfterDeleteError)
		}
	})

	t.Run("deleting non-existent item returns not found error", func(subTest *testing.T) {
		deleteError := itemService.DeleteItem(testContext, domain.LegacyUserID, "999999")
		if deleteError != domain.ErrItemNotFound {
			subTest.Errorf("expected ErrItemNotFound, got: %v", deleteError)
		}
	})
}
