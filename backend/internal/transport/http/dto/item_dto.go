package dto

// CreateItemRequestDTO represents the incoming JSON payload to create a new item.
type CreateItemRequestDTO struct {
	Name         string   `json:"name"`
	Price        float64  `json:"price"`
	PurchaseDate string   `json:"purchaseDate"`
	TargetType   *string  `json:"targetType"`
	TargetValue  *float64 `json:"targetValue"`
}

// UpdateItemRequestDTO represents the incoming JSON payload to update an existing item and its lifecycle.
type UpdateItemRequestDTO struct {
	Name         string   `json:"name"`
	Price        float64  `json:"price"`
	PurchaseDate string   `json:"purchaseDate"`
	Status       string   `json:"status"`
	EndedAt      *string  `json:"endedAt"`
	SalePrice    *float64 `json:"salePrice"`
	TargetType   *string  `json:"targetType"`
	TargetValue  *float64 `json:"targetValue"`
}

// ReplacementBenchmarkResponseDTO represents the JSON payload returned by GET /api/items/:id/replacement-benchmark.
type ReplacementBenchmarkResponseDTO struct {
	ItemID              string   `json:"itemId"`
	ItemName            string   `json:"itemName"`
	ItemStatus          string   `json:"itemStatus"`
	PreviousPrice       float64  `json:"previousPrice"`
	FinalOwnershipDays  int      `json:"finalOwnershipDays"`
	FinalCostPerDay     float64  `json:"finalCostPerDay"`
	CandidatePrice      float64  `json:"candidatePrice"`
	DaysToMatchPrevious *int     `json:"daysToMatchPrevious"`
	DaysToBeatPrevious  *int     `json:"daysToBeatPrevious"`
	HasTarget           bool     `json:"hasTarget"`
	TargetCostPerDay    *float64 `json:"targetCostPerDay,omitempty"`
	DaysToMatchTarget   *int     `json:"daysToMatchTarget,omitempty"`
}
