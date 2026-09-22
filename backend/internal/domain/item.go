package domain

import "time"

// Item represents an item whose daily cost is tracked by the user.
type Item struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Price        float64   `json:"price"`
	PurchaseDate string    `json:"purchaseDate"`
	CreatedAt    time.Time `json:"createdAt,omitempty"`
	UpdatedAt    time.Time `json:"updatedAt,omitempty"`
}
