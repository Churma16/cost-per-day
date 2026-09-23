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
		if !strings.Contains(combinedText, "earning their keep") && !strings.Contains(combinedText, "cheaper to own") {
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
		if bestValueInsight.Eyebrow != "Paling Banyak Memberi Nilai" {
			subTest.Errorf("expected eyebrow 'Paling Banyak Memberi Nilai', got: %s", bestValueInsight.Eyebrow)
		}
		if !strings.Contains(bestValueInsight.Caption, "Menemanimu selama") {
			subTest.Errorf("expected Indonesian caption, got: %s", bestValueInsight.Caption)
		}
	})
}
