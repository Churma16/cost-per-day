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

// MemoryValueEquivalentRepository implements repository.ValueEquivalentRepository in memory.
type MemoryValueEquivalentRepository struct {
	mutex               sync.RWMutex
	equivalentsByUserID map[string]map[string]domain.ValueEquivalent
	autoIncrementID     int64
}

// NewMemoryValueEquivalentRepository creates a thread-safe in-memory value equivalent repository.
func NewMemoryValueEquivalentRepository() repository.ValueEquivalentRepository {
	return &MemoryValueEquivalentRepository{
		equivalentsByUserID: make(map[string]map[string]domain.ValueEquivalent),
		autoIncrementID:     0,
	}
}

// List returns only the current user's value equivalents in deterministic identifier order.
func (repositoryInstance *MemoryValueEquivalentRepository) List(_ context.Context, userID string) ([]domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	userEquivalents := repositoryInstance.equivalentsByUserID[normalizedUserID]
	equivalentList := make([]domain.ValueEquivalent, 0, len(userEquivalents))
	for _, storedEquivalent := range userEquivalents {
		equivalentList = append(equivalentList, storedEquivalent)
	}

	sort.Slice(equivalentList, func(firstIndex, secondIndex int) bool {
		firstID, firstError := strconv.ParseInt(equivalentList[firstIndex].ID, 10, 64)
		secondID, secondError := strconv.ParseInt(equivalentList[secondIndex].ID, 10, 64)
		if firstError == nil && secondError == nil {
			return firstID < secondID
		}
		return equivalentList[firstIndex].ID < equivalentList[secondIndex].ID
	})

	return equivalentList, nil
}

// GetByID returns an equivalent only when it belongs to the current user.
func (repositoryInstance *MemoryValueEquivalentRepository) GetByID(_ context.Context, userID string, id string) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	userEquivalents, userExists := repositoryInstance.equivalentsByUserID[normalizedUserID]
	if !userExists {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	storedEquivalent, equivalentExists := userEquivalents[strings.TrimSpace(id)]
	if !equivalentExists {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	return storedEquivalent, nil
}

// Create stores a new value equivalent for the user and assigns an auto-incrementing identifier.
func (repositoryInstance *MemoryValueEquivalentRepository) Create(_ context.Context, userID string, equivalentToCreate domain.ValueEquivalent) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	repositoryInstance.autoIncrementID++
	generatedID := strconv.FormatInt(repositoryInstance.autoIncrementID, 10)
	currentTime := time.Now().UTC()

	persistedEquivalent := domain.ValueEquivalent{
		ID:           generatedID,
		UserID:       normalizedUserID,
		Name:         strings.TrimSpace(equivalentToCreate.Name),
		Amount:       equivalentToCreate.Amount,
		CurrencyCode: strings.TrimSpace(equivalentToCreate.CurrencyCode),
		CreatedAt:    currentTime,
		UpdatedAt:    currentTime,
	}

	if _, userExists := repositoryInstance.equivalentsByUserID[normalizedUserID]; !userExists {
		repositoryInstance.equivalentsByUserID[normalizedUserID] = make(map[string]domain.ValueEquivalent)
	}
	repositoryInstance.equivalentsByUserID[normalizedUserID][generatedID] = persistedEquivalent

	return persistedEquivalent, nil
}

// Update replaces mutable fields on an existing equivalent owned by the current user.
func (repositoryInstance *MemoryValueEquivalentRepository) Update(_ context.Context, userID string, equivalentToUpdate domain.ValueEquivalent) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	userEquivalents, userExists := repositoryInstance.equivalentsByUserID[normalizedUserID]
	if !userExists {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	equivalentID := strings.TrimSpace(equivalentToUpdate.ID)
	existingEquivalent, equivalentExists := userEquivalents[equivalentID]
	if !equivalentExists {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	currentTime := time.Now().UTC()
	updatedEquivalent := domain.ValueEquivalent{
		ID:           existingEquivalent.ID,
		UserID:       normalizedUserID,
		Name:         strings.TrimSpace(equivalentToUpdate.Name),
		Amount:       equivalentToUpdate.Amount,
		CurrencyCode: strings.TrimSpace(equivalentToUpdate.CurrencyCode),
		CreatedAt:    existingEquivalent.CreatedAt,
		UpdatedAt:    currentTime,
	}

	userEquivalents[equivalentID] = updatedEquivalent
	return updatedEquivalent, nil
}

// Delete removes a value equivalent only when owned by the current user.
func (repositoryInstance *MemoryValueEquivalentRepository) Delete(_ context.Context, userID string, id string) error {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	userEquivalents, userExists := repositoryInstance.equivalentsByUserID[normalizedUserID]
	if !userExists {
		return domain.ErrValueEquivalentNotFound
	}

	equivalentID := strings.TrimSpace(id)
	if _, equivalentExists := userEquivalents[equivalentID]; !equivalentExists {
		return domain.ErrValueEquivalentNotFound
	}

	delete(userEquivalents, equivalentID)
	return nil
}
