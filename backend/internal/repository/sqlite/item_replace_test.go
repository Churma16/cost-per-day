package sqlite_test

import (
	"context"
	"testing"

	"cost-per-day/backend/internal/domain"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
)

func TestItemRepositoryReplaceAllRollsBackOnMidReplacementFailure(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	ctx := context.Background()

	originalItem, createError := itemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:         "Original",
		Price:        100,
		PurchaseDate: "2026-09-20T12:00:00Z",
	})
	if createError != nil {
		t.Fatalf("failed to seed original item: %v", createError)
	}

	_, replaceError := itemRepository.ReplaceAll(ctx, domain.LegacyUserID, []domain.Item{
		{
			Name:         "Valid replacement",
			Price:        200,
			PurchaseDate: "2026-09-21T12:00:00Z",
		},
		{
			Name:         "Invalid replacement",
			Price:        0,
			PurchaseDate: "2026-09-22T12:00:00Z",
		},
	})
	if replaceError == nil {
		t.Fatal("expected replacement to fail")
	}

	storedItems, listError := itemRepository.List(ctx, domain.LegacyUserID)
	if listError != nil {
		t.Fatalf("failed to list items after rollback: %v", listError)
	}
	if len(storedItems) != 1 {
		t.Fatalf("expected exactly one original item after rollback, got %d", len(storedItems))
	}
	if storedItems[0].ID != originalItem.ID || storedItems[0].Name != originalItem.Name {
		t.Fatalf("expected original item to remain unchanged, got %+v", storedItems[0])
	}
}

func TestItemRepositoryReplaceAllCommitsCompleteReplacement(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	ctx := context.Background()

	if _, createError := itemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:         "Original",
		Price:        100,
		PurchaseDate: "2026-09-20T12:00:00Z",
	}); createError != nil {
		t.Fatalf("failed to seed original item: %v", createError)
	}

	replacedItems, replaceError := itemRepository.ReplaceAll(ctx, domain.LegacyUserID, []domain.Item{
		{
			Name:         "First",
			Price:        200,
			PurchaseDate: "2026-09-21T12:00:00Z",
		},
		{
			Name:         "Second",
			Price:        300,
			PurchaseDate: "2026-09-22T12:00:00Z",
		},
	})
	if replaceError != nil {
		t.Fatalf("expected replacement to succeed, got: %v", replaceError)
	}
	if len(replacedItems) != 2 {
		t.Fatalf("expected two replacement items, got %d", len(replacedItems))
	}

	storedItems, listError := itemRepository.List(ctx, domain.LegacyUserID)
	if listError != nil {
		t.Fatalf("failed to list replacement items: %v", listError)
	}
	if len(storedItems) != 2 {
		t.Fatalf("expected two stored replacement items, got %d", len(storedItems))
	}
	if storedItems[0].Name != "First" || storedItems[1].Name != "Second" {
		t.Fatalf("unexpected replacement items: %+v", storedItems)
	}
}
