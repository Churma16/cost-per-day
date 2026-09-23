package service

import (
	"context"
	"math"
	"strings"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// ValueEquivalentService defines the application operations available for user-owned value equivalents.
type ValueEquivalentService interface {
	ListValueEquivalents(ctx context.Context, userID string) ([]domain.ValueEquivalent, error)
	GetValueEquivalentByID(ctx context.Context, userID string, id string) (domain.ValueEquivalent, error)
	CreateValueEquivalent(ctx context.Context, userID string, name string, amount float64, currencyCode string) (domain.ValueEquivalent, error)
	UpdateValueEquivalent(ctx context.Context, userID string, id string, name string, amount float64, currencyCode string) (domain.ValueEquivalent, error)
	DeleteValueEquivalent(ctx context.Context, userID string, id string) error
}

type valueEquivalentServiceImpl struct {
	equivalentRepository repository.ValueEquivalentRepository
}

// NewValueEquivalentService creates a new ValueEquivalentService instance.
func NewValueEquivalentService(equivalentRepository repository.ValueEquivalentRepository) ValueEquivalentService {
	return &valueEquivalentServiceImpl{
		equivalentRepository: equivalentRepository,
	}
}

// ListValueEquivalents retrieves only the current user's value equivalents.
func (serviceInstance *valueEquivalentServiceImpl) ListValueEquivalents(ctx context.Context, userID string) ([]domain.ValueEquivalent, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	return serviceInstance.equivalentRepository.List(ctx, normalizedUserID)
}

// GetValueEquivalentByID retrieves one value equivalent only when it belongs to the current user.
func (serviceInstance *valueEquivalentServiceImpl) GetValueEquivalentByID(ctx context.Context, userID string, id string) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	trimmedID := strings.TrimSpace(id)
	if trimmedID == "" {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	return serviceInstance.equivalentRepository.GetByID(ctx, normalizedUserID, trimmedID)
}

// CreateValueEquivalent validates and stores a new value equivalent for the user.
func (serviceInstance *valueEquivalentServiceImpl) CreateValueEquivalent(ctx context.Context, userID string, name string, amount float64, currencyCode string) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	validatedEquivalent, validationError := validateValueEquivalent(name, amount, currencyCode)
	if validationError != nil {
		return domain.ValueEquivalent{}, validationError
	}

	return serviceInstance.equivalentRepository.Create(ctx, normalizedUserID, validatedEquivalent)
}

// UpdateValueEquivalent validates and updates an existing value equivalent owned by the user.
func (serviceInstance *valueEquivalentServiceImpl) UpdateValueEquivalent(ctx context.Context, userID string, id string, name string, amount float64, currencyCode string) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	trimmedID := strings.TrimSpace(id)
	if trimmedID == "" {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	validatedEquivalent, validationError := validateValueEquivalent(name, amount, currencyCode)
	if validationError != nil {
		return domain.ValueEquivalent{}, validationError
	}
	validatedEquivalent.ID = trimmedID

	return serviceInstance.equivalentRepository.Update(ctx, normalizedUserID, validatedEquivalent)
}

// DeleteValueEquivalent removes a value equivalent only when owned by the user.
func (serviceInstance *valueEquivalentServiceImpl) DeleteValueEquivalent(ctx context.Context, userID string, id string) error {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return identityError
	}

	trimmedID := strings.TrimSpace(id)
	if trimmedID == "" {
		return domain.ErrValueEquivalentNotFound
	}

	return serviceInstance.equivalentRepository.Delete(ctx, normalizedUserID, trimmedID)
}

var supportedCurrencies = map[string]bool{
	"USD": true,
	"EUR": true,
	"CNY": true,
	"IDR": true,
}

func validateValueEquivalent(name string, amount float64, currencyCode string) (domain.ValueEquivalent, error) {
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return domain.ValueEquivalent{}, domain.ErrEmptyValueEquivalentName
	}

	if amount <= 0 || math.IsNaN(amount) || math.IsInf(amount, 0) {
		return domain.ValueEquivalent{}, domain.ErrInvalidValueEquivalentAmount
	}

	scaledAmount := amount * float64(itemPricePrecisionScale)
	if scaledAmount >= float64(math.MaxInt64) {
		return domain.ValueEquivalent{}, domain.ErrUnsupportedValueEquivalentAmount
	}
	amountMicros := int64(math.Round(scaledAmount))
	if amountMicros <= 0 {
		return domain.ValueEquivalent{}, domain.ErrUnsupportedValueEquivalentAmount
	}

	normalizedCurrency := strings.ToUpper(strings.TrimSpace(currencyCode))
	if !supportedCurrencies[normalizedCurrency] {
		return domain.ValueEquivalent{}, domain.ErrInvalidValueEquivalentCurrency
	}

	normalizedAmount := float64(amountMicros) / float64(itemPricePrecisionScale)

	return domain.ValueEquivalent{
		Name:         trimmedName,
		Amount:       normalizedAmount,
		CurrencyCode: normalizedCurrency,
	}, nil
}
