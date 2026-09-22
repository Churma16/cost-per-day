package service_test

import (
	"context"
	"math"
	"testing"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestItemLifecycleCalculationsAndValidation(t *testing.T) {
	ctx := context.Background()

	t.Run("completed lifecycle freezes gross cost per day", func(t *testing.T) {
		itemService := service.NewItemService(memory.NewMemoryItemRepository())
		createdItem, createError := itemService.CreateItem(
			ctx,
			"Laptop",
			100,
			"2026-09-01T12:00:00Z",
		)
		if createError != nil {
			t.Fatalf("create item: %v", createError)
		}

		endedAt := "2026-09-11T12:00:00Z"
		retiredItem, updateError := itemService.UpdateItem(
			ctx,
			createdItem.ID,
			createdItem.Name,
			createdItem.Price,
			createdItem.PurchaseDate,
			domain.ItemStatusRetired,
			&endedAt,
			nil,
		)
		if updateError != nil {
			t.Fatalf("retire item: %v", updateError)
		}

		if retiredItem.Status != domain.ItemStatusRetired {
			t.Fatalf("expected retired status, got %q", retiredItem.Status)
		}
		if retiredItem.OwnershipDays != 10 {
			t.Fatalf("expected 10 ownership days, got %d", retiredItem.OwnershipDays)
		}
		if math.Abs(retiredItem.GrossCostPerDay-10) > 0.0000001 {
			t.Fatalf("expected final gross cost/day 10, got %f", retiredItem.GrossCostPerDay)
		}

		listedItems, listError := itemService.ListItems(ctx)
		if listError != nil {
			t.Fatalf("list items: %v", listError)
		}
		if len(listedItems) != 1 {
			t.Fatalf("expected one historical item, got %d", len(listedItems))
		}
		if listedItems[0].GrossCostPerDay != retiredItem.GrossCostPerDay {
			t.Fatalf("expected final gross cost/day to remain frozen, got %f then %f", retiredItem.GrossCostPerDay, listedItems[0].GrossCostPerDay)
		}
	})

	t.Run("sold items expose net ownership cost and net cost per day", func(t *testing.T) {
		itemService := service.NewItemService(memory.NewMemoryItemRepository())
		createdItem, createError := itemService.CreateItem(
			ctx,
			"Phone",
			100,
			"2026-09-01T12:00:00Z",
		)
		if createError != nil {
			t.Fatalf("create item: %v", createError)
		}

		endedAt := "2026-09-11T12:00:00Z"
		salePrice := 40.0
		soldItem, updateError := itemService.UpdateItem(
			ctx,
			createdItem.ID,
			createdItem.Name,
			createdItem.Price,
			createdItem.PurchaseDate,
			domain.ItemStatusSold,
			&endedAt,
			&salePrice,
		)
		if updateError != nil {
			t.Fatalf("sell item: %v", updateError)
		}

		if soldItem.NetOwnershipCost == nil || math.Abs(*soldItem.NetOwnershipCost-60) > 0.0000001 {
			t.Fatalf("expected net ownership cost 60, got %v", soldItem.NetOwnershipCost)
		}
		if soldItem.NetCostPerDay == nil || math.Abs(*soldItem.NetCostPerDay-6) > 0.0000001 {
			t.Fatalf("expected net cost/day 6, got %v", soldItem.NetCostPerDay)
		}
	})

	t.Run("reactivating clears stale lifecycle fields", func(t *testing.T) {
		itemService := service.NewItemService(memory.NewMemoryItemRepository())
		createdItem, createError := itemService.CreateItem(ctx, "Camera", 120, "2026-09-01T12:00:00Z")
		if createError != nil {
			t.Fatalf("create item: %v", createError)
		}

		endedAt := "2026-09-05T12:00:00Z"
		salePrice := 20.0
		_, sellError := itemService.UpdateItem(
			ctx,
			createdItem.ID,
			createdItem.Name,
			createdItem.Price,
			createdItem.PurchaseDate,
			domain.ItemStatusSold,
			&endedAt,
			&salePrice,
		)
		if sellError != nil {
			t.Fatalf("sell item: %v", sellError)
		}

		reactivatedItem, reactivateError := itemService.UpdateItem(
			ctx,
			createdItem.ID,
			createdItem.Name,
			createdItem.Price,
			createdItem.PurchaseDate,
			domain.ItemStatusActive,
			&endedAt,
			&salePrice,
		)
		if reactivateError != nil {
			t.Fatalf("reactivate item: %v", reactivateError)
		}

		if reactivatedItem.EndedAt != nil || reactivatedItem.SalePrice != nil {
			t.Fatalf("expected active lifecycle fields to be cleared, got endedAt=%v salePrice=%v", reactivatedItem.EndedAt, reactivatedItem.SalePrice)
		}
		if reactivatedItem.NetOwnershipCost != nil || reactivatedItem.NetCostPerDay != nil {
			t.Fatalf("expected active item to have no sold-only derived metrics")
		}
	})

	t.Run("rejects invalid lifecycle facts", func(t *testing.T) {
		testCases := []struct {
			name      string
			status    domain.ItemStatus
			endedAt   *string
			salePrice *float64
			expected  error
		}{
			{
				name:     "unknown status",
				status:   domain.ItemStatus("donated"),
				expected: domain.ErrInvalidItemStatus,
			},
			{
				name:     "retired without end date",
				status:   domain.ItemStatusRetired,
				expected: domain.ErrMissingItemEndDate,
			},
			{
				name:   "end date before purchase",
				status: domain.ItemStatusLost,
				endedAt: func() *string {
					value := "2026-08-31T12:00:00Z"
					return &value
				}(),
				expected: domain.ErrItemEndBeforePurchase,
			},
			{
				name:   "invalid end date",
				status: domain.ItemStatusLost,
				endedAt: func() *string {
					value := "not-a-date"
					return &value
				}(),
				expected: domain.ErrInvalidItemEndDate,
			},
			{
				name:   "end date in future",
				status: domain.ItemStatusRetired,
				endedAt: func() *string {
					value := "2999-01-01T12:00:00Z"
					return &value
				}(),
				expected: domain.ErrItemEndInFuture,
			},
			{
				name:   "sold without sale price",
				status: domain.ItemStatusSold,
				endedAt: func() *string {
					value := "2026-09-02T12:00:00Z"
					return &value
				}(),
				expected: domain.ErrInvalidSalePrice,
			},
			{
				name:   "sold with negative sale price",
				status: domain.ItemStatusSold,
				endedAt: func() *string {
					value := "2026-09-02T12:00:00Z"
					return &value
				}(),
				salePrice: func() *float64 {
					value := -1.0
					return &value
				}(),
				expected: domain.ErrInvalidSalePrice,
			},
			{
				name:   "retired with sale price",
				status: domain.ItemStatusRetired,
				endedAt: func() *string {
					value := "2026-09-02T12:00:00Z"
					return &value
				}(),
				salePrice: func() *float64 {
					value := 10.0
					return &value
				}(),
				expected: domain.ErrUnexpectedSalePrice,
			},
		}

		for _, testCase := range testCases {
			t.Run(testCase.name, func(t *testing.T) {
				itemService := service.NewItemService(memory.NewMemoryItemRepository())
				createdItem, createError := itemService.CreateItem(ctx, "Item", 100, "2026-09-01T12:00:00Z")
				if createError != nil {
					t.Fatalf("create item: %v", createError)
				}

				_, updateError := itemService.UpdateItem(
					ctx,
					createdItem.ID,
					createdItem.Name,
					createdItem.Price,
					createdItem.PurchaseDate,
					testCase.status,
					testCase.endedAt,
					testCase.salePrice,
				)
				if updateError != testCase.expected {
					t.Fatalf("expected %v, got %v", testCase.expected, updateError)
				}
			})
		}
	})
}
