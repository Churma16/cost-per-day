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

// MemoryItemRepository implements repository.ItemRepository in memory.
type MemoryItemRepository struct {
	mutex           sync.RWMutex
	itemsByUserID   map[string]map[string]domain.Item
	autoIncrementID int64
}

// NewMemoryItemRepository creates a new thread-safe in-memory item repository.
func NewMemoryItemRepository() repository.ItemRepository {
	return &MemoryItemRepository{
		itemsByUserID:   make(map[string]map[string]domain.Item),
		autoIncrementID: 0,
	}
}

// List returns only the current user's items in deterministic identifier order.
func (repositoryInstance *MemoryItemRepository) List(_ context.Context, userID string) ([]domain.Item, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	userItems := repositoryInstance.itemsByUserID[normalizedUserID]
	itemList := make([]domain.Item, 0, len(userItems))
	for _, storedItem := range userItems {
		itemList = append(itemList, storedItem)
	}

	sort.Slice(itemList, func(firstIndex, secondIndex int) bool {
		firstID, firstErr := strconv.ParseInt(itemList[firstIndex].ID, 10, 64)
		secondID, secondErr := strconv.ParseInt(itemList[secondIndex].ID, 10, 64)
		if firstErr == nil && secondErr == nil {
			return firstID < secondID
		}
		return itemList[firstIndex].ID < itemList[secondIndex].ID
	})

	return itemList, nil
}

// GetByID finds an item only when it belongs to the current user.
func (repositoryInstance *MemoryItemRepository) GetByID(_ context.Context, userID string, itemID string) (domain.Item, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	foundItem, exists := repositoryInstance.itemsByUserID[normalizedUserID][itemID]
	if !exists {
		return domain.Item{}, domain.ErrItemNotFound
	}

	return foundItem, nil
}

// Create generates a new identifier and stores the item under the current user.
func (repositoryInstance *MemoryItemRepository) Create(_ context.Context, userID string, itemToCreate domain.Item) (domain.Item, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	repositoryInstance.autoIncrementID++
	currentTimestamp := time.Now().UTC()

	itemToCreate.ID = strconv.FormatInt(repositoryInstance.autoIncrementID, 10)
	itemToCreate.UserID = normalizedUserID
	if itemToCreate.CreatedAt.IsZero() {
		itemToCreate.CreatedAt = currentTimestamp
	}
	itemToCreate.UpdatedAt = currentTimestamp

	if repositoryInstance.itemsByUserID[normalizedUserID] == nil {
		repositoryInstance.itemsByUserID[normalizedUserID] = make(map[string]domain.Item)
	}
	repositoryInstance.itemsByUserID[normalizedUserID][itemToCreate.ID] = itemToCreate
	return itemToCreate, nil
}

// Update replaces an item only when it belongs to the current user.
func (repositoryInstance *MemoryItemRepository) Update(_ context.Context, userID string, itemToUpdate domain.Item) (domain.Item, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	existingItem, exists := repositoryInstance.itemsByUserID[normalizedUserID][itemToUpdate.ID]
	if !exists {
		return domain.Item{}, domain.ErrItemNotFound
	}

	itemToUpdate.UserID = normalizedUserID
	itemToUpdate.CreatedAt = existingItem.CreatedAt
	itemToUpdate.UpdatedAt = time.Now().UTC()

	repositoryInstance.itemsByUserID[normalizedUserID][itemToUpdate.ID] = itemToUpdate
	return itemToUpdate, nil
}

// Delete removes an item only when it belongs to the current user.
func (repositoryInstance *MemoryItemRepository) Delete(_ context.Context, userID string, itemID string) error {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	userItems := repositoryInstance.itemsByUserID[normalizedUserID]
	if _, exists := userItems[itemID]; !exists {
		return domain.ErrItemNotFound
	}

	delete(userItems, itemID)
	return nil
}

func requireUserID(userID string) (string, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return "", domain.ErrUserIdentityRequired
	}
	return normalizedUserID, nil
}
