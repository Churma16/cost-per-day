package service

import (
	"context"
	"math"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// PlannedPurchaseService defines application operations for user-owned planned purchases.
type PlannedPurchaseService interface {
	ListPlannedPurchases(ctx context.Context, userID string) ([]domain.PlannedPurchase, error)
	GetPlannedPurchaseByID(ctx context.Context, userID string, id string) (domain.PlannedPurchase, error)
	CreatePlannedPurchase(ctx context.Context, userID string, candidate domain.PlannedPurchase) (domain.PlannedPurchase, error)
	UpdatePlannedPurchase(ctx context.Context, userID string, candidate domain.PlannedPurchase) (domain.PlannedPurchase, error)
	DeletePlannedPurchase(ctx context.Context, userID string, id string) error
}

type plannedPurchaseServiceImpl struct {
	plannedPurchaseRepository repository.PlannedPurchaseRepository
	nowProvider               func() time.Time
}

// NewPlannedPurchaseService creates a new PlannedPurchaseService instance.
func NewPlannedPurchaseService(plannedPurchaseRepository repository.PlannedPurchaseRepository) PlannedPurchaseService {
	return NewPlannedPurchaseServiceWithClock(plannedPurchaseRepository, time.Now)
}

// NewPlannedPurchaseServiceWithClock creates a PlannedPurchaseService instance with custom time provider for testing.
func NewPlannedPurchaseServiceWithClock(plannedPurchaseRepository repository.PlannedPurchaseRepository, nowProvider func() time.Time) PlannedPurchaseService {
	if nowProvider == nil {
		nowProvider = time.Now
	}
	return &plannedPurchaseServiceImpl{
		plannedPurchaseRepository: plannedPurchaseRepository,
		nowProvider:               nowProvider,
	}
}

// ListPlannedPurchases retrieves only the current user's planned purchases enriched with calculation framing.
func (serviceInstance *plannedPurchaseServiceImpl) ListPlannedPurchases(ctx context.Context, userID string) ([]domain.PlannedPurchase, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	persistedPurchases, repositoryError := serviceInstance.plannedPurchaseRepository.List(ctx, normalizedUserID)
	if repositoryError != nil {
		return nil, repositoryError
	}

	currentTime := serviceInstance.nowProvider().UTC()
	enrichedPurchases := make([]domain.PlannedPurchase, 0, len(persistedPurchases))
	for _, purchase := range persistedPurchases {
		enrichedPurchases = append(enrichedPurchases, enrichPlannedPurchase(purchase, currentTime))
	}

	return enrichedPurchases, nil
}

// GetPlannedPurchaseByID retrieves one planned purchase only when owned by the current user.
func (serviceInstance *plannedPurchaseServiceImpl) GetPlannedPurchaseByID(ctx context.Context, userID string, id string) (domain.PlannedPurchase, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.PlannedPurchase{}, identityError
	}

	trimmedID := strings.TrimSpace(id)
	if trimmedID == "" {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}

	persistedPurchase, repositoryError := serviceInstance.plannedPurchaseRepository.GetByID(ctx, normalizedUserID, trimmedID)
	if repositoryError != nil {
		return domain.PlannedPurchase{}, repositoryError
	}

	currentTime := serviceInstance.nowProvider().UTC()
	return enrichPlannedPurchase(persistedPurchase, currentTime), nil
}

// CreatePlannedPurchase validates inputs, persists, and returns enriched planned purchase.
func (serviceInstance *plannedPurchaseServiceImpl) CreatePlannedPurchase(ctx context.Context, userID string, candidate domain.PlannedPurchase) (domain.PlannedPurchase, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.PlannedPurchase{}, identityError
	}

	currentTime := serviceInstance.nowProvider().UTC()
	validatedPurchase, validationError := validatePlannedPurchase(candidate, currentTime)
	if validationError != nil {
		return domain.PlannedPurchase{}, validationError
	}

	createdPurchase, repositoryError := serviceInstance.plannedPurchaseRepository.Create(ctx, normalizedUserID, validatedPurchase)
	if repositoryError != nil {
		return domain.PlannedPurchase{}, repositoryError
	}

	return enrichPlannedPurchase(createdPurchase, currentTime), nil
}

// UpdatePlannedPurchase validates inputs and updates an existing planned purchase owned by the current user.
func (serviceInstance *plannedPurchaseServiceImpl) UpdatePlannedPurchase(ctx context.Context, userID string, candidate domain.PlannedPurchase) (domain.PlannedPurchase, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.PlannedPurchase{}, identityError
	}

	trimmedID := strings.TrimSpace(candidate.ID)
	if trimmedID == "" {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}

	currentTime := serviceInstance.nowProvider().UTC()
	validatedPurchase, validationError := validatePlannedPurchase(candidate, currentTime)
	if validationError != nil {
		return domain.PlannedPurchase{}, validationError
	}
	validatedPurchase.ID = trimmedID

	updatedPurchase, repositoryError := serviceInstance.plannedPurchaseRepository.Update(ctx, normalizedUserID, validatedPurchase)
	if repositoryError != nil {
		return domain.PlannedPurchase{}, repositoryError
	}

	return enrichPlannedPurchase(updatedPurchase, currentTime), nil
}

// DeletePlannedPurchase removes a planned purchase only when owned by the current user.
func (serviceInstance *plannedPurchaseServiceImpl) DeletePlannedPurchase(ctx context.Context, userID string, id string) error {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return identityError
	}

	trimmedID := strings.TrimSpace(id)
	if trimmedID == "" {
		return domain.ErrPlannedPurchaseNotFound
	}

	return serviceInstance.plannedPurchaseRepository.Delete(ctx, normalizedUserID, trimmedID)
}

func validatePlannedPurchase(candidate domain.PlannedPurchase, asOf time.Time) (domain.PlannedPurchase, error) {
	trimmedName := strings.TrimSpace(candidate.Name)
	if trimmedName == "" {
		return domain.PlannedPurchase{}, domain.ErrEmptyPlannedPurchaseName
	}

	if candidate.TargetPrice <= 0 || math.IsNaN(candidate.TargetPrice) || math.IsInf(candidate.TargetPrice, 0) {
		return domain.PlannedPurchase{}, domain.ErrInvalidPlannedPurchasePrice
	}

	scaledPrice := candidate.TargetPrice * float64(itemPricePrecisionScale)
	if scaledPrice >= float64(math.MaxInt64) || math.Round(scaledPrice) <= 0 {
		return domain.PlannedPurchase{}, domain.ErrUnsupportedPlannedPurchasePrice
	}
	normalizedTargetPrice := math.Round(scaledPrice) / float64(itemPricePrecisionScale)

	normalizedCurrency := strings.ToUpper(strings.TrimSpace(candidate.CurrencyCode))
	if !supportedCurrencies[normalizedCurrency] {
		return domain.PlannedPurchase{}, domain.ErrInvalidPlannedPurchaseCurrency
	}

	var validatedTargetDate *string
	if candidate.TargetDate != nil && strings.TrimSpace(*candidate.TargetDate) != "" {
		trimmedDateString := strings.TrimSpace(*candidate.TargetDate)
		parsedTargetDate, parseDateError := parseItemDate(trimmedDateString)
		if parseDateError != nil {
			return domain.PlannedPurchase{}, domain.ErrInvalidTargetDate
		}
		if !isAfterUTCDate(parsedTargetDate, asOf) {
			return domain.PlannedPurchase{}, domain.ErrInvalidTargetDate
		}
		formattedDate := parsedTargetDate.Format("2006-01-02")
		validatedTargetDate = &formattedDate
	}

	var validatedContributionAmount *float64
	var validatedCadence *domain.ContributionCadence

	hasContributionAmount := candidate.ContributionAmount != nil && *candidate.ContributionAmount > 0
	hasContributionCadence := candidate.ContributionCadence != nil && strings.TrimSpace(string(*candidate.ContributionCadence)) != ""

	if candidate.ContributionAmount != nil {
		if *candidate.ContributionAmount <= 0 || math.IsNaN(*candidate.ContributionAmount) || math.IsInf(*candidate.ContributionAmount, 0) {
			return domain.PlannedPurchase{}, domain.ErrInvalidContributionAmount
		}
		scaledContribution := *candidate.ContributionAmount * float64(itemPricePrecisionScale)
		if scaledContribution >= float64(math.MaxInt64) || math.Round(scaledContribution) <= 0 {
			return domain.PlannedPurchase{}, domain.ErrUnsupportedContributionAmount
		}
		if !hasContributionCadence {
			return domain.PlannedPurchase{}, domain.ErrMissingContributionCadence
		}
		normalizedContributionAmount := math.Round(scaledContribution) / float64(itemPricePrecisionScale)
		validatedContributionAmount = &normalizedContributionAmount
	}

	if candidate.ContributionCadence != nil {
		cadenceString := strings.ToLower(strings.TrimSpace(string(*candidate.ContributionCadence)))
		if cadenceString != "" {
			switch cadenceString {
			case string(domain.ContributionCadenceDaily), string(domain.ContributionCadenceWeekly), string(domain.ContributionCadenceMonthly):
				if !hasContributionAmount {
					return domain.PlannedPurchase{}, domain.ErrMissingContributionAmount
				}
				cadence := domain.ContributionCadence(cadenceString)
				validatedCadence = &cadence
			default:
				return domain.PlannedPurchase{}, domain.ErrInvalidContributionCadence
			}
		}
	}

	return domain.PlannedPurchase{
		ID:                  candidate.ID,
		Name:                trimmedName,
		TargetPrice:         normalizedTargetPrice,
		CurrencyCode:        normalizedCurrency,
		TargetDate:          validatedTargetDate,
		ContributionAmount:  validatedContributionAmount,
		ContributionCadence: validatedCadence,
	}, nil
}

func enrichPlannedPurchase(purchase domain.PlannedPurchase, asOf time.Time) domain.PlannedPurchase {
	enriched := purchase

	// Direction 1: Contribution -> Estimated Time
	if enriched.ContributionAmount != nil && *enriched.ContributionAmount > 0 && enriched.ContributionCadence != nil {
		periodsRequired := math.Ceil(enriched.TargetPrice / *enriched.ContributionAmount)
		enriched.EstimatedPeriods = &periodsRequired

		var estimatedDays int
		switch *enriched.ContributionCadence {
		case domain.ContributionCadenceDaily:
			estimatedDays = int(periodsRequired)
		case domain.ContributionCadenceWeekly:
			estimatedDays = int(periodsRequired * 7.0)
		case domain.ContributionCadenceMonthly:
			estimatedDays = int(math.Round(periodsRequired * (365.0 / 12.0)))
		}
		enriched.EstimatedDays = &estimatedDays
	}

	// Direction 2: Target Date -> Required Contribution
	if enriched.TargetDate != nil && strings.TrimSpace(*enriched.TargetDate) != "" {
		if parsedDate, parseError := parseItemDate(strings.TrimSpace(*enriched.TargetDate)); parseError == nil {
			targetDateUTC := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, time.UTC)
			asOfDateUTC := time.Date(asOf.Year(), asOf.Month(), asOf.Day(), 0, 0, 0, 0, time.UTC)

			daysRemaining := int(math.Ceil(targetDateUTC.Sub(asOfDateUTC).Hours() / 24.0))
			if daysRemaining < 1 {
				daysRemaining = 1
			}

			requiredDaily := enriched.TargetPrice / float64(daysRemaining)
			requiredWeekly := requiredDaily * 7.0
			requiredMonthly := requiredDaily * (365.0 / 12.0)

			enriched.RequiredDailyContribution = &requiredDaily
			enriched.RequiredWeeklyContribution = &requiredWeekly
			enriched.RequiredMonthlyContribution = &requiredMonthly
		}
	}

	return enriched
}
