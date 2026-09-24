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

// OwnershipTargetType defines how an ownership target was configured by the user.
type OwnershipTargetType string

const (
	OwnershipTargetTypeCostPerDay OwnershipTargetType = "cost_per_day"
	OwnershipTargetTypeDuration   OwnershipTargetType = "duration"
)

// Item represents an item whose ownership cost is tracked by one user.
// UserID is an internal ownership boundary and is intentionally not exposed in API JSON.
type Item struct {
	ID               string               `json:"id"`
	UserID           string               `json:"-"`
	Name             string               `json:"name"`
	Price            float64              `json:"price"`
	PurchaseDate     string               `json:"purchaseDate"`
	Status           ItemStatus           `json:"status"`
	EndedAt          *string              `json:"endedAt,omitempty"`
	SalePrice        *float64             `json:"salePrice,omitempty"`
	OwnershipDays    int                  `json:"ownershipDays"`
	GrossCostPerDay  float64              `json:"grossCostPerDay"`
	NetOwnershipCost *float64             `json:"netOwnershipCost,omitempty"`
	NetCostPerDay    *float64             `json:"netCostPerDay,omitempty"`
	TargetType       *OwnershipTargetType `json:"targetType,omitempty"`
	TargetValue      *float64             `json:"targetValue,omitempty"`
	TargetCostPerDay   *float64           `json:"targetCostPerDay,omitempty"`
	TargetDurationDays *int               `json:"targetDurationDays,omitempty"`
	RemainingDays      *int               `json:"remainingDays,omitempty"`
	DaysBeyond         *int               `json:"daysBeyond,omitempty"`
	ProgressPercentage *float64           `json:"progressPercentage,omitempty"`
	TargetReached      *bool              `json:"targetReached,omitempty"`
	TargetState        *string            `json:"targetState,omitempty"`
	CategoryID         *int64             `json:"categoryId,omitempty"`
	Category           *string            `json:"category,omitempty"`
	BrandID            *int64             `json:"brandId,omitempty"`
	Brand              *string            `json:"brand,omitempty"`
	CreatedAt        time.Time            `json:"createdAt,omitempty"`
	UpdatedAt        time.Time            `json:"updatedAt,omitempty"`
}

// ReplacementBenchmark captures the comparison between a prospective replacement item
// and a completed historical item's final ownership economics.
type ReplacementBenchmark struct {
	ItemID              string   `json:"itemId"`
	ItemName            string   `json:"itemName"`
	ItemStatus          ItemStatus `json:"itemStatus"`
	PreviousPrice       float64  `json:"previousPrice"`
	FinalOwnershipDays  int      `json:"finalOwnershipDays"`
	FinalCostPerDay     float64  `json:"finalCostPerDay"`
	CandidatePrice      float64  `json:"candidatePrice"`
	DaysToMatchPrevious *int     `json:"daysToMatchPrevious"`
	DaysToBeatPrevious  *int     `json:"daysToBeatPrevious"`
	HasTarget           bool     `json:"hasTarget"`
	TargetCostPerDay    *float64   `json:"targetCostPerDay,omitempty"`
	DaysToMatchTarget   *int       `json:"daysToMatchTarget,omitempty"`
	IsUnmatchable       bool       `json:"isUnmatchable"`
	UnmatchableReason   *string    `json:"unmatchableReason,omitempty"`
}

