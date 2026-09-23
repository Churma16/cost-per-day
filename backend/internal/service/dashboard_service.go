package service

import (
	"context"
	"sort"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// DashboardService defines the application use case operations for aggregating home metrics and carousel insights.
type DashboardService interface {
	GetDashboard(ctx context.Context, userID string) (domain.DashboardData, error)
}

type dashboardServiceImpl struct {
	itemRepository       repository.ItemRepository
	settingsRepository   repository.SettingsRepository
	equivalentRepository repository.ValueEquivalentRepository
	providers            []InsightProvider
	nowFunction          func() time.Time
}

// NewDashboardService creates a new DashboardService configured with repositories and registered insight providers.
func NewDashboardService(
	itemRepository repository.ItemRepository,
	settingsRepository repository.SettingsRepository,
	equivalentRepository repository.ValueEquivalentRepository,
	customProviders ...InsightProvider,
) DashboardService {
	providers := customProviders
	if len(providers) == 0 {
		providers = []InsightProvider{
			&RecentPurchaseImpactProvider{},
			&OwnershipCostTrendProvider{},
			&MilestoneProvider{},
			&BestValueProvider{},
			&BiggestContributorProvider{},
			&EquivalentProvider{},
			&PortfolioMilestoneProvider{},
		}
	}

	return &dashboardServiceImpl{
		itemRepository:       itemRepository,
		settingsRepository:   settingsRepository,
		equivalentRepository: equivalentRepository,
		providers:            providers,
		nowFunction:          time.Now,
	}
}

// GetDashboard loads user data once per request, builds a shared context, and produces ranked carousel insights.
func (serviceInstance *dashboardServiceImpl) GetDashboard(ctx context.Context, userID string) (domain.DashboardData, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.DashboardData{}, identityError
	}

	currentTime := serviceInstance.nowFunction().UTC()

	// 1. Single-pass data retrieval from underlying repositories.
	rawItems, itemFetchError := serviceInstance.itemRepository.List(ctx, normalizedUserID)
	if itemFetchError != nil {
		return domain.DashboardData{}, itemFetchError
	}

	enrichedItems, enrichmentError := enrichItems(rawItems, currentTime)
	if enrichmentError != nil {
		return domain.DashboardData{}, enrichmentError
	}

	userSettings, settingsFetchError := serviceInstance.settingsRepository.GetAll(ctx, normalizedUserID)
	if settingsFetchError != nil {
		return domain.DashboardData{}, settingsFetchError
	}

	var userEquivalents []domain.ValueEquivalent
	if serviceInstance.equivalentRepository != nil {
		fetchedEquivalents, equivalentFetchError := serviceInstance.equivalentRepository.List(ctx, normalizedUserID)
		if equivalentFetchError != nil {
			return domain.DashboardData{}, equivalentFetchError
		}
		userEquivalents = fetchedEquivalents
	}

	// 2. Derive configuration and active items.
	currencyCode := strings.ToUpper(strings.TrimSpace(userSettings["currency"]))
	if currencyCode == "" {
		currencyCode = "USD"
	}

	languagePreference := strings.ToLower(strings.TrimSpace(userSettings["language"]))
	if languagePreference == "" {
		languagePreference = "en"
	}

	var activeItems []domain.Item
	var totalDailyCost float64
	for _, item := range enrichedItems {
		if item.Status == domain.ItemStatusActive {
			activeItems = append(activeItems, item)
			totalDailyCost += item.GrossCostPerDay
		}
	}

	// 3. Assemble shared DashboardContext for provider evaluation.
	dashboardContext := DashboardContext{
		UserID:         normalizedUserID,
		Items:          enrichedItems,
		ActiveItems:    activeItems,
		Equivalents:    userEquivalents,
		Settings:       userSettings,
		Language:       languagePreference,
		CurrencyCode:   currencyCode,
		TotalDailyCost: totalDailyCost,
		Now:            currentTime,
	}

	// 4. Generate eligible insights through registered providers.
	var generatedInsights []domain.DashboardInsight
	for _, provider := range serviceInstance.providers {
		insight, providerError := provider.Generate(ctx, dashboardContext)
		if providerError != nil {
			// Skip problematic provider to preserve home dashboard availability.
			continue
		}
		if insight != nil {
			generatedInsights = append(generatedInsights, *insight)
		}
	}

	// 5. Centralized deterministic ranking and selection (maximum 4 insights).
	sort.SliceStable(generatedInsights, func(firstIndex, secondIndex int) bool {
		firstInsight := generatedInsights[firstIndex]
		secondInsight := generatedInsights[secondIndex]

		if firstInsight.Score != secondInsight.Score {
			return firstInsight.Score > secondInsight.Score
		}
		if firstInsight.Kind != secondInsight.Kind {
			return firstInsight.Kind < secondInsight.Kind
		}
		return firstInsight.Primary < secondInsight.Primary
	})

	return domain.DashboardData{
		TotalDailyCost: totalDailyCost,
		CurrencyCode:   currencyCode,
		Insights:       generatedInsights,
	}, nil
}
