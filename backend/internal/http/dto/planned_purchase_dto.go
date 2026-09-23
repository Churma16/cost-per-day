package dto

// CreatePlannedPurchaseRequestDTO represents the incoming JSON payload to create a planned purchase.
type CreatePlannedPurchaseRequestDTO struct {
	Name                string   `json:"name"`
	TargetPrice         float64  `json:"targetPrice"`
	CurrencyCode        string   `json:"currencyCode"`
	TargetDate          *string  `json:"targetDate,omitempty"`
	ContributionAmount  *float64 `json:"contributionAmount,omitempty"`
	ContributionCadence *string  `json:"contributionCadence,omitempty"`
}

// UpdatePlannedPurchaseRequestDTO represents the incoming JSON payload to update an existing planned purchase.
type UpdatePlannedPurchaseRequestDTO struct {
	Name                string   `json:"name"`
	TargetPrice         float64  `json:"targetPrice"`
	CurrencyCode        string   `json:"currencyCode"`
	TargetDate          *string  `json:"targetDate,omitempty"`
	ContributionAmount  *float64 `json:"contributionAmount,omitempty"`
	ContributionCadence *string  `json:"contributionCadence,omitempty"`
}
