package service

import (
	"context"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// PlannedPurchaseConversionService bridges planning into normal ownership.
type PlannedPurchaseConversionService interface {
	ConvertPlannedPurchase(
		ctx context.Context,
		userID string,
		plannedPurchaseID string,
		purchasePrice float64,
		currencyCode string,
		purchaseDate string,
	) (domain.Item, error)
}

type plannedPurchaseConversionServiceImpl struct {
	plannedPurchaseRepository repository.PlannedPurchaseRepository
	conversionRepository      repository.PlannedPurchaseConversionRepository
	nowProvider               func() time.Time
}

// NewPlannedPurchaseConversionService creates the conversion use case.
func NewPlannedPurchaseConversionService(
	plannedPurchaseRepository repository.PlannedPurchaseRepository,
	conversionRepository repository.PlannedPurchaseConversionRepository,
) PlannedPurchaseConversionService {
	return NewPlannedPurchaseConversionServiceWithClock(
		plannedPurchaseRepository,
		conversionRepository,
		time.Now,
	)
}

// NewPlannedPurchaseConversionServiceWithClock creates the conversion use case with a custom clock for testing.
func NewPlannedPurchaseConversionServiceWithClock(
	plannedPurchaseRepository repository.PlannedPurchaseRepository,
	conversionRepository repository.PlannedPurchaseConversionRepository,
	nowProvider func() time.Time,
) PlannedPurchaseConversionService {
	if nowProvider == nil {
		nowProvider = time.Now
	}
	return &plannedPurchaseConversionServiceImpl{
		plannedPurchaseRepository: plannedPurchaseRepository,
		conversionRepository:      conversionRepository,
		nowProvider:               nowProvider,
	}
}

// ConvertPlannedPurchase validates actual purchase details, atomically creates ownership, and removes the source plan.
func (serviceInstance *plannedPurchaseConversionServiceImpl) ConvertPlannedPurchase(
	ctx context.Context,
	userID string,
	plannedPurchaseID string,
	purchasePrice float64,
	currencyCode string,
	purchaseDate string,
) (domain.Item, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	trimmedID := strings.TrimSpace(plannedPurchaseID)
	if trimmedID == "" {
		return domain.Item{}, domain.ErrPlannedPurchaseNotFound
	}

	plannedPurchase, getError := serviceInstance.plannedPurchaseRepository.GetByID(ctx, normalizedUserID, trimmedID)
	if getError != nil {
		return domain.Item{}, getError
	}

	normalizedCurrency := strings.ToUpper(strings.TrimSpace(currencyCode))
	if normalizedCurrency == "" || normalizedCurrency != strings.ToUpper(strings.TrimSpace(plannedPurchase.CurrencyCode)) {
		return domain.Item{}, domain.ErrPlannedPurchaseCurrencyMismatch
	}

	validatedItem, validationError := newActiveItem(
		plannedPurchase.Name,
		purchasePrice,
		purchaseDate,
		nil,
		nil,
	)
	if validationError != nil {
		return domain.Item{}, validationError
	}

	createdItem, conversionError := serviceInstance.conversionRepository.Convert(
		ctx,
		normalizedUserID,
		trimmedID,
		validatedItem,
	)
	if conversionError != nil {
		return domain.Item{}, conversionError
	}

	return enrichItem(createdItem, serviceInstance.nowProvider().UTC())
}
