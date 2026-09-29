package sqlite_test

import (
	"context"
	"testing"

	"cost-per-day/backend/internal/domain"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
)

func TestSQLiteItemRepositoryReplacementLineagePersistenceAndDeleteBehavior(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	itemRepository := sqliterepository.NewItemRepository(newTestGORM(t, databaseConnection))
	ctx := context.Background()

	endedAt := "2026-09-10T12:00:00Z"
	historicalItem, historicalCreateError := itemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:         "Previous Headphones",
		Price:        100,
		PurchaseDate: "2026-09-01T12:00:00Z",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAt,
	})
	if historicalCreateError != nil {
		t.Fatalf("create historical item: %v", historicalCreateError)
	}

	historicalItemID := historicalItem.ID
	replacementItem, replacementCreateError := itemRepository.Create(ctx, domain.LegacyUserID, domain.Item{
		Name:           "New Headphones",
		Price:          200,
		PurchaseDate:   "2026-09-11T12:00:00Z",
		Status:         domain.ItemStatusActive,
		ReplacesItemID: &historicalItemID,
	})
	if replacementCreateError != nil {
		t.Fatalf("create replacement item: %v", replacementCreateError)
	}

	fetchedItem, fetchError := itemRepository.GetByID(ctx, domain.LegacyUserID, replacementItem.ID)
	if fetchError != nil {
		t.Fatalf("fetch replacement item: %v", fetchError)
	}
	if fetchedItem.ReplacesItemID == nil || *fetchedItem.ReplacesItemID != historicalItem.ID {
		t.Fatalf("expected persisted replacement link to %q, got %v", historicalItem.ID, fetchedItem.ReplacesItemID)
	}

	fetchedItem.ReplacesItemID = nil
	clearedItem, clearError := itemRepository.Update(ctx, domain.LegacyUserID, fetchedItem)
	if clearError != nil {
		t.Fatalf("clear replacement link: %v", clearError)
	}
	if clearedItem.ReplacesItemID != nil {
		t.Fatalf("expected update response to clear replacement link, got %v", clearedItem.ReplacesItemID)
	}

	fetchedAfterClear, refetchError := itemRepository.GetByID(ctx, domain.LegacyUserID, replacementItem.ID)
	if refetchError != nil {
		t.Fatalf("refetch cleared replacement item: %v", refetchError)
	}
	if fetchedAfterClear.ReplacesItemID != nil {
		t.Fatalf("expected persisted replacement link to be cleared, got %v", fetchedAfterClear.ReplacesItemID)
	}

	fetchedAfterClear.ReplacesItemID = &historicalItemID
	if _, restoreError := itemRepository.Update(ctx, domain.LegacyUserID, fetchedAfterClear); restoreError != nil {
		t.Fatalf("restore replacement link: %v", restoreError)
	}

	if deleteError := itemRepository.Delete(ctx, domain.LegacyUserID, historicalItem.ID); deleteError != nil {
		t.Fatalf("delete historical item: %v", deleteError)
	}

	fetchedAfterDelete, fetchAfterDeleteError := itemRepository.GetByID(ctx, domain.LegacyUserID, replacementItem.ID)
	if fetchAfterDeleteError != nil {
		t.Fatalf("fetch replacement after historical delete: %v", fetchAfterDeleteError)
	}
	if fetchedAfterDelete.ReplacesItemID != nil {
		t.Fatalf("expected ON DELETE SET NULL to clear replacement link, got %v", fetchedAfterDelete.ReplacesItemID)
	}
}
