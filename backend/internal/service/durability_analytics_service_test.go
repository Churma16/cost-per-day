package service_test

import (
	"context"
	"testing"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestDurabilityAnalytics_SmallSampleWinnerGuardrail(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-durability-guardrail"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryAudio := "Audio"
	brandSony := "Sony"
	brandBose := "Bose"
	endedAtOne := "2024-06-01"
	endedAtTwo := "2024-08-01"

	// Sony has 1 completed item (sampleSize = 1, IsPattern = false)
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-single",
		UserID:       testUserID,
		Name:         "Sony Headset",
		Price:        200,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtOne,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})

	// Bose has 1 completed item (sampleSize = 1, IsPattern = false)
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-bose-single",
		UserID:       testUserID,
		Name:         "Bose Earbuds",
		Price:        150,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtTwo,
		Category:     &categoryAudio,
		Brand:        &brandBose,
	})

	analytics, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if len(analytics.Categories) != 1 {
		t.Fatalf("expected 1 category, got %d", len(analytics.Categories))
	}

	audioCategory := analytics.Categories[0]

	// Guardrail assertion: Single-item brands must NOT be crowned as longest-lasting or lowest-cost winners
	if audioCategory.LongestLastingBrand != nil {
		t.Errorf("expected LongestLastingBrand to be nil when all brands have sampleSize < 2, got %s", *audioCategory.LongestLastingBrand)
	}
	if audioCategory.LowestCostBrand != nil {
		t.Errorf("expected LowestCostBrand to be nil when all brands have sampleSize < 2, got %s", *audioCategory.LowestCostBrand)
	}
	if audioCategory.ComparisonSummaryText != "" {
		t.Errorf("expected empty comparison summary when patternBrandCount < 2 and brand count > 1, got %q", audioCategory.ComparisonSummaryText)
	}
}

func TestDurabilityAnalytics_MixedSampleWinnersOnlyFromPatterns(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-durability-mixed"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryFootwear := "Footwear"
	brandOutlier := "OutlierBrand" // 1 item, lasted 1000 days, cheap per day
	brandConsistent := "ConsistentBrand" // 2 items, average 400 days
	outlierEndDate := "2026-09-27"
	consistentEndOne := "2024-06-01"
	consistentEndTwo := "2025-06-01"

	// Outlier brand: 1 item, high durability, but sampleSize = 1 (IsPattern = false)
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-outlier",
		UserID:       testUserID,
		Name:         "Outlier Boots",
		Price:        100,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &outlierEndDate,
		Category:     &categoryFootwear,
		Brand:        &brandOutlier,
	})

	// Consistent brand item 1
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-consistent-1",
		UserID:       testUserID,
		Name:         "Consistent Sneakers 1",
		Price:        200,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &consistentEndOne,
		Category:     &categoryFootwear,
		Brand:        &brandConsistent,
	})

	// Consistent brand item 2 -> sampleSize = 2, IsPattern = true
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-consistent-2",
		UserID:       testUserID,
		Name:         "Consistent Sneakers 2",
		Price:        200,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &consistentEndTwo,
		Category:     &categoryFootwear,
		Brand:        &brandConsistent,
	})

	analytics, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if len(analytics.Categories) != 1 {
		t.Fatalf("expected 1 category, got %d", len(analytics.Categories))
	}

	categoryInsight := analytics.Categories[0]

	// Only ConsistentBrand satisfies the pattern threshold (sampleSize >= 2)
	if categoryInsight.LongestLastingBrand == nil {
		t.Fatalf("expected LongestLastingBrand to be set to the pattern brand")
	}
	if *categoryInsight.LongestLastingBrand != brandConsistent {
		t.Errorf("expected LongestLastingBrand to be %q, got %q (single-item outlier should be ignored)", brandConsistent, *categoryInsight.LongestLastingBrand)
	}

	if categoryInsight.LowestCostBrand == nil {
		t.Fatalf("expected LowestCostBrand to be set to the pattern brand")
	}
	if *categoryInsight.LowestCostBrand != brandConsistent {
		t.Errorf("expected LowestCostBrand to be %q, got %q (single-item outlier should be ignored)", brandConsistent, *categoryInsight.LowestCostBrand)
	}
}

func TestDurabilityAnalytics_FrequentlyReplacedCategoryGuardrail(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-durability-frequent-guardrail"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryElectronics := "Electronics"
	categoryApparel := "Apparel"
	endedAtDate := "2024-06-01"

	// Case 1: Category with only 1 completed item must NOT be crowned as most frequently replaced
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-single-category",
		UserID:       testUserID,
		Name:         "Single Phone",
		Price:        500,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtDate,
		Category:     &categoryElectronics,
	})

	analyticsSingle, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if analyticsSingle.MostFrequentlyReplacedCategory != nil {
		t.Errorf("expected MostFrequentlyReplacedCategory to be nil when category only has 1 completed item, got %v", analyticsSingle.MostFrequentlyReplacedCategory)
	}

	// Case 2: Category with >= 2 completed items and successive purchase dates computes a valid replacement interval
	endedAtApparelOne := "2023-07-01"
	endedAtApparelTwo := "2024-07-01"

	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-apparel-1",
		UserID:       testUserID,
		Name:         "Shirt 1",
		Price:        50,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtApparelOne,
		Category:     &categoryApparel,
	})

	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-apparel-2",
		UserID:       testUserID,
		Name:         "Shirt 2",
		Price:        60,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtApparelTwo,
		Category:     &categoryApparel,
	})

	analyticsPair, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if analyticsPair.MostFrequentlyReplacedCategory == nil {
		t.Fatalf("expected MostFrequentlyReplacedCategory to be set for Apparel")
	}

	if analyticsPair.MostFrequentlyReplacedCategory.Category != categoryApparel {
		t.Errorf("expected MostFrequentlyReplacedCategory to be Apparel, got %s", analyticsPair.MostFrequentlyReplacedCategory.Category)
	}
	if analyticsPair.MostFrequentlyReplacedCategory.CompletedCount != 2 {
		t.Errorf("expected completed count 2, got %d", analyticsPair.MostFrequentlyReplacedCategory.CompletedCount)
	}
	if analyticsPair.MostFrequentlyReplacedCategory.TypicalReplacementIntervalDays == nil {
		t.Errorf("expected non-nil TypicalReplacementIntervalDays")
	}
}

func TestDurabilityAnalytics_UnbrandedExcludedFromWinners(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-durability-unbranded"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryKitchen := "Kitchen"
	endedAtOne := "2024-06-01"
	endedAtTwo := "2025-06-01"

	// Two unbranded items (brand == nil)
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-unbranded-1",
		UserID:       testUserID,
		Name:         "Generic Knife",
		Price:        30,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtOne,
		Category:     &categoryKitchen,
		Brand:        nil,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-unbranded-2",
		UserID:       testUserID,
		Name:         "Generic Pan",
		Price:        40,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtTwo,
		Category:     &categoryKitchen,
		Brand:        nil,
	})

	analytics, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if len(analytics.Categories) != 1 {
		t.Fatalf("expected 1 category, got %d", len(analytics.Categories))
	}

	kitchenCategory := analytics.Categories[0]

	// Unbranded must never be selected as longest lasting or lowest cost brand
	if kitchenCategory.LongestLastingBrand != nil {
		t.Errorf("expected LongestLastingBrand to be nil for unbranded items, got %s", *kitchenCategory.LongestLastingBrand)
	}
	if kitchenCategory.LowestCostBrand != nil {
		t.Errorf("expected LowestCostBrand to be nil for unbranded items, got %s", *kitchenCategory.LowestCostBrand)
	}
}
