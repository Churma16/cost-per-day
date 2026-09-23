package dto

// ReplaceItemRequestDTO represents one item in a full collection replacement.
type ReplaceItemRequestDTO struct {
	Name         string   `json:"name"`
	Price        float64  `json:"price"`
	PurchaseDate string   `json:"purchaseDate"`
	Status       string   `json:"status"`
	EndedAt      *string  `json:"endedAt"`
	SalePrice    *float64 `json:"salePrice"`
	TargetType   *string  `json:"targetType"`
	TargetValue  *float64 `json:"targetValue"`
}

// ReplaceItemsRequestDTO represents the incoming JSON payload for replacing all items.
type ReplaceItemsRequestDTO []ReplaceItemRequestDTO
