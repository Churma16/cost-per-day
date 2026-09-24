package service_test

import (
	"context"
	"errors"
	"testing"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

type failingCategoryRepository struct {
	memory.MemoryCategoryRepository
}

func (f *failingCategoryRepository) FindOrCreate(_ context.Context, _ string, _ string) (domain.Category, error) {
	return domain.Category{}, errors.New("database connection failed on category resolution")
}

type failingBrandRepository struct {
	memory.MemoryBrandRepository
}

func (f *failingBrandRepository) FindOrCreate(_ context.Context, _ string, _ string) (domain.Brand, error) {
	return domain.Brand{}, errors.New("database connection failed on brand resolution")
}

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

func TestItemService_TaxonomyPersistenceFailurePropagation(t *testing.T) {
	ctx := context.Background()
	userID := "user-tax-err"

	t.Run("CreateItem fails and does not persist item when category FindOrCreate fails", func(subTest *testing.T) {
		itemRepo := memory.NewMemoryItemRepository()
		catRepo := &failingCategoryRepository{}
		brandRepo := memory.NewMemoryBrandRepository()
		itemService := service.NewItemService(itemRepo, catRepo, brandRepo)

		catName := "Audio"
		_, err := itemService.CreateItem(ctx, userID, "Headphones", 100, "2026-01-01T12:00:00Z", &catName, nil, nil, nil)
		if err == nil {
			subTest.Fatalf("expected error from failing category repository, got nil")
		}

		items, _ := itemRepo.List(ctx, userID)
		if len(items) != 0 {
			subTest.Fatalf("expected 0 items persisted after category failure, got %d", len(items))
		}
	})

	t.Run("CreateItem fails and does not persist item when brand FindOrCreate fails", func(subTest *testing.T) {
		itemRepo := memory.NewMemoryItemRepository()
		catRepo := memory.NewMemoryCategoryRepository()
		brandRepo := &failingBrandRepository{}
		itemService := service.NewItemService(itemRepo, catRepo, brandRepo)

		brandName := "Sony"
		_, err := itemService.CreateItem(ctx, userID, "Headphones", 100, "2026-01-01T12:00:00Z", nil, &brandName, nil, nil)
		if err == nil {
			subTest.Fatalf("expected error from failing brand repository, got nil")
		}

		items, _ := itemRepo.List(ctx, userID)
		if len(items) != 0 {
			subTest.Fatalf("expected 0 items persisted after brand failure, got %d", len(items))
		}
	})

	t.Run("UpdateItem fails and leaves item untouched when category FindOrCreate fails", func(subTest *testing.T) {
		itemRepo := memory.NewMemoryItemRepository()
		catRepo := memory.NewMemoryCategoryRepository()
		brandRepo := memory.NewMemoryBrandRepository()
		itemService := service.NewItemService(itemRepo, catRepo, brandRepo)

		initialItem, err := itemService.CreateItem(ctx, userID, "Headphones", 100, "2026-01-01T12:00:00Z", nil, nil, nil, nil)
		if err != nil {
			subTest.Fatalf("setup create failed: %v", err)
		}

		// Switch to failing category repository
		failingService := service.NewItemService(itemRepo, &failingCategoryRepository{}, brandRepo)
		newCategory := "Audio"
		_, updateErr := failingService.UpdateItem(ctx, userID, initialItem.ID, "Headphones", 100, "2026-01-01T12:00:00Z", domain.ItemStatusActive, nil, nil, &newCategory, nil, nil, nil)
		if updateErr == nil {
			subTest.Fatalf("expected error from failing category repository on update, got nil")
		}

		fetched, _ := itemRepo.GetByID(ctx, userID, initialItem.ID)
		if fetched.Category != nil {
			subTest.Fatalf("expected item category to remain nil after failed update, got %v", fetched.Category)
		}
	})

	t.Run("ReplaceItems fails and does not replace items when taxonomy resolution fails", func(subTest *testing.T) {
		itemRepo := memory.NewMemoryItemRepository()
		catRepo := &failingCategoryRepository{}
		brandRepo := memory.NewMemoryBrandRepository()
		itemService := service.NewItemService(itemRepo, catRepo, brandRepo)

		catName := "Audio"
		itemsToReplace := []domain.Item{
			{
				Name:         "Headphones",
				Price:        100,
				PurchaseDate: "2026-01-01T12:00:00Z",
				Category:     &catName,
			},
		}

		_, replaceErr := itemService.ReplaceItems(ctx, userID, itemsToReplace)
		if replaceErr == nil {
			subTest.Fatalf("expected error from ReplaceItems when category resolution fails, got nil")
		}

		items, _ := itemRepo.List(ctx, userID)
		if len(items) != 0 {
			subTest.Fatalf("expected 0 items in repository after ReplaceItems failed, got %d", len(items))
		}
	})
}
