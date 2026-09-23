package memory

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// MemoryPlannedPurchaseRepository implements repository.PlannedPurchaseRepository in memory.
type MemoryPlannedPurchaseRepository struct {
	mutex               sync.RWMutex
	purchasesByUserID   map[string]map[string]domain.PlannedPurchase
	autoIncrementID     int64
}

// NewMemoryPlannedPurchaseRepository creates a thread-safe in-memory planned purchase repository.
func NewMemoryPlannedPurchaseRepository() repository.PlannedPurchaseRepository {
	return &MemoryPlannedPurchaseRepository{
		purchasesByUserID: make(map[string]map[string]domain.PlannedPurchase),
		autoIncrementID:   0,
	}
}

// List returns only the current user's planned purchases in deterministic identifier order.
func (repositoryInstance *MemoryPlannedPurchaseRepository) List(_ context.Context, userID string) ([]domain.PlannedPurchase, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	userPurchases := repositoryInstance.purchasesByUserID[normalizedUserID]
	purchaseList := make([]domain.PlannedPurchase, 0, len(userPurchases))
	for _, storedPurchase := range userPurchases {
		purchaseList = append(purchaseList, storedPurchase)
	}

	sort.Slice(purchaseList, func(firstIndex, secondIndex int) bool {
		firstID, firstError := strconv.ParseInt(purchaseList[firstIndex].ID, 10, 64)
		secondID, secondError := strconv.ParseInt(purchaseList[secondIndex].ID, 10, 64)
		if firstError == nil && secondError == nil {
			return firstID < secondID
		}
		return purchaseList[firstIndex].ID < purchaseList[secondIndex].ID
	})

	return purchaseList, nil
}

// GetByID returns a planned purchase only when it belongs to the current user.
func (repositoryInstance *MemoryPlannedPurchaseRepository) GetByID(_ context.Context, userID string, id string) (domain.PlannedPurchase, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.PlannedPurchase{}, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	userPurchases, userExists := repositoryInstance.purchasesByUserID[normalizedUserID]
	if !userExists {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}

	storedPurchase, purchaseExists := userPurchases[strings.TrimSpace(id)]
	if !purchaseExists {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}

	return storedPurchase, nil
}

// Create stores a new planned purchase for the user and assigns an auto-incrementing identifier.
func (repositoryInstance *MemoryPlannedPurchaseRepository) Create(_ context.Context, userID string, purchaseToCreate domain.PlannedPurchase) (domain.PlannedPurchase, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.PlannedPurchase{}, identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	repositoryInstance.autoIncrementID++
	generatedID := strconv.FormatInt(repositoryInstance.autoIncrementID, 10)
	currentTime := time.Now().UTC()

	var targetDate *string
	if purchaseToCreate.TargetDate != nil && strings.TrimSpace(*purchaseToCreate.TargetDate) != "" {
		trimmedDate := strings.TrimSpace(*purchaseToCreate.TargetDate)
		targetDate = &trimmedDate
	}

	var contributionAmount *float64
	if purchaseToCreate.ContributionAmount != nil && *purchaseToCreate.ContributionAmount > 0 {
		amount := *purchaseToCreate.ContributionAmount
		contributionAmount = &amount
	}

	var contributionCadence *domain.ContributionCadence
	if purchaseToCreate.ContributionCadence != nil && strings.TrimSpace(string(*purchaseToCreate.ContributionCadence)) != "" {
		cadence := domain.ContributionCadence(strings.TrimSpace(string(*purchaseToCreate.ContributionCadence)))
		contributionCadence = &cadence
	}

	persistedPurchase := domain.PlannedPurchase{
		ID:                  generatedID,
		UserID:              normalizedUserID,
		Name:                strings.TrimSpace(purchaseToCreate.Name),
		TargetPrice:         purchaseToCreate.TargetPrice,
		CurrencyCode:        strings.TrimSpace(purchaseToCreate.CurrencyCode),
		TargetDate:          targetDate,
		ContributionAmount:  contributionAmount,
		ContributionCadence: contributionCadence,
		CreatedAt:           currentTime,
		UpdatedAt:           currentTime,
	}

	if _, userExists := repositoryInstance.purchasesByUserID[normalizedUserID]; !userExists {
		repositoryInstance.purchasesByUserID[normalizedUserID] = make(map[string]domain.PlannedPurchase)
	}
	repositoryInstance.purchasesByUserID[normalizedUserID][generatedID] = persistedPurchase

	return persistedPurchase, nil
}

// Update replaces mutable fields on an existing planned purchase owned by the current user.
func (repositoryInstance *MemoryPlannedPurchaseRepository) Update(_ context.Context, userID string, purchaseToUpdate domain.PlannedPurchase) (domain.PlannedPurchase, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.PlannedPurchase{}, identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	userPurchases, userExists := repositoryInstance.purchasesByUserID[normalizedUserID]
	if !userExists {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}

	purchaseID := strings.TrimSpace(purchaseToUpdate.ID)
	existingPurchase, purchaseExists := userPurchases[purchaseID]
	if !purchaseExists {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}

	var targetDate *string
	if purchaseToUpdate.TargetDate != nil && strings.TrimSpace(*purchaseToUpdate.TargetDate) != "" {
		trimmedDate := strings.TrimSpace(*purchaseToUpdate.TargetDate)
		targetDate = &trimmedDate
	}

	var contributionAmount *float64
	if purchaseToUpdate.ContributionAmount != nil && *purchaseToUpdate.ContributionAmount > 0 {
		amount := *purchaseToUpdate.ContributionAmount
		contributionAmount = &amount
	}

	var contributionCadence *domain.ContributionCadence
	if purchaseToUpdate.ContributionCadence != nil && strings.TrimSpace(string(*purchaseToUpdate.ContributionCadence)) != "" {
		cadence := domain.ContributionCadence(strings.TrimSpace(string(*purchaseToUpdate.ContributionCadence)))
		contributionCadence = &cadence
	}

	currentTime := time.Now().UTC()
	updatedPurchase := domain.PlannedPurchase{
		ID:                  existingPurchase.ID,
		UserID:              normalizedUserID,
		Name:                strings.TrimSpace(purchaseToUpdate.Name),
		TargetPrice:         purchaseToUpdate.TargetPrice,
		CurrencyCode:        strings.TrimSpace(purchaseToUpdate.CurrencyCode),
		TargetDate:          targetDate,
		ContributionAmount:  contributionAmount,
		ContributionCadence: contributionCadence,
		CreatedAt:           existingPurchase.CreatedAt,
		UpdatedAt:           currentTime,
	}

	userPurchases[purchaseID] = updatedPurchase
	return updatedPurchase, nil
}

// Delete removes a planned purchase only when owned by the current user.
func (repositoryInstance *MemoryPlannedPurchaseRepository) Delete(_ context.Context, userID string, id string) error {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	userPurchases, userExists := repositoryInstance.purchasesByUserID[normalizedUserID]
	if !userExists {
		return domain.ErrPlannedPurchaseNotFound
	}

	purchaseID := strings.TrimSpace(id)
	if _, purchaseExists := userPurchases[purchaseID]; !purchaseExists {
		return domain.ErrPlannedPurchaseNotFound
	}

	delete(userPurchases, purchaseID)
	return nil
}
