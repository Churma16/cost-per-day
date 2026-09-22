package service_test

import (
	"context"
	"testing"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestItemServiceReplaceItemsRejectsInvalidSetWithoutChangingData(t *testing.T) {
	ctx := context.Background()
	itemRepository := memory.NewMemoryItemRepository()
	itemService := service.NewItemService(itemRepository)

	originalItem, createError := itemService.CreateItem(
		ctx,
		"Original",
		100,
		"2026-09-20T12:00:00Z",
	)
	if createError != nil {
		t.Fatalf("failed to seed original item: %v", createError)
	}

	_, replaceError := itemService.ReplaceItems(ctx, []domain.Item{
		{
			Name:         "Valid",
			Price:        200,
			PurchaseDate: "2026-09-21T12:00:00Z",
		},
		{
			Name:         "Invalid",
			Price:        0,
			PurchaseDate: "2026-09-22T12:00:00Z",
		},
	})
	if replaceError != domain.ErrInvalidItemPrice {
		t.Fatalf("expected ErrInvalidItemPrice, got: %v", replaceError)
	}

	storedItems, listError := itemService.ListItems(ctx)
	if listError != nil {
		t.Fatalf("failed to list items: %v", listError)
	}
	if len(storedItems) != 1 || storedItems[0].ID != originalItem.ID {
		t.Fatalf("expected original data to remain unchanged, got %+v", storedItems)
	}
}
