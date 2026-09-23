package sqlite_test

import (
	"context"
	"errors"
	"testing"

	"cost-per-day/backend/internal/domain"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
)

func TestSQLitePlannedPurchaseConversionIsAtomic(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	ctx := context.Background()

	plannedRepository := sqliterepository.NewPlannedPurchaseRepository(databaseConnection)
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	conversionRepository := sqliterepository.NewPlannedPurchaseConversionRepository(databaseConnection)

	plan, createError := plannedRepository.Create(ctx, domain.LegacyUserID, domain.PlannedPurchase{
		Name:         "Camera",
		TargetPrice:  1000,
		CurrencyCode: "USD",
	})
	if createError != nil {
		t.Fatalf("create plan: %v", createError)
	}

	_, failedConversionError := conversionRepository.Convert(ctx, domain.LegacyUserID, plan.ID, domain.Item{
		Name:         "Camera",
		Price:        0,
		PurchaseDate: "2026-09-24T00:00:00Z",
		Status:       domain.ItemStatusActive,
	})
	if failedConversionError == nil {
		t.Fatal("expected item creation failure")
	}

	if _, getError := plannedRepository.GetByID(ctx, domain.LegacyUserID, plan.ID); getError != nil {
		t.Fatalf("expected plan to remain after failed conversion, got %v", getError)
	}
	itemsAfterFailure, listError := itemRepository.List(ctx, domain.LegacyUserID)
	if listError != nil {
		t.Fatalf("list items after failure: %v", listError)
	}
	if len(itemsAfterFailure) != 0 {
		t.Fatalf("expected no item after failed conversion, got %d", len(itemsAfterFailure))
	}

	createdItem, conversionError := conversionRepository.Convert(ctx, domain.LegacyUserID, plan.ID, domain.Item{
		Name:         "Camera",
		Price:        950,
		PurchaseDate: "2026-09-24T00:00:00Z",
		Status:       domain.ItemStatusActive,
	})
	if conversionError != nil {
		t.Fatalf("convert plan: %v", conversionError)
	}
	if createdItem.ID == "" {
		t.Fatal("expected converted item identifier")
	}
	if _, getError := plannedRepository.GetByID(ctx, domain.LegacyUserID, plan.ID); !errors.Is(getError, domain.ErrPlannedPurchaseNotFound) {
		t.Fatalf("expected plan to be deleted after successful conversion, got %v", getError)
	}
	itemsAfterSuccess, listError := itemRepository.List(ctx, domain.LegacyUserID)
	if listError != nil {
		t.Fatalf("list items after success: %v", listError)
	}
	if len(itemsAfterSuccess) != 1 || itemsAfterSuccess[0].ID != createdItem.ID {
		t.Fatalf("expected exactly the converted owned item, got %+v", itemsAfterSuccess)
	}
}
