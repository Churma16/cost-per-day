package domain

// DurabilityItemEvidence represents individual item evidence behind a durability insight.
type DurabilityItemEvidence struct {
	ID                 string     `json:"id"`
	Name               string     `json:"name"`
	Status             ItemStatus `json:"status"`
	Price              float64    `json:"price"`
	PurchaseDate       string     `json:"purchaseDate"`
	EndedAt            string     `json:"endedAt"`
	OwnershipDays      int        `json:"ownershipDays"`
	FinalGrossCostDay  float64    `json:"finalGrossCostPerDay"`
	FinalNetCostDay    *float64   `json:"finalNetCostPerDay,omitempty"`
	FinalCostPerDay    float64    `json:"finalCostPerDay"`
}

// BrandDurabilityInsight summarizes durability and ownership economics for a brand within a specific category.
type BrandDurabilityInsight struct {
	Brand                       string                   `json:"brand"`
	BrandID                     *int64                   `json:"brandId,omitempty"`
	Category                    string                   `json:"category"`
	CategoryID                  *int64                   `json:"categoryId,omitempty"`
	CompletedCount              int                      `json:"completedCount"`
	SampleSize                  int                      `json:"sampleSize"`
	IsPattern                   bool                     `json:"isPattern"`
	AverageLifetimeDays         float64                  `json:"averageLifetimeDays"`
	MedianLifetimeDays          float64                  `json:"medianLifetimeDays"`
	AverageFinalCostPerDay      float64                  `json:"averageFinalCostPerDay"`
	MedianFinalCostPerDay       float64                  `json:"medianFinalCostPerDay"`
	AverageFinalGrossCostPerDay float64                  `json:"averageFinalGrossCostPerDay"`
	AverageFinalNetCostPerDay   float64                  `json:"averageFinalNetCostPerDay"`
	TotalSpent                  float64                  `json:"totalSpent"`
	ObservationText             string                   `json:"observationText"`
	Items                       []DurabilityItemEvidence `json:"items"`
}

// CategoryDurabilityInsight aggregates durability and brand performance across a product category.
type CategoryDurabilityInsight struct {
	Category                        string                   `json:"category"`
	CategoryID                      *int64                   `json:"categoryId,omitempty"`
	CompletedCount                  int                      `json:"completedCount"`
	AverageLifetimeDays             float64                  `json:"averageLifetimeDays"`
	MedianLifetimeDays              float64                  `json:"medianLifetimeDays"`
	AverageFinalCostPerDay          float64                  `json:"averageFinalCostPerDay"`
	MedianFinalCostPerDay           float64                  `json:"medianFinalCostPerDay"`
	TypicalReplacementIntervalDays  *float64                 `json:"typicalReplacementIntervalDays,omitempty"`
	LongestLastingBrand             *string                  `json:"longestLastingBrand,omitempty"`
	LowestCostBrand                 *string                  `json:"lowestCostBrand,omitempty"`
	ComparisonSummaryText           string                   `json:"comparisonSummaryText,omitempty"`
	Brands                          []BrandDurabilityInsight `json:"brands"`
}

// FrequentlyReplacedCategory captures the category with the highest replacement frequency.
type FrequentlyReplacedCategory struct {
	Category                       string   `json:"category"`
	CompletedCount                 int      `json:"completedCount"`
	TypicalReplacementIntervalDays *float64 `json:"typicalReplacementIntervalDays,omitempty"`
}

// DurabilityAnalytics represents the top-level personal durability and ownership analytics.
type DurabilityAnalytics struct {
	TotalCompletedItems             int                          `json:"totalCompletedItems"`
	TotalCategorizedCompletedItems  int                          `json:"totalCategorizedCompletedItems"`
	MostFrequentlyReplacedCategory  *FrequentlyReplacedCategory  `json:"mostFrequentlyReplacedCategory,omitempty"`
	Categories                      []CategoryDurabilityInsight  `json:"categories"`
}
