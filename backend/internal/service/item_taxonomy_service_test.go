package service_test

import (
	"context"
	"testing"

	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestItemService_CategoryAndBrandFindOrCreate(t *testing.T) {
	ctx := context.Background()
	itemRepo := memory.NewMemoryItemRepository()
	catRepo := memory.NewMemoryCategoryRepository()
	brandRepo := memory.NewMemoryBrandRepository()

	itemService := service.NewItemService(itemRepo, catRepo, brandRepo)
	userID := "user-123"

	catName := "TWS"
	brandName := "Sony"

	createdItem, err := itemService.CreateItem(
		ctx, userID,
		"WF-1000XM5",
		300.0,
		"2026-01-01T12:00:00Z",
		&catName,
		&brandName,
		nil,
		nil,
	)
	if err != nil {
		t.Fatalf("create item failed: %v", err)
	}

	if createdItem.CategoryID == nil || createdItem.Category == nil || *createdItem.Category != "TWS" {
		t.Fatalf("expected category TWS, got %v", createdItem.Category)
	}
	if createdItem.BrandID == nil || createdItem.Brand == nil || *createdItem.Brand != "Sony" {
		t.Fatalf("expected brand Sony, got %v", createdItem.Brand)
	}

	// Create second item with lowercase category and brand
	catNameLower := "  tws  "
	brandNameLower := "  sony  "
	secondItem, err := itemService.CreateItem(
		ctx, userID,
		"LinkBuds",
		180.0,
		"2026-02-01T12:00:00Z",
		&catNameLower,
		&brandNameLower,
		nil,
		nil,
	)
	if err != nil {
		t.Fatalf("create second item failed: %v", err)
	}

	if *secondItem.CategoryID != *createdItem.CategoryID {
		t.Fatalf("expected re-used category ID %d, got %d", *createdItem.CategoryID, *secondItem.CategoryID)
	}
	if *secondItem.BrandID != *createdItem.BrandID {
		t.Fatalf("expected re-used brand ID %d, got %d", *createdItem.BrandID, *secondItem.BrandID)
	}
}
