package service_test

import (
	"context"
	"errors"
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
			nil,
			nil,
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
			nil,
			nil,
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

		_, serviceError := itemService.CreateItem(testContext, domain.LegacyUserID, "   ", 100.0, "2026-09-20T12:00:00Z", nil, nil)
		if serviceError != domain.ErrEmptyItemName {
			subTest.Errorf("expected ErrEmptyItemName, got: %v", serviceError)
		}
	})

	t.Run("rejects non-positive price", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		_, zeroPriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Book", 0.0, "2026-09-20T12:00:00Z", nil, nil)
		if zeroPriceError != domain.ErrInvalidItemPrice {
			subTest.Errorf("expected ErrInvalidItemPrice for zero price, got: %v", zeroPriceError)
		}

		_, negativePriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Book", -15.5, "2026-09-20T12:00:00Z", nil, nil)
		if negativePriceError != domain.ErrInvalidItemPrice {
			subTest.Errorf("expected ErrInvalidItemPrice for negative price, got: %v", negativePriceError)
		}
	})

	t.Run("rejects prices outside supported storage range", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		_, tinyPriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Tiny", 0.0000004, "2026-09-20T12:00:00Z", nil, nil)
		if tinyPriceError != domain.ErrUnsupportedItemPrice {
			subTest.Errorf("expected ErrUnsupportedItemPrice for sub-micro price, got: %v", tinyPriceError)
		}

		_, boundaryPriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Boundary", 9223372036854.7754, "2026-09-20T12:00:00Z", nil, nil)
		if boundaryPriceError != domain.ErrUnsupportedItemPrice {
			subTest.Errorf("expected ErrUnsupportedItemPrice at int64 boundary, got: %v", boundaryPriceError)
		}

		_, hugePriceError := itemService.CreateItem(testContext, domain.LegacyUserID, "Huge", 10000000000000.0, "2026-09-20T12:00:00Z", nil, nil)
		if hugePriceError != domain.ErrUnsupportedItemPrice {
			subTest.Errorf("expected ErrUnsupportedItemPrice for oversized price, got: %v", hugePriceError)
		}
	})

	t.Run("rejects invalid purchase date format", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		_, invalidDateError := itemService.CreateItem(testContext, domain.LegacyUserID, "Chair", 80.0, "not-a-valid-date", nil, nil)
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
		nil,
		nil,
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

func TestItemService_OwnershipTargets(t *testing.T) {
	ctx := context.Background()

	t.Run("validates target type and value pair", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		costType := domain.OwnershipTargetTypeCostPerDay
		val := 5000.0

		// Target type without value
		_, errNoVal := itemService.CreateItem(ctx, domain.LegacyUserID, "Item", 100000, "2026-09-01T12:00:00Z", &costType, nil)
		if !errors.Is(errNoVal, domain.ErrMissingOwnershipTargetValue) {
			subTest.Fatalf("expected ErrMissingOwnershipTargetValue, got %v", errNoVal)
		}

		// Target value without type
		_, errNoType := itemService.CreateItem(ctx, domain.LegacyUserID, "Item", 100000, "2026-09-01T12:00:00Z", nil, &val)
		if !errors.Is(errNoType, domain.ErrMissingOwnershipTargetType) {
			subTest.Fatalf("expected ErrMissingOwnershipTargetType, got %v", errNoType)
		}

		// Invalid target type
		invalidType := domain.OwnershipTargetType("unknown_type")
		_, errInvalidType := itemService.CreateItem(ctx, domain.LegacyUserID, "Item", 100000, "2026-09-01T12:00:00Z", &invalidType, &val)
		if !errors.Is(errInvalidType, domain.ErrInvalidOwnershipTargetType) {
			subTest.Fatalf("expected ErrInvalidOwnershipTargetType, got %v", errInvalidType)
		}

		// Non-positive value
		badVal := -10.0
		_, errBadVal := itemService.CreateItem(ctx, domain.LegacyUserID, "Item", 100000, "2026-09-01T12:00:00Z", &costType, &badVal)
		if !errors.Is(errBadVal, domain.ErrInvalidOwnershipTargetValue) {
			subTest.Fatalf("expected ErrInvalidOwnershipTargetValue, got %v", errBadVal)
		}
	})

	t.Run("calculates derived duration from target cost per day", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		costType := domain.OwnershipTargetTypeCostPerDay
		targetCost := 3500.0 // Price 2.400.000 / 3500 = 685.714 -> 686 days

		item, err := itemService.CreateItem(ctx, domain.LegacyUserID, "TWS", 2400000, "2026-09-20T12:00:00Z", &costType, &targetCost)
		if err != nil {
			subTest.Fatalf("unexpected error: %v", err)
		}

		if item.TargetCostPerDay == nil || *item.TargetCostPerDay != 3500.0 {
			subTest.Fatalf("expected target cost/day 3500, got %v", item.TargetCostPerDay)
		}
		if item.TargetDurationDays == nil || *item.TargetDurationDays != 686 {
			subTest.Fatalf("expected target duration 686 days, got %v", item.TargetDurationDays)
		}
		if item.TargetState == nil || (*item.TargetState != "new" && *item.TargetState != "in_progress") {
			subTest.Fatalf("expected target state new or in_progress, got %v", item.TargetState)
		}
	})

	t.Run("calculates derived cost per day from target duration", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		durationType := domain.OwnershipTargetTypeDuration
		targetDays := 600.0 // Price 2.400.000 / 600 = 4000/day

		item, err := itemService.CreateItem(ctx, domain.LegacyUserID, "Headphones", 2400000, "2026-09-20T12:00:00Z", &durationType, &targetDays)
		if err != nil {
			subTest.Fatalf("unexpected error: %v", err)
		}

		if item.TargetDurationDays == nil || *item.TargetDurationDays != 600 {
			subTest.Fatalf("expected target duration 600 days, got %v", item.TargetDurationDays)
		}
		if item.TargetCostPerDay == nil || *item.TargetCostPerDay != 4000.0 {
			subTest.Fatalf("expected target cost/day 4000, got %v", item.TargetCostPerDay)
		}
	})

	t.Run("identifies target reached and beyond target on ended items", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		durationType := domain.OwnershipTargetTypeDuration
		targetDays := 10.0

		// Created with 10 days target, ended after 15 days -> beyond target
		endedAt := "2026-09-16T12:00:00Z"
		created, err := itemService.CreateItem(ctx, domain.LegacyUserID, "Tool", 100.0, "2026-09-01T12:00:00Z", &durationType, &targetDays)
		if err != nil {
			subTest.Fatalf("create item error: %v", err)
		}

		retired, updateErr := itemService.UpdateItem(
			ctx, domain.LegacyUserID, created.ID, created.Name, created.Price, created.PurchaseDate,
			domain.ItemStatusRetired, &endedAt, nil, &durationType, &targetDays,
		)
		if updateErr != nil {
			subTest.Fatalf("update item error: %v", updateErr)
		}

		if retired.OwnershipDays != 15 {
			subTest.Fatalf("expected 15 ownership days, got %d", retired.OwnershipDays)
		}
		if retired.TargetReached == nil || !*retired.TargetReached {
			subTest.Fatalf("expected targetReached true, got %v", retired.TargetReached)
		}
		if retired.TargetState == nil || *retired.TargetState != "beyond_target" {
			subTest.Fatalf("expected beyond_target, got %v", retired.TargetState)
		}
		if retired.DaysBeyond == nil || *retired.DaysBeyond != 5 {
			subTest.Fatalf("expected 5 days beyond target, got %v", retired.DaysBeyond)
		}
		if retired.RemainingDays == nil || *retired.RemainingDays != 0 {
			subTest.Fatalf("expected 0 remaining days, got %v", retired.RemainingDays)
		}
	})

	t.Run("sold item uses net ownership cost for target calculations", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		itemService := service.NewItemService(itemRepository)

		costType := domain.OwnershipTargetTypeCostPerDay
		targetCost := 6.0

		endedAt := "2026-09-11T12:00:00Z" // 10 days
		salePrice := 40.0                  // Net cost = 100 - 40 = 60; Net cost/day = 60 / 10 = 6/day

		created, err := itemService.CreateItem(ctx, domain.LegacyUserID, "Phone", 100.0, "2026-09-01T12:00:00Z", &costType, &targetCost)
		if err != nil {
			subTest.Fatalf("create error: %v", err)
		}

		sold, updateErr := itemService.UpdateItem(
			ctx, domain.LegacyUserID, created.ID, created.Name, created.Price, created.PurchaseDate,
			domain.ItemStatusSold, &endedAt, &salePrice, &costType, &targetCost,
		)
		if updateErr != nil {
			subTest.Fatalf("update error: %v", updateErr)
		}

		// Effective cost is net: 60. Target cost: 6/day -> Target duration = 60 / 6 = 10 days.
		if sold.TargetDurationDays == nil || *sold.TargetDurationDays != 10 {
			subTest.Fatalf("expected target duration 10 days based on net cost, got %v", sold.TargetDurationDays)
		}
		if sold.TargetReached == nil || !*sold.TargetReached {
			subTest.Fatalf("expected targetReached true, got %v", sold.TargetReached)
		}
	})
}

func TestItemService_CalculateReplacementBenchmark(t *testing.T) {
	ctx := context.Background()
	itemRepository := memory.NewMemoryItemRepository()
	itemService := service.NewItemService(itemRepository)

	endedAt := "2026-09-11T12:00:00Z" // 10 days
	costType := domain.OwnershipTargetTypeCostPerDay
	targetCost := 5.0

	// 1. Seed completed item: price 100, 10 days -> final cost/day = 10. Target cost/day = 5.
	item, err := itemService.CreateItem(ctx, domain.LegacyUserID, "Previous Headphones", 100.0, "2026-09-01T12:00:00Z", &costType, &targetCost)
	if err != nil {
		t.Fatalf("failed to seed item: %v", err)
	}

	retiredItem, retireErr := itemService.UpdateItem(
		ctx, domain.LegacyUserID, item.ID, item.Name, item.Price, item.PurchaseDate,
		domain.ItemStatusRetired, &endedAt, nil, &costType, &targetCost,
	)
	if retireErr != nil {
		t.Fatalf("failed to retire item: %v", retireErr)
	}

	// 2. Active item should be rejected
	activeItem, _ := itemService.CreateItem(ctx, domain.LegacyUserID, "Active Laptop", 500.0, "2026-09-01T12:00:00Z", nil, nil)
	_, activeBenchmarkErr := itemService.CalculateReplacementBenchmark(ctx, domain.LegacyUserID, activeItem.ID, 600.0)
	if !errors.Is(activeBenchmarkErr, domain.ErrBenchmarkItemNotCompleted) {
		t.Fatalf("expected ErrBenchmarkItemNotCompleted, got %v", activeBenchmarkErr)
	}

	// 3. Non-positive candidate price should be rejected
	_, badPriceErr := itemService.CalculateReplacementBenchmark(ctx, domain.LegacyUserID, retiredItem.ID, -50.0)
	if !errors.Is(badPriceErr, domain.ErrInvalidBenchmarkPrice) {
		t.Fatalf("expected ErrInvalidBenchmarkPrice, got %v", badPriceErr)
	}

	// 4. Valid benchmark calculation with exact integer ratio
	// Previous: final cost/day = 100 / 10 = 10.0. Target cost/day = 5.0.
	// Candidate replacement price = 150.0
	// Match previous: ceil(150 / 10) = 15 days
	// Beat previous: floor(150 / 10) + 1 = 16 days
	// Match target: ceil(150 / 5) = 30 days
	benchmark, calcErr := itemService.CalculateReplacementBenchmark(ctx, domain.LegacyUserID, retiredItem.ID, 150.0)
	if calcErr != nil {
		t.Fatalf("calculate benchmark error: %v", calcErr)
	}

	if benchmark.FinalCostPerDay != 10.0 {
		t.Fatalf("expected final cost/day 10.0, got %f", benchmark.FinalCostPerDay)
	}
	if benchmark.DaysToMatchPrevious == nil || *benchmark.DaysToMatchPrevious != 15 {
		t.Fatalf("expected 15 days to match previous, got %v", benchmark.DaysToMatchPrevious)
	}
	if benchmark.DaysToBeatPrevious == nil || *benchmark.DaysToBeatPrevious != 16 {
		t.Fatalf("expected 16 days to beat previous, got %v", benchmark.DaysToBeatPrevious)
	}
	if !benchmark.HasTarget {
		t.Fatalf("expected HasTarget true")
	}
	if benchmark.DaysToMatchTarget == nil || *benchmark.DaysToMatchTarget != 30 {
		t.Fatalf("expected 30 days to match target, got %v", benchmark.DaysToMatchTarget)
	}

	// 5. Valid benchmark calculation with non-integer ratio
	// Candidate replacement price = 125.0
	// 125.0 / 10.0 = 12.5
	// Match previous: ceil(12.5) = 13 days (125 / 13 ~= 9.615 <= 10.0)
	// Beat previous: floor(12.5) + 1 = 13 days (125 / 13 ~= 9.615 < 10.0, already beats!)
	nonIntegerBenchmark, nonIntegerErr := itemService.CalculateReplacementBenchmark(ctx, domain.LegacyUserID, retiredItem.ID, 125.0)
	if nonIntegerErr != nil {
		t.Fatalf("calculate non-integer benchmark error: %v", nonIntegerErr)
	}
	if nonIntegerBenchmark.DaysToMatchPrevious == nil || *nonIntegerBenchmark.DaysToMatchPrevious != 13 {
		t.Fatalf("expected 13 days to match previous, got %v", nonIntegerBenchmark.DaysToMatchPrevious)
	}
	if nonIntegerBenchmark.DaysToBeatPrevious == nil || *nonIntegerBenchmark.DaysToBeatPrevious != 13 {
		t.Fatalf("expected 13 days to beat previous, got %v", nonIntegerBenchmark.DaysToBeatPrevious)
	}
}

