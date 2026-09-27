package dto

// GuestMigrationItemDTO contains only client-owned item fields accepted during guest migration.
type GuestMigrationItemDTO struct {
	Name         string   `json:"name"`
	Price        float64  `json:"price"`
	PurchaseDate string   `json:"purchaseDate"`
	Status       string   `json:"status"`
	EndedAt      *string  `json:"endedAt,omitempty"`
	SalePrice    *float64 `json:"salePrice,omitempty"`
	Category     *string  `json:"category,omitempty"`
	Brand        *string  `json:"brand,omitempty"`
	TargetType   *string  `json:"targetType,omitempty"`
	TargetValue  *float64 `json:"targetValue,omitempty"`
}

// GuestMigrationPlannedPurchaseDTO contains only client-owned planned purchase fields.
type GuestMigrationPlannedPurchaseDTO struct {
	Name                string   `json:"name"`
	TargetPrice         float64  `json:"targetPrice"`
	CurrencyCode        string   `json:"currencyCode"`
	TargetDate          *string  `json:"targetDate,omitempty"`
	ContributionAmount  *float64 `json:"contributionAmount,omitempty"`
	ContributionCadence *string  `json:"contributionCadence,omitempty"`
}

// GuestMigrationRequestDTO is the authenticated import request for one local guest dataset.
type GuestMigrationRequestDTO struct {
	MigrationID      string                             `json:"migrationId"`
	Items            []GuestMigrationItemDTO            `json:"items"`
	PlannedPurchases []GuestMigrationPlannedPurchaseDTO `json:"plannedPurchases"`
}
