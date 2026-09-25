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

func TestItemService_TaxonomyResolutionSharedAcrossWriteFlows(t *testing.T) {
	ctx := context.Background()
	itemRepo := memory.NewMemoryItemRepository()
	catRepo := memory.NewMemoryCategoryRepository()
	brandRepo := memory.NewMemoryBrandRepository()
	itemService := service.NewItemService(itemRepo, catRepo, brandRepo)

	const userID = "user-taxonomy-shared"

	categoryName := "Audio"
	brandName := "Sony"
	createdItem, createError := itemService.CreateItem(
		ctx,
		userID,
		"Headphones",
		300,
		"2026-01-01T12:00:00Z",
		&categoryName,
		&brandName,
		nil,
		nil,
	)
	if createError != nil {
		t.Fatalf("create item: %v", createError)
	}
	if createdItem.CategoryID == nil || createdItem.BrandID == nil {
		t.Fatalf("expected canonical taxonomy IDs, got category=%v brand=%v", createdItem.CategoryID, createdItem.BrandID)
	}

	canonicalCategoryID := *createdItem.CategoryID
	canonicalBrandID := *createdItem.BrandID

	updatedCategory := "  audio  "
	updatedBrand := "  sony  "
	updatedItem, updateError := itemService.UpdateItem(
		ctx,
		userID,
		createdItem.ID,
		createdItem.Name,
		createdItem.Price,
		createdItem.PurchaseDate,
		domain.ItemStatusActive,
		nil,
		nil,
		&updatedCategory,
		&updatedBrand,
		nil,
		nil,
	)
	if updateError != nil {
		t.Fatalf("update item: %v", updateError)
	}
	if updatedItem.CategoryID == nil || *updatedItem.CategoryID != canonicalCategoryID {
		t.Fatalf("expected update to reuse category ID %d, got %v", canonicalCategoryID, updatedItem.CategoryID)
	}
	if updatedItem.BrandID == nil || *updatedItem.BrandID != canonicalBrandID {
		t.Fatalf("expected update to reuse brand ID %d, got %v", canonicalBrandID, updatedItem.BrandID)
	}
	if updatedItem.Category == nil || *updatedItem.Category != "Audio" {
		t.Fatalf("expected canonical category name Audio after update, got %v", updatedItem.Category)
	}
	if updatedItem.Brand == nil || *updatedItem.Brand != "Sony" {
		t.Fatalf("expected canonical brand name Sony after update, got %v", updatedItem.Brand)
	}

	replacementCategory := " AUDIO "
	replacementBrand := " SONY "
	replacedItems, replaceError := itemService.ReplaceItems(ctx, userID, []domain.Item{
		{
			Name:         "Replacement Headphones",
			Price:        250,
			PurchaseDate: "2026-02-01T12:00:00Z",
			Category:     &replacementCategory,
			Brand:        &replacementBrand,
		},
	})
	if replaceError != nil {
		t.Fatalf("replace items: %v", replaceError)
	}
	if len(replacedItems) != 1 {
		t.Fatalf("expected one replacement item, got %d", len(replacedItems))
	}
	replacedItem := replacedItems[0]
	if replacedItem.CategoryID == nil || *replacedItem.CategoryID != canonicalCategoryID {
		t.Fatalf("expected replace to reuse category ID %d, got %v", canonicalCategoryID, replacedItem.CategoryID)
	}
	if replacedItem.BrandID == nil || *replacedItem.BrandID != canonicalBrandID {
		t.Fatalf("expected replace to reuse brand ID %d, got %v", canonicalBrandID, replacedItem.BrandID)
	}
	if replacedItem.Category == nil || *replacedItem.Category != "Audio" {
		t.Fatalf("expected canonical category name Audio after replace, got %v", replacedItem.Category)
	}
	if replacedItem.Brand == nil || *replacedItem.Brand != "Sony" {
		t.Fatalf("expected canonical brand name Sony after replace, got %v", replacedItem.Brand)
	}

	otherUserCategory := "Audio"
	otherUserBrand := "Sony"
	otherUserItem, otherUserError := itemService.CreateItem(
		ctx,
		"other-user",
		"Other Headphones",
		200,
		"2026-03-01T12:00:00Z",
		&otherUserCategory,
		&otherUserBrand,
		nil,
		nil,
	)
	if otherUserError != nil {
		t.Fatalf("create item for other user: %v", otherUserError)
	}
	if otherUserItem.CategoryID == nil || *otherUserItem.CategoryID == canonicalCategoryID {
		t.Fatalf("expected category resolution to remain user-scoped, got %v", otherUserItem.CategoryID)
	}
	if otherUserItem.BrandID == nil || *otherUserItem.BrandID == canonicalBrandID {
		t.Fatalf("expected brand resolution to remain user-scoped, got %v", otherUserItem.BrandID)
	}

	blankCategory := "   "
	blankBrand := "   "
	staleCategoryID := int64(999)
	staleBrandID := int64(999)
	blankItems, blankError := itemService.ReplaceItems(ctx, userID, []domain.Item{
		{
			Name:         "Uncategorized Item",
			Price:        100,
			PurchaseDate: "2026-04-01T12:00:00Z",
			CategoryID:   &staleCategoryID,
			Category:     &blankCategory,
			BrandID:      &staleBrandID,
			Brand:        &blankBrand,
		},
	})
	if blankError != nil {
		t.Fatalf("replace item with blank taxonomy: %v", blankError)
	}
	if len(blankItems) != 1 {
		t.Fatalf("expected one item after blank taxonomy replace, got %d", len(blankItems))
	}
	if blankItems[0].CategoryID != nil || blankItems[0].Category != nil {
		t.Fatalf("expected blank category to clear category fields, got ID=%v name=%v", blankItems[0].CategoryID, blankItems[0].Category)
	}
	if blankItems[0].BrandID != nil || blankItems[0].Brand != nil {
		t.Fatalf("expected blank brand to clear brand fields, got ID=%v name=%v", blankItems[0].BrandID, blankItems[0].Brand)
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
