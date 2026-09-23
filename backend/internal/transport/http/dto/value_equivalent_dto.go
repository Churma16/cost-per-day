package dto

// CreateValueEquivalentRequestDTO represents the incoming JSON payload to create a new value equivalent.
type CreateValueEquivalentRequestDTO struct {
	Name         string  `json:"name"`
	Amount       float64 `json:"amount"`
	CurrencyCode string  `json:"currencyCode"`
}

// UpdateValueEquivalentRequestDTO represents the incoming JSON payload to update an existing value equivalent.
type UpdateValueEquivalentRequestDTO struct {
	Name         string  `json:"name"`
	Amount       float64 `json:"amount"`
	CurrencyCode string  `json:"currencyCode"`
}
