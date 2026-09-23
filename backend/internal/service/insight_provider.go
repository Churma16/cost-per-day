package service

import (
	"context"
	"fmt"
	"math"
	"time"

	"cost-per-day/backend/internal/domain"
)

// InsightProvider defines the contract for generating one category of dashboard insight.
// Providers return (nil, nil) when their eligibility conditions are not met.
type InsightProvider interface {
	ID() string
	Generate(ctx context.Context, data DashboardContext) (*domain.DashboardInsight, error)
}

// BestValueProvider answers: "Which purchase has been most worth it so far?"
type BestValueProvider struct{}

func (provider *BestValueProvider) ID() string {
	return "best_value"
}

func (provider *BestValueProvider) Generate(_ context.Context, data DashboardContext) (*domain.DashboardInsight, error) {
	if len(data.ActiveItems) == 0 {
		return nil, nil
	}

	var bestItem *domain.Item
	for index := range data.ActiveItems {
		item := &data.ActiveItems[index]
		if item.GrossCostPerDay <= 0 {
			continue
		}
		if bestItem == nil || item.GrossCostPerDay < bestItem.GrossCostPerDay {
			bestItem = item
		}
	}

	if bestItem == nil {
		return nil, nil
	}

	isIndonesian := data.Language == "id"
	eyebrow := "Best Value"
	caption := fmt.Sprintf("Owned for %d days", bestItem.OwnershipDays)
	perDaySuffix := "/day"

	if isIndonesian {
		eyebrow = "Nilai Terbaik"
		caption = fmt.Sprintf("Dimiliki selama %d hari", bestItem.OwnershipDays)
		perDaySuffix = "/hari"
	}

	return &domain.DashboardInsight{
		Kind:      provider.ID(),
		Eyebrow:   eyebrow,
		Primary:   bestItem.Name,
		Secondary: fmt.Sprintf("%s%s", data.FormatCurrency(bestItem.GrossCostPerDay), perDaySuffix),
		Caption:   caption,
		Score:     70,
	}, nil
}

// BiggestContributorProvider answers: "Which item contributes most to my current cost/day?"
type BiggestContributorProvider struct{}

func (provider *BiggestContributorProvider) ID() string {
	return "biggest_contributor"
}

func (provider *BiggestContributorProvider) Generate(_ context.Context, data DashboardContext) (*domain.DashboardInsight, error) {
	if len(data.ActiveItems) < 2 || data.TotalDailyCost <= 0 {
		return nil, nil
	}

	var topItem *domain.Item
	for index := range data.ActiveItems {
		item := &data.ActiveItems[index]
		if topItem == nil || item.GrossCostPerDay > topItem.GrossCostPerDay {
			topItem = item
		}
	}

	if topItem == nil || topItem.GrossCostPerDay <= 0 {
		return nil, nil
	}

	percentage := int(math.Round((topItem.GrossCostPerDay / data.TotalDailyCost) * 100))
	if percentage < 20 {
		return nil, nil
	}

	isIndonesian := data.Language == "id"
	eyebrow := "Biggest Contributor"
	secondary := fmt.Sprintf("%d%% of your current total cost/day", percentage)
	perDaySuffix := "/day"

	if isIndonesian {
		eyebrow = "Kontributor Terbesar"
		secondary = fmt.Sprintf("%d%% dari total biaya/hari Anda", percentage)
		perDaySuffix = "/hari"
	}

	return &domain.DashboardInsight{
		Kind:      provider.ID(),
		Eyebrow:   eyebrow,
		Primary:   topItem.Name,
		Secondary: secondary,
		Caption:   fmt.Sprintf("%s%s", data.FormatCurrency(topItem.GrossCostPerDay), perDaySuffix),
		Score:     65,
	}, nil
}

// MilestoneProvider answers: "What meaningful ownership milestone was reached?"
type MilestoneProvider struct{}

func (provider *MilestoneProvider) ID() string {
	return "milestone"
}

var ownershipMilestones = []struct {
	Days  int
	Label string
	IdLabel string
}{
	{Days: 1000, Label: "1,000 days of ownership", IdLabel: "1.000 hari kepemilikan"},
	{Days: 730, Label: "2 years of ownership", IdLabel: "2 tahun kepemilikan"},
	{Days: 500, Label: "500 days of ownership", IdLabel: "500 hari kepemilikan"},
	{Days: 365, Label: "1 year of ownership", IdLabel: "1 tahun kepemilikan"},
	{Days: 100, Label: "100 days of ownership", IdLabel: "100 hari kepemilikan"},
	{Days: 30, Label: "30 days of ownership", IdLabel: "30 hari kepemilikan"},
}

func (provider *MilestoneProvider) Generate(_ context.Context, data DashboardContext) (*domain.DashboardInsight, error) {
	if len(data.ActiveItems) == 0 {
		return nil, nil
	}

	var bestMilestoneItem *domain.Item
	var bestMilestoneLabel string
	var bestMilestoneIdLabel string
	bestMilestoneDays := 0

	for index := range data.ActiveItems {
		item := &data.ActiveItems[index]
		for _, milestone := range ownershipMilestones {
			// Item reached milestone and is within a recent 30-day window of crossing it
			if item.OwnershipDays >= milestone.Days && item.OwnershipDays <= milestone.Days+30 {
				if milestone.Days > bestMilestoneDays {
					bestMilestoneDays = milestone.Days
					bestMilestoneItem = item
					bestMilestoneLabel = milestone.Label
					bestMilestoneIdLabel = milestone.IdLabel
				}
				break
			}
		}
	}

	if bestMilestoneItem == nil {
		return nil, nil
	}

	isIndonesian := data.Language == "id"
	eyebrow := "Milestone"
	secondary := fmt.Sprintf("Reached %s", bestMilestoneLabel)
	caption := fmt.Sprintf("Now down to %s/day", data.FormatCurrency(bestMilestoneItem.GrossCostPerDay))

	if isIndonesian {
		eyebrow = "Tonggak Kepemilikan"
		secondary = fmt.Sprintf("Mencapai %s", bestMilestoneIdLabel)
		caption = fmt.Sprintf("Kini turun ke %s/hari", data.FormatCurrency(bestMilestoneItem.GrossCostPerDay))
	}

	return &domain.DashboardInsight{
		Kind:      provider.ID(),
		Eyebrow:   eyebrow,
		Primary:   bestMilestoneItem.Name,
		Secondary: secondary,
		Caption:   caption,
		Score:     75,
	}, nil
}

// RecentPurchaseImpactProvider answers: "Why did my total cost/day change sharply after a recent purchase?"
type RecentPurchaseImpactProvider struct{}

func (provider *RecentPurchaseImpactProvider) ID() string {
	return "recent_purchase_impact"
}

func (provider *RecentPurchaseImpactProvider) Generate(_ context.Context, data DashboardContext) (*domain.DashboardInsight, error) {
	if len(data.ActiveItems) < 2 || data.TotalDailyCost <= 0 {
		return nil, nil
	}

	recentThreshold := data.Now.UTC().AddDate(0, 0, -14)
	var impactingItem *domain.Item

	for index := range data.ActiveItems {
		item := &data.ActiveItems[index]
		parsedPurchaseDate, parseError := time.Parse(time.RFC3339, item.PurchaseDate)
		if parseError != nil {
			continue
		}

		if parsedPurchaseDate.After(recentThreshold) || parsedPurchaseDate.Equal(recentThreshold) {
			share := item.GrossCostPerDay / data.TotalDailyCost
			if share >= 0.20 {
				if impactingItem == nil || item.GrossCostPerDay > impactingItem.GrossCostPerDay {
					impactingItem = item
				}
			}
		}
	}

	if impactingItem == nil {
		return nil, nil
	}

	isIndonesian := data.Language == "id"
	eyebrow := "Recent Purchase Impact"
	secondary := "Currently drives most of the increase in cost/day"
	caption := "New purchases start expensive."

	if isIndonesian {
		eyebrow = "Dampak Pembelian Terakhir"
		secondary = "Mendorong sebagian besar kenaikan biaya/hari"
		caption = "Barang baru mulai dengan biaya harian tinggi."
	}

	return &domain.DashboardInsight{
		Kind:      provider.ID(),
		Eyebrow:   eyebrow,
		Primary:   impactingItem.Name,
		Secondary: secondary,
		Caption:   caption,
		Score:     85,
	}, nil
}

// OwnershipCostTrendProvider answers: "Are the things I already own becoming cheaper per day as I keep using them, and what caused any meaningful jump?"
// It computes comparison metrics strictly on demand without snapshot tables.
// Ownership-cost decreases are never framed as "saved money" or "reduced spending".
type OwnershipCostTrendProvider struct{}

func (provider *OwnershipCostTrendProvider) ID() string {
	return "ownership_cost_trend"
}

func (provider *OwnershipCostTrendProvider) Generate(_ context.Context, data DashboardContext) (*domain.DashboardInsight, error) {
	if len(data.Items) == 0 || data.TotalDailyCost <= 0 {
		return nil, nil
	}

	comparisonDate := data.Now.UTC().AddDate(0, 0, -30)
	var priorDailyCost float64
	var priorActiveCount int
	var newlyAddedHighestCostItem *domain.Item

	for index := range data.Items {
		item := &data.Items[index]
		parsedPurchaseDate, parseError := time.Parse(time.RFC3339, item.PurchaseDate)
		if parseError != nil {
			continue
		}

		// Was the item purchased on or before the comparison date?
		if !parsedPurchaseDate.After(comparisonDate) {
			// Was it active as of the comparison date?
			isActiveAtComparison := true
			if item.Status != domain.ItemStatusActive && item.EndedAt != nil {
				if parsedEndDate, endError := time.Parse(time.RFC3339, *item.EndedAt); endError == nil {
					if parsedEndDate.Before(comparisonDate) {
						isActiveAtComparison = false
					}
				}
			}

			if isActiveAtComparison {
				priorActiveCount++
				daysAsOfComparison := int(math.Ceil(comparisonDate.Sub(parsedPurchaseDate).Hours() / 24))
				if daysAsOfComparison < 1 {
					daysAsOfComparison = 1
				}
				priorDailyCost += item.Price / float64(daysAsOfComparison)
			}
		} else {
			// Item was purchased within the last 30 days
			if item.Status == domain.ItemStatusActive {
				if newlyAddedHighestCostItem == nil || item.GrossCostPerDay > newlyAddedHighestCostItem.GrossCostPerDay {
					newlyAddedHighestCostItem = item
				}
			}
		}
	}

	if priorDailyCost <= 0 || priorActiveCount == 0 {
		return nil, nil
	}

	delta := data.TotalDailyCost - priorDailyCost
	relativeChange := math.Abs(delta) / priorDailyCost

	// Routine tiny day-to-day movement (< 5%) does not consume a carousel slot
	if relativeChange < 0.05 {
		return nil, nil
	}

	isIndonesian := data.Language == "id"
	eyebrow := "Ownership Cost Trend"
	if isIndonesian {
		eyebrow = "Tren Biaya Kepemilikan"
	}

	if delta < 0 {
		// Collection became cheaper to own over the comparison period
		decreaseAmount := math.Abs(delta)
		primary := "Your collection is getting cheaper to own"
		secondary := fmt.Sprintf("down %s/day over the last 30 days", data.FormatCurrency(decreaseAmount))
		caption := "Your purchases are earning their keep over time."

		if isIndonesian {
			primary = "Koleksi Anda semakin terjangkau per hari"
			secondary = fmt.Sprintf("turun %s/hari selama 30 hari terakhir", data.FormatCurrency(decreaseAmount))
			caption = "Barang Anda semakin bernilai seiring waktu pemakaian."
		}

		return &domain.DashboardInsight{
			Kind:      provider.ID(),
			Eyebrow:   eyebrow,
			Primary:   primary,
			Secondary: secondary,
			Caption:   caption,
			Score:     80,
		}, nil
	}

	// Cost increased, attribute to newly added item if possible
	primary := "Your ownership cost increased"
	var secondary string
	if newlyAddedHighestCostItem != nil {
		secondary = fmt.Sprintf("up after adding %s", newlyAddedHighestCostItem.Name)
	} else {
		secondary = fmt.Sprintf("up %s/day over the last 30 days", data.FormatCurrency(delta))
	}
	caption := "New purchases start expensive."

	if isIndonesian {
		primary = "Biaya kepemilikan Anda meningkat"
		if newlyAddedHighestCostItem != nil {
			secondary = fmt.Sprintf("naik setelah menambah %s", newlyAddedHighestCostItem.Name)
		} else {
			secondary = fmt.Sprintf("naik %s/hari selama 30 hari terakhir", data.FormatCurrency(delta))
		}
		caption = "Barang baru mulai dengan biaya harian tinggi."
	}

	return &domain.DashboardInsight{
		Kind:      provider.ID(),
		Eyebrow:   eyebrow,
		Primary:   primary,
		Secondary: secondary,
		Caption:   caption,
		Score:     80,
	}, nil
}

// EquivalentProvider answers: "What does this number feel like in familiar real-world terms?"
type EquivalentProvider struct{}

func (provider *EquivalentProvider) ID() string {
	return "equivalent"
}

func (provider *EquivalentProvider) Generate(_ context.Context, data DashboardContext) (*domain.DashboardInsight, error) {
	if len(data.Equivalents) == 0 || data.TotalDailyCost <= 0 {
		return nil, nil
	}

	// Find the equivalent with best relatable ratio (closest to 1.0, within 0.2 to 20.0)
	var bestEquivalent *domain.ValueEquivalent
	var bestRatio float64
	bestDistance := math.MaxFloat64

	for index := range data.Equivalents {
		equivalent := &data.Equivalents[index]
		if equivalent.Amount <= 0 {
			continue
		}

		ratio := data.TotalDailyCost / equivalent.Amount
		if ratio >= 0.2 && ratio <= 20.0 {
			distance := math.Abs(math.Log(ratio))
			if distance < bestDistance {
				bestDistance = distance
				bestRatio = ratio
				bestEquivalent = equivalent
			}
		}
	}

	if bestEquivalent == nil {
		return nil, nil
	}

	isIndonesian := data.Language == "id"
	eyebrow := "Daily Equivalent"
	caption := "Based on your custom equivalents"
	perDayAcross := "/day across your collection"

	if isIndonesian {
		eyebrow = "Setara Nilai Harian"
		caption = "Berdasarkan pembanding kustom Anda"
		perDayAcross = "/hari di seluruh koleksi Anda"
	}

	var ratioString string
	if math.Abs(bestRatio-math.Round(bestRatio)) < 0.05 {
		ratioString = fmt.Sprintf("≈ %dx %s", int(math.Round(bestRatio)), bestEquivalent.Name)
	} else {
		ratioString = fmt.Sprintf("≈ %.1fx %s", bestRatio, bestEquivalent.Name)
	}

	return &domain.DashboardInsight{
		Kind:      provider.ID(),
		Eyebrow:   eyebrow,
		Primary:   ratioString,
		Secondary: fmt.Sprintf("%s%s", data.FormatCurrency(data.TotalDailyCost), perDayAcross),
		Caption:   caption,
		Score:     55,
	}, nil
}

// PortfolioMilestoneProvider answers: "Did my collection cross a meaningful threshold?"
type PortfolioMilestoneProvider struct{}

func (provider *PortfolioMilestoneProvider) ID() string {
	return "portfolio_milestone"
}

var portfolioCountMilestones = []int{50, 25, 10, 5}

func (provider *PortfolioMilestoneProvider) Generate(_ context.Context, data DashboardContext) (*domain.DashboardInsight, error) {
	activeCount := len(data.ActiveItems)
	if activeCount < 5 {
		return nil, nil
	}

	matchedMilestone := 0
	for _, milestone := range portfolioCountMilestones {
		if activeCount >= milestone {
			matchedMilestone = milestone
			break
		}
	}

	if matchedMilestone == 0 {
		return nil, nil
	}

	isIndonesian := data.Language == "id"
	eyebrow := "Collection Milestone"
	primary := fmt.Sprintf("%d Items Tracked", matchedMilestone)
	secondary := "Active items in your collection"
	caption := "Tracking ownership builds mindful spending habits."

	if isIndonesian {
		eyebrow = "Tonggak Koleksi"
		primary = fmt.Sprintf("%d Barang Dilacak", matchedMilestone)
		secondary = "Barang aktif dalam koleksi Anda"
		caption = "Melacak kepemilikan membangun kebiasaan belanja yang bijak."
	}

	return &domain.DashboardInsight{
		Kind:      provider.ID(),
		Eyebrow:   eyebrow,
		Primary:   primary,
		Secondary: secondary,
		Caption:   caption,
		Score:     50,
	}, nil
}
