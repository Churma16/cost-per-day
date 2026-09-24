package service

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// DurabilityAnalyticsService calculates personal durability and brand/category ownership analytics.
type DurabilityAnalyticsService interface {
	CalculateDurabilityAnalytics(ctx context.Context, userID string, categoryFilter string, brandFilter string) (domain.DurabilityAnalytics, error)
	ListCategories(ctx context.Context, userID string) ([]domain.Category, error)
	ListBrands(ctx context.Context, userID string) ([]domain.Brand, error)
}

type durabilityAnalyticsServiceImpl struct {
	itemRepository     repository.ItemRepository
	categoryRepository repository.CategoryRepository
	brandRepository    repository.BrandRepository
}

// NewDurabilityAnalyticsService creates a new DurabilityAnalyticsService instance.
func NewDurabilityAnalyticsService(
	itemRepository repository.ItemRepository,
	categoryRepository repository.CategoryRepository,
	brandRepository repository.BrandRepository,
) DurabilityAnalyticsService {
	return &durabilityAnalyticsServiceImpl{
		itemRepository:     itemRepository,
		categoryRepository: categoryRepository,
		brandRepository:    brandRepository,
	}
}

// ListCategories returns all categories owned by the current user.
func (serviceInstance *durabilityAnalyticsServiceImpl) ListCategories(ctx context.Context, userID string) ([]domain.Category, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return nil, identityError
	}
	if serviceInstance.categoryRepository == nil {
		return []domain.Category{}, nil
	}
	return serviceInstance.categoryRepository.List(ctx, normalizedUserID)
}

// ListBrands returns all brands owned by the current user.
func (serviceInstance *durabilityAnalyticsServiceImpl) ListBrands(ctx context.Context, userID string) ([]domain.Brand, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return nil, identityError
	}
	if serviceInstance.brandRepository == nil {
		return []domain.Brand{}, nil
	}
	return serviceInstance.brandRepository.List(ctx, normalizedUserID)
}

// CalculateDurabilityAnalytics aggregates completed item history into personal durability analytics.
func (serviceInstance *durabilityAnalyticsServiceImpl) CalculateDurabilityAnalytics(
	ctx context.Context,
	userID string,
	categoryFilter string,
	brandFilter string,
) (domain.DurabilityAnalytics, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.DurabilityAnalytics{}, identityError
	}

	items, repositoryError := serviceInstance.itemRepository.List(ctx, normalizedUserID)
	if repositoryError != nil {
		return domain.DurabilityAnalytics{}, fmt.Errorf("list items for durability analytics: %w", repositoryError)
	}

	// 1. Identify completed items only (retired, sold, lost)
	completedItems := make([]domain.Item, 0)
	categorizedCompletedItems := make([]domain.Item, 0)
	for _, item := range items {
		if item.Status != domain.ItemStatusActive && item.EndedAt != nil && strings.TrimSpace(*item.EndedAt) != "" {
			completedItems = append(completedItems, item)
			if item.Category != nil && strings.TrimSpace(*item.Category) != "" {
				categorizedCompletedItems = append(categorizedCompletedItems, item)
			}
		}
	}

	trimmedCategoryFilter := strings.TrimSpace(categoryFilter)
	trimmedBrandFilter := strings.TrimSpace(brandFilter)

	// Filter categorized items if explicit filter is provided
	targetItems := make([]domain.Item, 0, len(categorizedCompletedItems))
	for _, item := range categorizedCompletedItems {
		if trimmedCategoryFilter != "" && !strings.EqualFold(*item.Category, trimmedCategoryFilter) {
			continue
		}
		if trimmedBrandFilter != "" && (item.Brand == nil || !strings.EqualFold(*item.Brand, trimmedBrandFilter)) {
			continue
		}
		targetItems = append(targetItems, item)
	}

	// 2. Group by Category
	itemsByCategory := make(map[string][]domain.Item)
	categoryDisplayName := make(map[string]string)
	categoryIDs := make(map[string]*int64)

	for _, item := range targetItems {
		categoryKey := strings.ToLower(strings.TrimSpace(*item.Category))
		itemsByCategory[categoryKey] = append(itemsByCategory[categoryKey], item)
		if _, exists := categoryDisplayName[categoryKey]; !exists {
			categoryDisplayName[categoryKey] = strings.TrimSpace(*item.Category)
			categoryIDs[categoryKey] = item.CategoryID
		}
	}

	categoryInsights := make([]domain.CategoryDurabilityInsight, 0, len(itemsByCategory))

	// Sort category keys alphabetically for deterministic output
	sortedCategoryKeys := make([]string, 0, len(itemsByCategory))
	for key := range itemsByCategory {
		sortedCategoryKeys = append(sortedCategoryKeys, key)
	}
	sort.Strings(sortedCategoryKeys)

	for _, categoryKey := range sortedCategoryKeys {
		categoryItemList := itemsByCategory[categoryKey]
		categoryName := categoryDisplayName[categoryKey]
		categoryID := categoryIDs[categoryKey]

		// 3. Group by Brand within this Category
		itemsByBrand := make(map[string][]domain.Item)
		brandDisplayName := make(map[string]string)
		brandIDs := make(map[string]*int64)

		categoryLifetimes := make([]float64, 0, len(categoryItemList))
		categoryFinalCosts := make([]float64, 0, len(categoryItemList))
		categoryPurchaseDates := make([]time.Time, 0, len(categoryItemList))

		for _, item := range categoryItemList {
			purchaseDate, parsePurchaseError := parseItemDate(item.PurchaseDate)
			if parsePurchaseError != nil {
				continue
			}
			categoryPurchaseDates = append(categoryPurchaseDates, purchaseDate)

			endedDate, parseEndError := parseItemDate(*item.EndedAt)
			if parseEndError != nil {
				continue
			}

			ownershipDays := int(math.Ceil(endedDate.Sub(purchaseDate).Hours() / 24))
			if ownershipDays < 1 {
				ownershipDays = 1
			}

			grossCostPerDay := item.Price / float64(ownershipDays)
			finalCostPerDay := grossCostPerDay
			if item.Status == domain.ItemStatusSold && item.SalePrice != nil {
				finalCostPerDay = (item.Price - *item.SalePrice) / float64(ownershipDays)
			}

			categoryLifetimes = append(categoryLifetimes, float64(ownershipDays))
			categoryFinalCosts = append(categoryFinalCosts, finalCostPerDay)

			brandName := "Unbranded"
			if item.Brand != nil && strings.TrimSpace(*item.Brand) != "" {
				brandName = strings.TrimSpace(*item.Brand)
			}
			brandKey := strings.ToLower(brandName)

			itemsByBrand[brandKey] = append(itemsByBrand[brandKey], item)
			if _, exists := brandDisplayName[brandKey]; !exists {
				brandDisplayName[brandKey] = brandName
				brandIDs[brandKey] = item.BrandID
			}
		}

		// Calculate brand insights
		brandInsights := make([]domain.BrandDurabilityInsight, 0, len(itemsByBrand))

		sortedBrandKeys := make([]string, 0, len(itemsByBrand))
		for bKey := range itemsByBrand {
			sortedBrandKeys = append(sortedBrandKeys, bKey)
		}
		sort.Strings(sortedBrandKeys)

		for _, brandKey := range sortedBrandKeys {
			brandItems := itemsByBrand[brandKey]
			brandName := brandDisplayName[brandKey]
			brandID := brandIDs[brandKey]

			brandLifetimes := make([]float64, 0, len(brandItems))
			brandFinalCosts := make([]float64, 0, len(brandItems))
			brandGrossCosts := make([]float64, 0, len(brandItems))
			brandNetCosts := make([]float64, 0, len(brandItems))
			var totalSpent float64

			evidenceList := make([]domain.DurabilityItemEvidence, 0, len(brandItems))

			for _, item := range brandItems {
				pDate, _ := parseItemDate(item.PurchaseDate)
				eDate, _ := parseItemDate(*item.EndedAt)
				ownershipDays := int(math.Ceil(eDate.Sub(pDate).Hours() / 24))
				if ownershipDays < 1 {
					ownershipDays = 1
				}

				grossCost := item.Price / float64(ownershipDays)
				finalCost := grossCost
				var netCost *float64
				if item.Status == domain.ItemStatusSold && item.SalePrice != nil {
					calculatedNetCost := (item.Price - *item.SalePrice) / float64(ownershipDays)
					netCost = &calculatedNetCost
					finalCost = calculatedNetCost
					brandNetCosts = append(brandNetCosts, calculatedNetCost)
				} else {
					brandNetCosts = append(brandNetCosts, grossCost)
				}

				brandLifetimes = append(brandLifetimes, float64(ownershipDays))
				brandFinalCosts = append(brandFinalCosts, finalCost)
				brandGrossCosts = append(brandGrossCosts, grossCost)
				totalSpent += item.Price

				evidenceList = append(evidenceList, domain.DurabilityItemEvidence{
					ID:                item.ID,
					Name:              item.Name,
					Status:            item.Status,
					Price:             item.Price,
					PurchaseDate:      item.PurchaseDate,
					EndedAt:           *item.EndedAt,
					OwnershipDays:     ownershipDays,
					FinalGrossCostDay: roundTwoDecimals(grossCost),
					FinalNetCostDay:   roundOptionalTwoDecimals(netCost),
					FinalCostPerDay:   roundTwoDecimals(finalCost),
				})
			}

			sampleSize := len(brandItems)
			isPattern := sampleSize >= 2
			avgLifetime := calculateAverage(brandLifetimes)
			medianLifetime := calculateMedian(brandLifetimes)
			avgFinalCost := calculateAverage(brandFinalCosts)
			medianFinalCost := calculateMedian(brandFinalCosts)
			avgGrossCost := calculateAverage(brandGrossCosts)
			avgNetCost := calculateAverage(brandNetCosts)

			var observationText string
			if isPattern {
				observationText = fmt.Sprintf("Based on %d completed items, %s averaged %.0f days (%.1f months) with a typical final cost of %.2f/day.",
					sampleSize, brandName, avgLifetime, avgLifetime/30.4375, avgFinalCost)
			} else {
				observationText = fmt.Sprintf("Based on 1 completed item, %s lasted %.0f days (%.1f months) with a final cost of %.2f/day.",
					brandName, avgLifetime, avgLifetime/30.4375, avgFinalCost)
			}

			brandInsights = append(brandInsights, domain.BrandDurabilityInsight{
				Brand:                       brandName,
				BrandID:                     brandID,
				Category:                    categoryName,
				CategoryID:                  categoryID,
				CompletedCount:              sampleSize,
				SampleSize:                  sampleSize,
				IsPattern:                   isPattern,
				AverageLifetimeDays:         roundTwoDecimals(avgLifetime),
				MedianLifetimeDays:          roundTwoDecimals(medianLifetime),
				AverageFinalCostPerDay:      roundTwoDecimals(avgFinalCost),
				MedianFinalCostPerDay:       roundTwoDecimals(medianFinalCost),
				AverageFinalGrossCostPerDay: roundTwoDecimals(avgGrossCost),
				AverageFinalNetCostPerDay:   roundTwoDecimals(avgNetCost),
				TotalSpent:                  roundTwoDecimals(totalSpent),
				ObservationText:             observationText,
				Items:                       evidenceList,
			})
		}

		// Calculate typical replacement interval for the category
		var typicalReplacementIntervalDays *float64
		if len(categoryPurchaseDates) >= 2 {
			sort.Slice(categoryPurchaseDates, func(i, j int) bool {
				return categoryPurchaseDates[i].Before(categoryPurchaseDates[j])
			})

			var intervalSum float64
			var intervalCount int
			for index := 0; index < len(categoryPurchaseDates)-1; index++ {
				interval := categoryPurchaseDates[index+1].Sub(categoryPurchaseDates[index]).Hours() / 24
				if interval > 0 {
					intervalSum += interval
					intervalCount++
				}
			}
			if intervalCount > 0 {
				avgInterval := roundTwoDecimals(intervalSum / float64(intervalCount))
				typicalReplacementIntervalDays = &avgInterval
			}
		}

		// Find longest lasting brand and lowest cost brand ONLY from brands satisfying the pattern threshold (isPattern == true / sampleSize >= 2)
		// AND require at least 2 pattern brands in the category to allow comparison
		var longestLastingBrand *string
		var maxLifetime float64
		var lowestCostBrand *string
		var minCost float64 = math.MaxFloat64
		var patternBrandCount int

		for _, brandInsight := range brandInsights {
			if brandInsight.Brand == "Unbranded" || !brandInsight.IsPattern {
				continue
			}
			patternBrandCount++
			if brandInsight.AverageLifetimeDays > maxLifetime {
				maxLifetime = brandInsight.AverageLifetimeDays
				longestBrandName := brandInsight.Brand
				longestLastingBrand = &longestBrandName
			}
			if brandInsight.AverageFinalCostPerDay < minCost {
				minCost = brandInsight.AverageFinalCostPerDay
				lowestCostBrandName := brandInsight.Brand
				lowestCostBrand = &lowestCostBrandName
			}
		}

		if patternBrandCount < 2 {
			longestLastingBrand = nil
			lowestCostBrand = nil
		}

		// Generate objective comparison summary
		var comparisonSummary string
		if patternBrandCount >= 2 && longestLastingBrand != nil && lowestCostBrand != nil {
			if *longestLastingBrand == *lowestCostBrand {
				comparisonSummary = fmt.Sprintf("In your history for %s, %s lasted the longest (%.0f days avg) and also delivered the lowest final cost (%.2f/day).",
					categoryName, *longestLastingBrand, maxLifetime, minCost)
			} else {
				comparisonSummary = fmt.Sprintf("In your history for %s, %s lasted longest (%.0f days avg), while %s achieved the lowest cost per day (%.2f/day).",
					categoryName, *longestLastingBrand, maxLifetime, *lowestCostBrand, minCost)
			}
		} else if len(brandInsights) == 1 {
			comparisonSummary = brandInsights[0].ObservationText
		}

		categoryInsights = append(categoryInsights, domain.CategoryDurabilityInsight{
			Category:                       categoryName,
			CategoryID:                     categoryID,
			CompletedCount:                 len(categoryItemList),
			AverageLifetimeDays:            roundTwoDecimals(calculateAverage(categoryLifetimes)),
			MedianLifetimeDays:             roundTwoDecimals(calculateMedian(categoryLifetimes)),
			AverageFinalCostPerDay:         roundTwoDecimals(calculateAverage(categoryFinalCosts)),
			MedianFinalCostPerDay:          roundTwoDecimals(calculateMedian(categoryFinalCosts)),
			TypicalReplacementIntervalDays: typicalReplacementIntervalDays,
			LongestLastingBrand:            longestLastingBrand,
			LowestCostBrand:                lowestCostBrand,
			ComparisonSummaryText:          comparisonSummary,
			Brands:                         brandInsights,
		})
	}

	// 4. Identify most frequently replaced category only when there is sufficient replacement evidence (completedCount >= 2 and interval calculated)
	// AND require at least 2 eligible categories with replacement-interval evidence to allow comparison
	var mostFrequentlyReplacedCategory *domain.FrequentlyReplacedCategory
	var bestReplacementScore float64 = math.MaxFloat64
	var eligibleCategoryCount int

	for _, categoryInsight := range categoryInsights {
		if categoryInsight.CompletedCount >= 2 && categoryInsight.TypicalReplacementIntervalDays != nil && *categoryInsight.TypicalReplacementIntervalDays > 0 {
			eligibleCategoryCount++
			if *categoryInsight.TypicalReplacementIntervalDays < bestReplacementScore {
				bestReplacementScore = *categoryInsight.TypicalReplacementIntervalDays
				mostFrequentlyReplacedCategory = &domain.FrequentlyReplacedCategory{
					Category:                       categoryInsight.Category,
					CompletedCount:                 categoryInsight.CompletedCount,
					TypicalReplacementIntervalDays: categoryInsight.TypicalReplacementIntervalDays,
				}
			}
		}
	}

	if eligibleCategoryCount < 2 {
		mostFrequentlyReplacedCategory = nil
	}

	return domain.DurabilityAnalytics{
		TotalCompletedItems:            len(completedItems),
		TotalCategorizedCompletedItems: len(categorizedCompletedItems),
		MostFrequentlyReplacedCategory: mostFrequentlyReplacedCategory,
		Categories:                     categoryInsights,
	}, nil
}

func calculateAverage(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	var sum float64
	for _, val := range values {
		sum += val
	}
	return sum / float64(len(values))
}

func calculateMedian(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	copied := make([]float64, len(values))
	copy(copied, values)
	sort.Float64s(copied)

	middle := len(copied) / 2
	if len(copied)%2 == 1 {
		return copied[middle]
	}
	return (copied[middle-1] + copied[middle]) / 2.0
}

func roundTwoDecimals(value float64) float64 {
	return math.Round(value*100) / 100
}

func roundOptionalTwoDecimals(value *float64) *float64 {
	if value == nil {
		return nil
	}
	rounded := roundTwoDecimals(*value)
	return &rounded
}
