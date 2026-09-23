package domain

import "time"

// ValueEquivalent represents a user-defined spending benchmark (e.g. coffee, lunch)
// used to translate cost-per-day amounts into human-relatable everyday terms.
// UserID is an internal ownership boundary and is intentionally not exposed in API JSON.
type ValueEquivalent struct {
	ID           string    `json:"id"`
	UserID       string    `json:"-"`
	Name         string    `json:"name"`
	Amount       float64   `json:"amount"`
	CurrencyCode string    `json:"currencyCode"`
	CreatedAt    time.Time `json:"createdAt,omitempty"`
	UpdatedAt    time.Time `json:"updatedAt,omitempty"`
}
