package domain

// DashboardInsight represents a single contextual interpretation card displayed in the home hero carousel.
type DashboardInsight struct {
	Kind      string `json:"kind"`
	Eyebrow   string `json:"eyebrow"`
	Primary   string `json:"primary"`
	Secondary string `json:"secondary"`
	Caption   string `json:"caption"`
	Score     int    `json:"-"`
}

// DashboardData contains aggregated home screen overview metrics and ranked hero carousel insights.
type DashboardData struct {
	TotalDailyCost float64            `json:"totalDailyCost"`
	CurrencyCode   string             `json:"currencyCode"`
	Insights       []DashboardInsight `json:"insights"`
}
