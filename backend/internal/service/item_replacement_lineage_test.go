package service_test

import (
	"context"
	"errors"
	"testing"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func retireReplacementTestItem(
	t *testing.T,
	ctx context.Context,
	itemService service.ItemService,
	userID string,
	name string,
) domain.Item {
	t.Helper()

	item, createError := itemService.CreateItem(
		ctx,
		userID,
		name,
		100,
		"2026-09-01T12:00:00Z",
		nil,
		nil,
		nil,
		nil,
	)
	if createError != nil {
		t.Fatalf("create historical item: %v", createError)
	}

	endedAt := "2026-09-10T12:00:00Z"
	retiredItem, updateError := itemService.UpdateItem(
		ctx,
		userID,
		item.ID,
		item.Name,
		item.Price,
		item.PurchaseDate,
		domain.ItemStatusRetired,
		&endedAt,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
	if updateError != nil {
		t.Fatalf("retire historical item: %v", updateError)
	}

	return retiredItem
}

func updateReplacementTestLink(
	ctx context.Context,
	itemService service.ItemService,
	userID string,
	item domain.Item,
	replacesItemID *string,
) (domain.Item, error) {
	return itemService.UpdateItem(
		ctx,
		userID,
		item.ID,
		item.Name,
		item.Price,
		item.PurchaseDate,
		item.Status,
		item.EndedAt,
		item.SalePrice,
		item.Category,
		item.Brand,
		item.TargetType,
		item.TargetValue,
		replacesItemID,
	)
}

func TestItemServiceReplacementLineage(t *testing.T) {
	ctx := context.Background()

	t.Run("creates and clears explicit replacement lineage", func(t *testing.T) {
		itemService := service.NewItemService(memory.NewMemoryItemRepository())
		previousItem := retireReplacementTestItem(t, ctx, itemService, "user-a", "Previous Headphones")
		previousItemID := previousItem.ID

		createdItem, createError := itemService.CreateItem(
			ctx,
			"user-a",
			"New Headphones",
			200,
			"2026-09-11T12:00:00Z",
			nil,
			nil,
			nil,
			nil,
			&previousItemID,
		)
		if createError != nil {
			t.Fatalf("create replacement item: %v", createError)
		}
		if createdItem.ReplacesItemID == nil || *createdItem.ReplacesItemID != previousItem.ID {
			t.Fatalf("expected replacement link to %q, got %v", previousItem.ID, createdItem.ReplacesItemID)
		}

		preservedItem, preserveError := itemService.UpdateItem(
			ctx,
			"user-a",
			createdItem.ID,
			"Renamed Headphones",
			createdItem.Price,
			createdItem.PurchaseDate,
			createdItem.Status,
			createdItem.EndedAt,
			createdItem.SalePrice,
			createdItem.Category,
			createdItem.Brand,
			createdItem.TargetType,
			createdItem.TargetValue,
		)
		if preserveError != nil {
			t.Fatalf("update without replacement field: %v", preserveError)
		}
		if preservedItem.ReplacesItemID == nil || *preservedItem.ReplacesItemID != previousItem.ID {
			t.Fatalf("expected omitted replacement field to preserve %q, got %v", previousItem.ID, preservedItem.ReplacesItemID)
		}

		clearedItem, clearError := updateReplacementTestLink(ctx, itemService, "user-a", preservedItem, nil)
		if clearError != nil {
			t.Fatalf("clear replacement link: %v", clearError)
		}
		if clearedItem.ReplacesItemID != nil {
			t.Fatalf("expected cleared replacement link, got %v", clearedItem.ReplacesItemID)
		}
	})

	t.Run("requires completed historical item", func(t *testing.T) {
		itemService := service.NewItemService(memory.NewMemoryItemRepository())
		activeTarget, createTargetError := itemService.CreateItem(
			ctx,
			"user-a",
			"Active Headphones",
			100,
			"2026-09-01T12:00:00Z",
			nil,
			nil,
			nil,
			nil,
		)
		if createTargetError != nil {
			t.Fatalf("create active target: %v", createTargetError)
		}
		targetID := activeTarget.ID

		_, createError := itemService.CreateItem(
			ctx,
			"user-a",
			"Replacement",
			200,
			"2026-09-11T12:00:00Z",
			nil,
			nil,
			nil,
			nil,
			&targetID,
		)
		if !errors.Is(createError, domain.ErrReplacementItemNotCompleted) {
			t.Fatalf("expected ErrReplacementItemNotCompleted, got %v", createError)
		}
	})

	t.Run("rejects reactivating a referenced historical item", func(t *testing.T) {
		itemService := service.NewItemService(memory.NewMemoryItemRepository())
		previousItem := retireReplacementTestItem(t, ctx, itemService, "user-a", "Previous Headphones")
		previousItemID := previousItem.ID

		replacementItem, createError := itemService.CreateItem(
			ctx,
			"user-a",
			"New Headphones",
			200,
			"2026-09-11T12:00:00Z",
			nil,
			nil,
			nil,
			nil,
			&previousItemID,
		)
		if createError != nil {
			t.Fatalf("create replacement item: %v", createError)
		}

		_, reactivateError := itemService.UpdateItem(
			ctx,
			"user-a",
			previousItem.ID,
			previousItem.Name,
			previousItem.Price,
			previousItem.PurchaseDate,
			domain.ItemStatusActive,
			nil,
			nil,
			previousItem.Category,
			previousItem.Brand,
			previousItem.TargetType,
			previousItem.TargetValue,
		)
		if !errors.Is(reactivateError, domain.ErrReplacementTargetStillReferenced) {
			t.Fatalf("expected ErrReplacementTargetStillReferenced, got %v", reactivateError)
		}

		persistedReplacement, getError := itemService.GetItemByID(ctx, "user-a", replacementItem.ID)
		if getError != nil {
			t.Fatalf("get replacement item: %v", getError)
		}
		if persistedReplacement.ReplacesItemID == nil || *persistedReplacement.ReplacesItemID != previousItem.ID {
			t.Fatalf("expected replacement lineage to remain linked to %q, got %v", previousItem.ID, persistedReplacement.ReplacesItemID)
		}
	})

	t.Run("rejects self reference", func(t *testing.T) {
		itemService := service.NewItemService(memory.NewMemoryItemRepository())
		item, createError := itemService.CreateItem(
			ctx,
			"user-a",
			"Headphones",
			100,
			"2026-09-01T12:00:00Z",
			nil,
			nil,
			nil,
			nil,
		)
		if createError != nil {
			t.Fatalf("create item: %v", createError)
		}
		selfID := item.ID

		_, updateError := updateReplacementTestLink(ctx, itemService, "user-a", item, &selfID)
		if !errors.Is(updateError, domain.ErrReplacementSelfReference) {
			t.Fatalf("expected ErrReplacementSelfReference, got %v", updateError)
		}
	})

	t.Run("rejects replacement cycles", func(t *testing.T) {
		itemService := service.NewItemService(memory.NewMemoryItemRepository())
		itemA := retireReplacementTestItem(t, ctx, itemService, "user-a", "Generation A")
		itemB := retireReplacementTestItem(t, ctx, itemService, "user-a", "Generation B")

		itemBID := itemB.ID
		linkedA, firstLinkError := updateReplacementTestLink(ctx, itemService, "user-a", itemA, &itemBID)
		if firstLinkError != nil {
			t.Fatalf("link A to B: %v", firstLinkError)
		}

		itemAID := linkedA.ID
		_, cycleError := updateReplacementTestLink(ctx, itemService, "user-a", itemB, &itemAID)
		if !errors.Is(cycleError, domain.ErrReplacementCycle) {
			t.Fatalf("expected ErrReplacementCycle, got %v", cycleError)
		}
	})

	t.Run("cross user target is indistinguishable from missing item", func(t *testing.T) {
		itemService := service.NewItemService(memory.NewMemoryItemRepository())
		previousItem := retireReplacementTestItem(t, ctx, itemService, "user-a", "User A Headphones")
		previousItemID := previousItem.ID

		_, createError := itemService.CreateItem(
			ctx,
			"user-b",
			"User B Headphones",
			200,
			"2026-09-11T12:00:00Z",
			nil,
			nil,
			nil,
			nil,
			&previousItemID,
		)
		if !errors.Is(createError, domain.ErrItemNotFound) {
			t.Fatalf("expected cross-user replacement target to return ErrItemNotFound, got %v", createError)
		}
	})
}
