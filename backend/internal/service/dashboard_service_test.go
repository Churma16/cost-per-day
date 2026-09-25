package service_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestDashboardService_GetDashboard(t *testing.T) {
	testContext := context.Background()
	testUserID := "user-dashboard-123"

	t.Run("returns zero cost and empty insights when user has no items", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		if dashboardData.TotalDailyCost != 0 {
			subTest.Errorf("expected totalDailyCost 0, got: %f", dashboardData.TotalDailyCost)
		}
		if len(dashboardData.Insights) != 0 {
			subTest.Errorf("expected 0 insights, got: %d", len(dashboardData.Insights))
		}
	})

	t.Run("generates best_value and biggest_contributor insights for standard collection", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		// Item 1: Expensive recent item (Laptop, high cost/day)
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Laptop",
			Price:        2000.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -20).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		// Item 2: Long-owned item with low cost/day (Bantal Orthopedic)
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Bantal Orthopedic",
			Price:        100.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -200).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		if dashboardData.TotalDailyCost <= 0 {
			subTest.Errorf("expected positive total daily cost, got: %f", dashboardData.TotalDailyCost)
		}

		kindsMap := make(map[string]domain.DashboardInsight)
		for _, insight := range dashboardData.Insights {
			kindsMap[insight.Kind] = insight
		}

		bestValueInsight, hasBestValue := kindsMap["best_value"]
		if !hasBestValue {
			subTest.Errorf("expected best_value insight to be present")
		} else if bestValueInsight.Primary != "Bantal Orthopedic" {
			subTest.Errorf("expected best value item 'Bantal Orthopedic', got: %s", bestValueInsight.Primary)
		}

		biggestContributorInsight, hasBiggestContributor := kindsMap["biggest_contributor"]
		if !hasBiggestContributor {
			subTest.Errorf("expected biggest_contributor insight to be present")
		} else if biggestContributorInsight.Primary != "Laptop" {
			subTest.Errorf("expected biggest contributor item 'Laptop', got: %s", biggestContributorInsight.Primary)
		}
	})

	t.Run("OwnershipCostTrendProvider downward trend avoids 'saved money' framing", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		// Items purchased 100 days ago, no purchases in last 30 days
		// 30 days ago (day 70), cost was price / 70.
		// Today (day 100), cost is price / 100 -> downward trend!
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Monitor LG",
			Price:        1000.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -100).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		var trendInsight *domain.DashboardInsight
		for _, insight := range dashboardData.Insights {
			if insight.Kind == "ownership_cost_trend" {
				copyInsight := insight
				trendInsight = &copyInsight
				break
			}
		}

		if trendInsight == nil {
			subTest.Fatalf("expected ownership_cost_trend insight for downward aging collection")
		}

		// MUST NOT use "saved" or "money saved" or "reduced spending"
		combinedText := strings.ToLower(trendInsight.Primary + " " + trendInsight.Secondary + " " + trendInsight.Caption)
		if strings.Contains(combinedText, "saved") || strings.Contains(combinedText, "hemat") {
			subTest.Errorf("ownership trend copy must not claim money was saved, got: %s", combinedText)
		}
		if !strings.Contains(combinedText, "ownership time spreads") && !strings.Contains(combinedText, "lower than 30 days ago") {
			subTest.Errorf("expected positive ownership progress framing, got: %s", combinedText)
		}
	})

	t.Run("OwnershipCostTrendProvider upward trend attributes newly added item", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		// Baseline item purchased 90 days ago
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Chair",
			Price:        200.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -90).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		// Big new purchase 5 days ago causing cost jump
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Sony Headphones",
			Price:        1500.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -5).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		var trendInsight *domain.DashboardInsight
		for _, insight := range dashboardData.Insights {
			if insight.Kind == "ownership_cost_trend" {
				copyInsight := insight
				trendInsight = &copyInsight
				break
			}
		}

		if trendInsight == nil {
			subTest.Fatalf("expected ownership_cost_trend insight for upward jump")
		}

		if !strings.Contains(trendInsight.Secondary, "Sony Headphones") {
			subTest.Errorf("expected trend secondary to attribute 'Sony Headphones', got: %s", trendInsight.Secondary)
		}
	})

	t.Run("EquivalentProvider integrates custom value equivalents", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		// Total daily cost will be $5.00/day
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Shoes",
			Price:        50.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -10).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		// Custom equivalent: Coffee at $5.00
		_, _ = equivalentRepository.Create(testContext, testUserID, domain.ValueEquivalent{
			Name:         "Coffee",
			Amount:       5.0,
			CurrencyCode: "USD",
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		var eqInsight *domain.DashboardInsight
		for _, insight := range dashboardData.Insights {
			if insight.Kind == "equivalent" {
				copyInsight := insight
				eqInsight = &copyInsight
				break
			}
		}

		if eqInsight == nil {
			subTest.Fatalf("expected equivalent insight to be generated")
		}

		if !strings.Contains(eqInsight.Primary, "Coffee") {
			subTest.Errorf("expected equivalent insight primary to mention 'Coffee', got: %s", eqInsight.Primary)
		}
	})

	t.Run("MilestoneProvider triggers when item reaches ownership milestone", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		// Item owned for exactly 100 days
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Keychron K2",
			Price:        100.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -100).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		var milestoneInsight *domain.DashboardInsight
		for _, insight := range dashboardData.Insights {
			if insight.Kind == "milestone" {
				copyInsight := insight
				milestoneInsight = &copyInsight
				break
			}
		}

		if milestoneInsight == nil {
			subTest.Fatalf("expected milestone insight for 100 days item")
		}
		if milestoneInsight.Primary != "Keychron K2" {
			subTest.Errorf("expected milestone item 'Keychron K2', got: %s", milestoneInsight.Primary)
		}
	})

	t.Run("returns all eligible insights ranked by priority without 4-slide truncation", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		// Create 6 items with varying ages and prices to trigger multiple providers
		now := time.Now().UTC()
		items := []domain.Item{
			{Name: "Item 1", Price: 1000.0, PurchaseDate: now.AddDate(0, 0, -365).Format(time.RFC3339), Status: domain.ItemStatusActive},
			{Name: "Item 2", Price: 800.0, PurchaseDate: now.AddDate(0, 0, -100).Format(time.RFC3339), Status: domain.ItemStatusActive},
			{Name: "Item 3", Price: 50.0, PurchaseDate: now.AddDate(0, 0, -500).Format(time.RFC3339), Status: domain.ItemStatusActive},
			{Name: "Item 4", Price: 500.0, PurchaseDate: now.AddDate(0, 0, -5).Format(time.RFC3339), Status: domain.ItemStatusActive},
			{Name: "Item 5", Price: 300.0, PurchaseDate: now.AddDate(0, 0, -30).Format(time.RFC3339), Status: domain.ItemStatusActive},
			{Name: "Item 6", Price: 200.0, PurchaseDate: now.AddDate(0, 0, -10).Format(time.RFC3339), Status: domain.ItemStatusActive},
		}
		for _, item := range items {
			_, _ = itemRepository.Create(testContext, testUserID, item)
		}

		_, _ = equivalentRepository.Create(testContext, testUserID, domain.ValueEquivalent{
			Name:         "Lunch",
			Amount:       15.0,
			CurrencyCode: "USD",
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		if len(dashboardData.Insights) <= 4 {
			subTest.Fatalf("expected more than 4 insights when multiple providers qualify, got: %d", len(dashboardData.Insights))
		}
	})

	t.Run("respects Indonesian language setting", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		_ = settingsRepository.Set(testContext, testUserID, "language", "id")
		_ = settingsRepository.Set(testContext, testUserID, "currency", "IDR")

		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Bantal",
			Price:        100000.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -50).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		if len(dashboardData.Insights) == 0 {
			subTest.Fatalf("expected at least one insight")
		}

		var bestValueInsight *domain.DashboardInsight
		for _, insight := range dashboardData.Insights {
			if insight.Kind == "best_value" {
				copyInsight := insight
				bestValueInsight = &copyInsight
				break
			}
		}

		if bestValueInsight == nil {
			subTest.Fatalf("expected best_value insight")
		}
		if bestValueInsight.Eyebrow != "Biaya Harian Terendah Saat Ini" {
			subTest.Errorf("expected eyebrow 'Biaya Harian Terendah Saat Ini', got: %s", bestValueInsight.Eyebrow)
		}
		if !strings.Contains(bestValueInsight.Caption, "Menemanimu selama") {
			subTest.Errorf("expected Indonesian caption, got: %s", bestValueInsight.Caption)
		}
	})

	t.Run("EquivalentProvider ignores equivalents whose currency does not match user setting", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		_ = settingsRepository.Set(testContext, testUserID, "currency", "IDR")

		// Total daily cost is Rp 15.000/day
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Kipas Angin",
			Price:        150000.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -10).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		// Equivalent in USD (currency mismatch)
		_, _ = equivalentRepository.Create(testContext, testUserID, domain.ValueEquivalent{
			Name:         "USD Coffee",
			Amount:       1.0,
			CurrencyCode: "USD",
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		for _, insight := range dashboardData.Insights {
			if insight.Kind == "equivalent" {
				subTest.Fatalf("expected no equivalent insight for mismatched currency USD when user is IDR, got: %+v", insight)
			}
		}

		// Now add matching IDR equivalent
		_, _ = equivalentRepository.Create(testContext, testUserID, domain.ValueEquivalent{
			Name:         "Kopi Kenangan",
			Amount:       15000.0,
			CurrencyCode: "IDR",
		})

		dashboardDataWithIDR, serviceError2 := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError2 != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError2)
		}

		var matchedEquivalentInsight *domain.DashboardInsight
		for _, insight := range dashboardDataWithIDR.Insights {
			if insight.Kind == "equivalent" {
				copyInsight := insight
				matchedEquivalentInsight = &copyInsight
				break
			}
		}

		if matchedEquivalentInsight == nil {
			subTest.Fatalf("expected equivalent insight for matching IDR currency")
		}
		if !strings.Contains(matchedEquivalentInsight.Primary, "Kopi Kenangan") {
			subTest.Errorf("expected insight to reference 'Kopi Kenangan', got: %s", matchedEquivalentInsight.Primary)
		}
	})

	t.Run("RecentPurchaseImpactProvider suppresses insight if total daily cost actually decreased", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		now := time.Now().UTC()

		// Older expensive item: 50 days old, $500 -> cost today is $500/50 = $10.00/day
		// 14 days ago (day 36), cost was $500/36 = $13.89/day
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Desk Mat",
			Price:        500.0,
			PurchaseDate: now.AddDate(0, 0, -50).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		// Recent item: 2 days old, $6.00 -> $3.00/day (23% of $13.00 total)
		// Total today: $10.00 + $3.00 = $13.00/day
		// Prior 14 days ago was $13.89/day. Net change: DECREASE from $13.89 to $13.00!
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "USB Cable",
			Price:        6.0,
			PurchaseDate: now.AddDate(0, 0, -2).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		for _, insight := range dashboardData.Insights {
			if insight.Kind == "recent_purchase_impact" {
				subTest.Fatalf("did not expect recent_purchase_impact when total daily cost decreased, got: %+v", insight)
			}
		}
	})

	t.Run("RecentPurchaseImpactProvider triggers when recent purchase drove verified cost increase", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		now := time.Now().UTC()

		// Older item: 50 days old, $100 -> cost today is $2.00/day, 14 days ago was $100/36 = $2.78/day
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Mouse Pad",
			Price:        100.0,
			PurchaseDate: now.AddDate(0, 0, -50).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		// Substantial recent purchase: 2 days old, $100 -> $50.00/day
		// Total today: $2.00 + $50.00 = $52.00/day. Prior was $2.78/day. Dramatic increase!
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Mechanical Keyboard",
			Price:        100.0,
			PurchaseDate: now.AddDate(0, 0, -2).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		var recentImpactInsight *domain.DashboardInsight
		for _, insight := range dashboardData.Insights {
			if insight.Kind == "recent_purchase_impact" {
				copyInsight := insight
				recentImpactInsight = &copyInsight
				break
			}
		}

		if recentImpactInsight == nil {
			subTest.Fatalf("expected recent_purchase_impact insight when recent purchase drove cost increase")
		}
		if recentImpactInsight.Primary != "Mechanical Keyboard" {
			subTest.Errorf("expected recent impact item 'Mechanical Keyboard', got: %s", recentImpactInsight.Primary)
		}
	})

	t.Run("RecentPurchaseImpactProvider does not overstate one recent item's share of the increase", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		now := time.Now().UTC()

		// Existing baseline: $100 / 50 days = $2/day today, about $2.78/day 14 days ago.
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Mouse Pad",
			Price:        100.0,
			PurchaseDate: now.AddDate(0, 0, -50).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		// Three recent purchases increase today's total to $32/day.
		// The selected item contributes $12/day (37.5% of current total), but less than
		// half of the roughly $29.22/day increase versus 14 days ago.
		recentItems := []domain.Item{
			{Name: "Keyboard", Price: 24.0, PurchaseDate: now.AddDate(0, 0, -2).Format(time.RFC3339), Status: domain.ItemStatusActive},
			{Name: "Headphones", Price: 20.0, PurchaseDate: now.AddDate(0, 0, -2).Format(time.RFC3339), Status: domain.ItemStatusActive},
			{Name: "Webcam", Price: 16.0, PurchaseDate: now.AddDate(0, 0, -2).Format(time.RFC3339), Status: domain.ItemStatusActive},
		}
		for _, item := range recentItems {
			_, _ = itemRepository.Create(testContext, testUserID, item)
		}

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)
		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		var recentImpactInsight *domain.DashboardInsight
		for _, insight := range dashboardData.Insights {
			if insight.Kind == "recent_purchase_impact" {
				copyInsight := insight
				recentImpactInsight = &copyInsight
				break
			}
		}

		if recentImpactInsight == nil {
			subTest.Fatalf("expected recent_purchase_impact insight")
		}
		if recentImpactInsight.Primary != "Keyboard" {
			subTest.Errorf("expected selected recent item 'Keyboard', got: %s", recentImpactInsight.Primary)
		}
		if recentImpactInsight.Secondary != "A major contributor to your current daily ownership cost" {
			subTest.Errorf("expected evidence-bounded recent impact copy, got: %s", recentImpactInsight.Secondary)
		}
		if strings.Contains(strings.ToLower(recentImpactInsight.Secondary), "most") {
			subTest.Errorf("recent impact copy must not claim the item caused most of the increase, got: %s", recentImpactInsight.Secondary)
		}
	})

	t.Run("OwnershipCostTrendProvider does not misattribute lifecycle removals as continued-use aging improvement", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		now := time.Now().UTC()

		// Continuing active item: 100 days old, $1000 -> $10/day today
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Laptop",
			Price:        1000.0,
			PurchaseDate: now.AddDate(0, 0, -100).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		// Item retired 10 days ago (inside 30-day window): 100 days old, $5000
		// 30 days ago, it contributed $5000/70 = $71.43/day
		endedAtString := now.AddDate(0, 0, -10).Format(time.RFC3339)
		_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
			Name:         "Motorcycle",
			Price:        5000.0,
			PurchaseDate: now.AddDate(0, 0, -100).Format(time.RFC3339),
			Status:       domain.ItemStatusRetired,
			EndedAt:      &endedAtString,
		})

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		for _, insight := range dashboardData.Insights {
			if insight.Kind == "ownership_cost_trend" {
				subTest.Fatalf("expected ownership_cost_trend to be suppressed when drop was caused by lifecycle removal, got: %+v", insight)
			}
		}
	})

	t.Run("PortfolioMilestoneProvider never presents 17 active items as 10 Items Tracked", func(subTest *testing.T) {
		itemRepository := memory.NewMemoryItemRepository()
		settingsRepository := memory.NewMemorySettingsRepository()
		equivalentRepository := memory.NewMemoryValueEquivalentRepository()

		now := time.Now().UTC()

		// Create exactly 17 active items
		for index := 1; index <= 17; index++ {
			_, _ = itemRepository.Create(testContext, testUserID, domain.Item{
				Name:         "Item",
				Price:        100.0,
				PurchaseDate: now.AddDate(0, 0, -100).Format(time.RFC3339),
				Status:       domain.ItemStatusActive,
			})
		}

		dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

		dashboardData, serviceError := dashboardService.GetDashboard(testContext, testUserID)
		if serviceError != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError)
		}

		// Must never present 17 items as "10 Items Tracked"
		for _, insight := range dashboardData.Insights {
			if insight.Kind == "portfolio_milestone" {
				subTest.Fatalf("portfolio_milestone should only emit on exact milestone thresholds, not for 17 items: %+v", insight)
			}
			if insight.Primary == "10 Items Tracked" {
				subTest.Fatalf("17 active items must never be presented as '10 Items Tracked'")
			}
		}

		// When collection has exactly 10 active items, milestone does emit
		itemRepository10 := memory.NewMemoryItemRepository()
		for index := 1; index <= 10; index++ {
			_, _ = itemRepository10.Create(testContext, testUserID, domain.Item{
				Name:         "Item",
				Price:        100.0,
				PurchaseDate: now.AddDate(0, 0, -100).Format(time.RFC3339),
				Status:       domain.ItemStatusActive,
			})
		}

		dashboardService10 := service.NewDashboardService(itemRepository10, settingsRepository, equivalentRepository)
		dashboardData10, serviceError10 := dashboardService10.GetDashboard(testContext, testUserID)
		if serviceError10 != nil {
			subTest.Fatalf("expected no error, got: %v", serviceError10)
		}

		var milestoneInsight *domain.DashboardInsight
		for _, insight := range dashboardData10.Insights {
			if insight.Kind == "portfolio_milestone" {
				copyInsight := insight
				milestoneInsight = &copyInsight
				break
			}
		}

		if milestoneInsight == nil {
			subTest.Fatalf("expected portfolio_milestone insight when exactly reaching 10 items")
		}
		if milestoneInsight.Primary != "10 Items Tracked" {
			subTest.Errorf("expected '10 Items Tracked', got: %s", milestoneInsight.Primary)
		}
	})
}
