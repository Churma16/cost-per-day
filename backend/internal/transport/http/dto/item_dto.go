package dto

// CreateItemRequestDTO represents the incoming JSON payload to create a new item.
type CreateItemRequestDTO struct {
	Name         string  `json:"name"`
	Price        float64 `json:"price"`
	PurchaseDate string  `json:"purchaseDate"`
}

// UpdateItemRequestDTO represents the incoming JSON payload to update an existing item.
type UpdateItemRequestDTO struct {
	Name         string  `json:"name"`
	Price        float64 `json:"price"`
	PurchaseDate string  `json:"purchaseDate"`
}
