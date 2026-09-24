package service_test

import (
	"context"
	"strings"
	"testing"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

// 1. One brand with 2+ completed items and no other eligible brand
func TestDurabilityAnalytics_OnePatternBrandNoOtherEligibleBrand(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-one-pattern-brand"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryAudio := "Audio"
	brandSony := "Sony"
	endedAtOne := "2024-04-01"
	endedAtTwo := "2024-08-01"
	endedAtThree := "2024-12-01"

	// Sony: 3 completed items -> sampleSize = 3, IsPattern = true
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-1",
		UserID:       testUserID,
		Name:         "Sony XM3",
		Price:        200,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtOne,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-2",
		UserID:       testUserID,
		Name:         "Sony XM4",
		Price:        300,
		PurchaseDate: "2023-06-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtTwo,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-3",
		UserID:       testUserID,
		Name:         "Sony XM5",
		Price:        400,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedAtThree,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})

	analytics, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if len(analytics.Categories) != 1 {
		t.Fatalf("expected 1 category, got %d", len(analytics.Categories))
	}

	audioCategory := analytics.Categories[0]

	// Pattern exists, but no second pattern brand exists for comparison
	if audioCategory.LongestLastingBrand != nil {
		t.Errorf("expected LongestLastingBrand to be nil when only 1 pattern brand exists, got %s", *audioCategory.LongestLastingBrand)
	}
	if audioCategory.LowestCostBrand != nil {
		t.Errorf("expected LowestCostBrand to be nil when only 1 pattern brand exists, got %s", *audioCategory.LowestCostBrand)
	}

	// Pattern observation text must still be preserved for the single brand
	if len(audioCategory.Brands) != 1 {
		t.Fatalf("expected 1 brand, got %d", len(audioCategory.Brands))
	}
	sonyBrand := audioCategory.Brands[0]
	if !sonyBrand.IsPattern {
		t.Errorf("expected Sony sampleSize=3 to have IsPattern=true")
	}
	if !strings.Contains(audioCategory.ComparisonSummaryText, "Based on 3 completed items") {
		t.Errorf("expected single-brand observation text in comparison summary, got %q", audioCategory.ComparisonSummaryText)
	}
}

// 2. One pattern brand plus one single-observation brand
func TestDurabilityAnalytics_OnePatternBrandPlusOneSingleObservation(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-pattern-plus-single"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryFootwear := "Footwear"
	brandOutlier := "OutlierBrand"       // 1 item, lasted 1000 days, cheap per day (sampleSize=1)
	brandConsistent := "ConsistentBrand" // 2 items, average 400 days (sampleSize=2)
	outlierEndDate := "2026-09-27"
	consistentEndOne := "2024-06-01"
	consistentEndTwo := "2025-06-01"

	// Outlier brand: 1 item (IsPattern = false)
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

	// Consistent brand: 2 items (IsPattern = true)
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

	// Pattern count is 1 (only ConsistentBrand is a pattern). No second pattern brand exists.
	// LongestLastingBrand and LowestCostBrand must remain nil because pattern != comparison.
	if categoryInsight.LongestLastingBrand != nil {
		t.Errorf("expected LongestLastingBrand to be nil when only 1 pattern brand exists, got %s", *categoryInsight.LongestLastingBrand)
	}
	if categoryInsight.LowestCostBrand != nil {
		t.Errorf("expected LowestCostBrand to be nil when only 1 pattern brand exists, got %s", *categoryInsight.LowestCostBrand)
	}
	if categoryInsight.ComparisonSummaryText != "" {
		t.Errorf("expected ComparisonSummaryText to be empty when patternBrandCount < 2 and brand count > 1, got %q", categoryInsight.ComparisonSummaryText)
	}
}

// 3. Two eligible pattern brands where comparison is allowed
func TestDurabilityAnalytics_TwoEligiblePatternBrandsComparisonAllowed(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-two-pattern-brands"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryAudio := "Audio"
	brandSony := "Sony"
	brandBose := "Bose"

	// Sony: 2 items, average ~180 days, cost ~$1.11/day
	sonyEndOne := "2023-07-01"
	sonyEndTwo := "2024-07-01"
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-1",
		UserID:       testUserID,
		Name:         "Sony A",
		Price:        200,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &sonyEndOne,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-2",
		UserID:       testUserID,
		Name:         "Sony B",
		Price:        200,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &sonyEndTwo,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})

	// Bose: 2 items, average ~365 days, cost ~$0.55/day (lasts longer and cheaper per day)
	boseEndOne := "2024-01-01"
	boseEndTwo := "2025-01-01"
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-bose-1",
		UserID:       testUserID,
		Name:         "Bose A",
		Price:        200,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &boseEndOne,
		Category:     &categoryAudio,
		Brand:        &brandBose,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-bose-2",
		UserID:       testUserID,
		Name:         "Bose B",
		Price:        200,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &boseEndTwo,
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

	// Both brands have sampleSize >= 2 -> comparison is valid
	if audioCategory.LongestLastingBrand == nil {
		t.Fatalf("expected LongestLastingBrand to be set when 2 pattern brands exist")
	}
	if *audioCategory.LongestLastingBrand != brandBose {
		t.Errorf("expected LongestLastingBrand to be Bose, got %s", *audioCategory.LongestLastingBrand)
	}

	if audioCategory.LowestCostBrand == nil {
		t.Fatalf("expected LowestCostBrand to be set when 2 pattern brands exist")
	}
	if *audioCategory.LowestCostBrand != brandBose {
		t.Errorf("expected LowestCostBrand to be Bose, got %s", *audioCategory.LowestCostBrand)
	}

	if audioCategory.ComparisonSummaryText == "" {
		t.Errorf("expected comparison summary text to be populated for 2 pattern brands")
	}
}

// 4. One category with 2+ completed items
func TestDurabilityAnalytics_OneCategoryWithTwoPlusCompletedItems(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-one-category-pattern"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryApparel := "Apparel"
	endedAtApparelOne := "2023-07-01"
	endedAtApparelTwo := "2024-07-01"

	// Only 1 category with 2 completed items and interval calculated
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

	analytics, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Pattern exists for Apparel (typical replacement interval is calculated), but there is no 2nd category to compare against.
	// Therefore, MostFrequentlyReplacedCategory must remain nil.
	if analytics.MostFrequentlyReplacedCategory != nil {
		t.Errorf("expected MostFrequentlyReplacedCategory to be nil when only 1 category exists, got %v", analytics.MostFrequentlyReplacedCategory)
	}

	// However, category's own interval is preserved
	if len(analytics.Categories) != 1 {
		t.Fatalf("expected 1 category, got %d", len(analytics.Categories))
	}
	apparelCategory := analytics.Categories[0]
	if apparelCategory.TypicalReplacementIntervalDays == nil {
		t.Errorf("expected Apparel category to have its TypicalReplacementIntervalDays populated")
	}
}

// 5. Two eligible categories where replacement-frequency comparison is allowed
func TestDurabilityAnalytics_TwoEligibleCategoriesComparisonAllowed(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-two-eligible-categories"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryApparel := "Apparel"
	categoryFootwear := "Footwear"

	// Apparel: 2 items, interval = 365 days
	endedApparelOne := "2023-07-01"
	endedApparelTwo := "2024-07-01"
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-apparel-1",
		UserID:       testUserID,
		Name:         "Shirt 1",
		Price:        50,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedApparelOne,
		Category:     &categoryApparel,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-apparel-2",
		UserID:       testUserID,
		Name:         "Shirt 2",
		Price:        60,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedApparelTwo,
		Category:     &categoryApparel,
	})

	// Footwear: 2 items, interval = ~182 days (replaced more frequently than Apparel)
	endedFootwearOne := "2023-05-01"
	endedFootwearTwo := "2023-11-01"
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-shoes-1",
		UserID:       testUserID,
		Name:         "Shoes 1",
		Price:        100,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedFootwearOne,
		Category:     &categoryFootwear,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-shoes-2",
		UserID:       testUserID,
		Name:         "Shoes 2",
		Price:        120,
		PurchaseDate: "2023-07-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedFootwearTwo,
		Category:     &categoryFootwear,
	})

	analytics, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Two eligible categories exist -> comparison is allowed
	if analytics.MostFrequentlyReplacedCategory == nil {
		t.Fatalf("expected MostFrequentlyReplacedCategory to be set when 2 eligible categories exist")
	}

	if analytics.MostFrequentlyReplacedCategory.Category != categoryFootwear {
		t.Errorf("expected MostFrequentlyReplacedCategory to be Footwear (~182 days vs ~365 days), got %s", analytics.MostFrequentlyReplacedCategory.Category)
	}
	if analytics.MostFrequentlyReplacedCategory.CompletedCount != 2 {
		t.Errorf("expected completed count 2, got %d", analytics.MostFrequentlyReplacedCategory.CompletedCount)
	}
}

// 6. Single observation brands (sampleSize < 2) are never crowned winners
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

	// Single-item brands must NOT be crowned as longest-lasting or lowest-cost winners
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

// 7. Unbranded items are excluded from brand winners
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

// 8. Two pattern brands with equal average lifetime (lifetime tied, unique cost winner)
func TestDurabilityAnalytics_TwoPatternBrandsEqualLifetime_CostUniqueWinner(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-tied-lifetime"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryAudio := "Audio"
	brandSony := "Sony"
	brandBose := "Bose"

	// Both brands have 2 items lasting exactly 200 days each
	// Sony: $200 price -> $1.00/day
	sonyEndOne := "2023-07-20"
	sonyEndTwo := "2024-07-19"
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-tie-1",
		UserID:       testUserID,
		Name:         "Sony Tie 1",
		Price:        200,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &sonyEndOne,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-tie-2",
		UserID:       testUserID,
		Name:         "Sony Tie 2",
		Price:        200,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &sonyEndTwo,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})

	// Bose: $100 price -> $0.50/day (cheaper)
	boseEndOne := "2023-07-20"
	boseEndTwo := "2024-07-19"
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-bose-tie-1",
		UserID:       testUserID,
		Name:         "Bose Tie 1",
		Price:        100,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &boseEndOne,
		Category:     &categoryAudio,
		Brand:        &brandBose,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-bose-tie-2",
		UserID:       testUserID,
		Name:         "Bose Tie 2",
		Price:        100,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &boseEndTwo,
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

	// Lifetime is tied -> LongestLastingBrand must remain nil (no arbitrary winner)
	if audioCategory.LongestLastingBrand != nil {
		t.Errorf("expected LongestLastingBrand to be nil on tied lifetime, got %s", *audioCategory.LongestLastingBrand)
	}

	// Cost has a unique winner -> Bose is lowest cost
	if audioCategory.LowestCostBrand == nil {
		t.Fatalf("expected LowestCostBrand to be Bose, got nil")
	}
	if *audioCategory.LowestCostBrand != brandBose {
		t.Errorf("expected LowestCostBrand to be Bose, got %s", *audioCategory.LowestCostBrand)
	}

	// Comparison summary reflects the unique cost winner without manufacturing a lifetime winner
	if !strings.Contains(audioCategory.ComparisonSummaryText, "Bose achieved the lowest cost per day") {
		t.Errorf("expected summary to reflect cost winner, got %q", audioCategory.ComparisonSummaryText)
	}
}

// 9. Two pattern brands with equal average final cost/day (cost tied, unique lifetime winner)
func TestDurabilityAnalytics_TwoPatternBrandsEqualCost_LifetimeUniqueWinner(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-tied-cost"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryAudio := "Audio"
	brandSony := "Sony"
	brandBose := "Bose"

	// Sony: $200 for 200 days -> $1.00/day
	sonyEndOne := "2023-07-20"
	sonyEndTwo := "2024-07-19"
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-tie-cost-1",
		UserID:       testUserID,
		Name:         "Sony Tie Cost 1",
		Price:        200,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &sonyEndOne,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-tie-cost-2",
		UserID:       testUserID,
		Name:         "Sony Tie Cost 2",
		Price:        200,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &sonyEndTwo,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})

	// Bose: $100 for 100 days -> $1.00/day (cost is tied, but Sony lasted longer: 200 days vs 100 days)
	boseEndOne := "2023-04-11"
	boseEndTwo := "2024-04-10"
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-bose-tie-cost-1",
		UserID:       testUserID,
		Name:         "Bose Tie Cost 1",
		Price:        100,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &boseEndOne,
		Category:     &categoryAudio,
		Brand:        &brandBose,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-bose-tie-cost-2",
		UserID:       testUserID,
		Name:         "Bose Tie Cost 2",
		Price:        100,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &boseEndTwo,
		Category:     &categoryAudio,
		Brand:        &brandBose,
	})

	analytics, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	audioCategory := analytics.Categories[0]

	// Lifetime has a unique winner -> Sony
	if audioCategory.LongestLastingBrand == nil {
		t.Fatalf("expected LongestLastingBrand to be Sony, got nil")
	}
	if *audioCategory.LongestLastingBrand != brandSony {
		t.Errorf("expected LongestLastingBrand to be Sony, got %s", *audioCategory.LongestLastingBrand)
	}

	// Cost is tied -> LowestCostBrand must remain nil (no arbitrary winner)
	if audioCategory.LowestCostBrand != nil {
		t.Errorf("expected LowestCostBrand to be nil on tied cost, got %s", *audioCategory.LowestCostBrand)
	}

	// Comparison summary reflects the unique lifetime winner
	if !strings.Contains(audioCategory.ComparisonSummaryText, "Sony lasted longest") {
		t.Errorf("expected summary to reflect lifetime winner, got %q", audioCategory.ComparisonSummaryText)
	}
}

// 10. Two pattern brands with equal average lifetime and equal cost (both tied)
func TestDurabilityAnalytics_TwoPatternBrandsBothTied(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-both-tied"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryAudio := "Audio"
	brandSony := "Sony"
	brandBose := "Bose"

	// Both Sony and Bose have 2 items lasting 200 days at $200 ($1.00/day)
	endOne := "2023-07-20"
	endTwo := "2024-07-19"

	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-bt-1",
		UserID:       testUserID,
		Name:         "Sony 1",
		Price:        200,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endOne,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-sony-bt-2",
		UserID:       testUserID,
		Name:         "Sony 2",
		Price:        200,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endTwo,
		Category:     &categoryAudio,
		Brand:        &brandSony,
	})

	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-bose-bt-1",
		UserID:       testUserID,
		Name:         "Bose 1",
		Price:        200,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endOne,
		Category:     &categoryAudio,
		Brand:        &brandBose,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-bose-bt-2",
		UserID:       testUserID,
		Name:         "Bose 2",
		Price:        200,
		PurchaseDate: "2024-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endTwo,
		Category:     &categoryAudio,
		Brand:        &brandBose,
	})

	analytics, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	audioCategory := analytics.Categories[0]

	// Both lifetime and cost are tied -> both winner fields must be nil
	if audioCategory.LongestLastingBrand != nil {
		t.Errorf("expected LongestLastingBrand to be nil, got %s", *audioCategory.LongestLastingBrand)
	}
	if audioCategory.LowestCostBrand != nil {
		t.Errorf("expected LowestCostBrand to be nil, got %s", *audioCategory.LowestCostBrand)
	}
	if audioCategory.ComparisonSummaryText != "" {
		t.Errorf("expected empty comparison summary when both metrics are tied, got %q", audioCategory.ComparisonSummaryText)
	}
}

// 11. Two eligible categories with equal replacement intervals (interval tied)
func TestDurabilityAnalytics_TwoEligibleCategoriesEqualInterval_Tie(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-tied-category-intervals"

	itemRepository := memory.NewMemoryItemRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	categoryApparel := "Apparel"
	categoryFootwear := "Footwear"

	// Both categories have 2 items purchased exactly 182 days apart (same replacement interval)
	endedOne := "2023-07-01"
	endedTwo := "2024-01-01"

	// Apparel items
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-apparel-tie-1",
		UserID:       testUserID,
		Name:         "Apparel 1",
		Price:        50,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedOne,
		Category:     &categoryApparel,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-apparel-tie-2",
		UserID:       testUserID,
		Name:         "Apparel 2",
		Price:        60,
		PurchaseDate: "2023-07-02",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedTwo,
		Category:     &categoryApparel,
	})

	// Footwear items
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-footwear-tie-1",
		UserID:       testUserID,
		Name:         "Footwear 1",
		Price:        80,
		PurchaseDate: "2023-01-01",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedOne,
		Category:     &categoryFootwear,
	})
	_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
		ID:           "item-footwear-tie-2",
		UserID:       testUserID,
		Name:         "Footwear 2",
		Price:        90,
		PurchaseDate: "2023-07-02",
		Status:       domain.ItemStatusRetired,
		EndedAt:      &endedTwo,
		Category:     &categoryFootwear,
	})

	analytics, err := durabilityService.CalculateDurabilityAnalytics(testContext, testUserID, "", "")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	// Replacement intervals are identical -> MostFrequentlyReplacedCategory must remain nil (no arbitrary winner)
	if analytics.MostFrequentlyReplacedCategory != nil {
		t.Errorf("expected MostFrequentlyReplacedCategory to be nil on tied intervals, got %s", analytics.MostFrequentlyReplacedCategory.Category)
	}
}
