package domain

import "time"

// ContributionCadence defines the supported recurring frequencies for planned purchase contributions.
type ContributionCadence string

const (
	ContributionCadenceDaily   ContributionCadence = "daily"
	ContributionCadenceWeekly  ContributionCadence = "weekly"
	ContributionCadenceMonthly ContributionCadence = "monthly"
)

// PlannedPurchase represents a prospective purchase framed through price and time.
// UserID is an internal ownership boundary and is intentionally not exposed in API JSON.
type PlannedPurchase struct {
	ID                  string               `json:"id"`
	UserID              string               `json:"-"`
	Name                string               `json:"name"`
	TargetPrice         float64              `json:"targetPrice"`
	CurrencyCode        string               `json:"currencyCode"`
	TargetDate          *string              `json:"targetDate,omitempty"`
	ContributionAmount  *float64             `json:"contributionAmount,omitempty"`
	ContributionCadence *ContributionCadence `json:"contributionCadence,omitempty"`

	// Derived calculations populated on demand:
	EstimatedPeriods            *float64 `json:"estimatedPeriods,omitempty"`
	EstimatedDays               *int     `json:"estimatedDays,omitempty"`
	RequiredDailyContribution   *float64 `json:"requiredDailyContribution,omitempty"`
	RequiredWeeklyContribution  *float64 `json:"requiredWeeklyContribution,omitempty"`
	RequiredMonthlyContribution *float64 `json:"requiredMonthlyContribution,omitempty"`

	CreatedAt time.Time `json:"createdAt,omitempty"`
	UpdatedAt time.Time `json:"updatedAt,omitempty"`
}
