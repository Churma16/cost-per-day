package domain

import "time"

// ItemStatus describes whether an item is still actively owned or has reached the end of its ownership lifecycle.
type ItemStatus string

const (
	ItemStatusActive  ItemStatus = "active"
	ItemStatusRetired ItemStatus = "retired"
	ItemStatusSold    ItemStatus = "sold"
	ItemStatusLost    ItemStatus = "lost"
)

// Item represents an item whose ownership cost is tracked by one user.
// UserID is an internal ownership boundary and is intentionally not exposed in API JSON.
type Item struct {
	ID               string     `json:"id"`
	UserID           string     `json:"-"`
	Name             string     `json:"name"`
	Price            float64    `json:"price"`
	PurchaseDate     string     `json:"purchaseDate"`
	Status           ItemStatus `json:"status"`
	EndedAt          *string    `json:"endedAt,omitempty"`
	SalePrice        *float64   `json:"salePrice,omitempty"`
	OwnershipDays    int        `json:"ownershipDays"`
	GrossCostPerDay  float64    `json:"grossCostPerDay"`
	NetOwnershipCost *float64   `json:"netOwnershipCost,omitempty"`
	NetCostPerDay    *float64   `json:"netCostPerDay,omitempty"`
	CreatedAt        time.Time  `json:"createdAt,omitempty"`
	UpdatedAt        time.Time  `json:"updatedAt,omitempty"`
}
