package service

import (
	"context"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

const maxGuestMigrationIDLength = 128

// GuestMigrationService imports local guest records into an authenticated account.
type GuestMigrationService interface {
	ImportGuestData(
		ctx context.Context,
		userID string,
		migrationID string,
		items []domain.Item,
		plannedPurchases []domain.PlannedPurchase,
	) (domain.GuestMigrationResult, error)
}

type guestMigrationServiceImpl struct {
	repository  repository.GuestMigrationRepository
	nowProvider func() time.Time
}

// NewGuestMigrationService creates a migration service using the current time for validation.
func NewGuestMigrationService(migrationRepository repository.GuestMigrationRepository) GuestMigrationService {
	return newGuestMigrationServiceWithClock(migrationRepository, time.Now)
}

func newGuestMigrationServiceWithClock(
	migrationRepository repository.GuestMigrationRepository,
	nowProvider func() time.Time,
) GuestMigrationService {
	if nowProvider == nil {
		nowProvider = time.Now
	}
	return &guestMigrationServiceImpl{
		repository:  migrationRepository,
		nowProvider: nowProvider,
	}
}

func (serviceInstance *guestMigrationServiceImpl) ImportGuestData(
	ctx context.Context,
	userID string,
	migrationID string,
	items []domain.Item,
	plannedPurchases []domain.PlannedPurchase,
) (domain.GuestMigrationResult, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.GuestMigrationResult{}, identityError
	}

	normalizedMigrationID := strings.TrimSpace(migrationID)
	if normalizedMigrationID == "" || len(normalizedMigrationID) > maxGuestMigrationIDLength {
		return domain.GuestMigrationResult{}, domain.ErrInvalidGuestMigrationID
	}

	validatedItems := make([]domain.Item, 0, len(items))
	for _, item := range items {
		item.ID = ""
		item.UserID = ""
		item.CategoryID = nil
		item.BrandID = nil
		item.CreatedAt = time.Time{}
		item.UpdatedAt = time.Time{}
		item.OwnershipDays = 0
		item.GrossCostPerDay = 0
		item.NetOwnershipCost = nil
		item.NetCostPerDay = nil
		item.TargetCostPerDay = nil
		item.TargetDurationDays = nil
		item.RemainingDays = nil
		item.DaysBeyond = nil
		item.ProgressPercentage = nil
		item.TargetReached = nil
		item.TargetState = nil

		validatedItem, validationError := validateItem(item)
		if validationError != nil {
			return domain.GuestMigrationResult{}, validationError
		}
		validatedItems = append(validatedItems, validatedItem)
	}

	validationTime := serviceInstance.nowProvider().UTC()
	validatedPlannedPurchases := make([]domain.PlannedPurchase, 0, len(plannedPurchases))
	for _, plannedPurchase := range plannedPurchases {
		plannedPurchase.ID = ""
		plannedPurchase.UserID = ""
		plannedPurchase.CreatedAt = time.Time{}
		plannedPurchase.UpdatedAt = time.Time{}
		plannedPurchase.EstimatedPeriods = nil
		plannedPurchase.EstimatedDays = nil
		plannedPurchase.RequiredDailyContribution = nil
		plannedPurchase.RequiredWeeklyContribution = nil
		plannedPurchase.RequiredMonthlyContribution = nil

		validatedPurchase, validationError := validatePlannedPurchase(plannedPurchase, validationTime)
		if validationError != nil {
			return domain.GuestMigrationResult{}, validationError
		}
		validatedPlannedPurchases = append(validatedPlannedPurchases, validatedPurchase)
	}

	return serviceInstance.repository.ImportGuestData(
		ctx,
		normalizedUserID,
		normalizedMigrationID,
		validatedItems,
		validatedPlannedPurchases,
	)
}
