package memory

import (
	"context"
	"sort"
	"strconv"
	"sync"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// MemoryItemRepository implements repository.ItemRepository in memory.
type MemoryItemRepository struct {
	mutex            sync.RWMutex
	itemsByID        map[string]domain.Item
	autoIncrementID  int64
}

// NewMemoryItemRepository creates a new thread-safe in-memory item repository.
func NewMemoryItemRepository() repository.ItemRepository {
	return &MemoryItemRepository{
		itemsByID:       make(map[string]domain.Item),
		autoIncrementID: 0,
	}
}

// List returns all stored items sorted chronologically by creation timestamp or ID.
func (repositoryInstance *MemoryItemRepository) List(_ context.Context) ([]domain.Item, error) {
	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	itemList := make([]domain.Item, 0, len(repositoryInstance.itemsByID))
	for _, storedItem := range repositoryInstance.itemsByID {
		itemList = append(itemList, storedItem)
	}

	// Sort items by ID for deterministic list ordering
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

// GetByID finds and returns an item by its unique identifier.
func (repositoryInstance *MemoryItemRepository) GetByID(_ context.Context, itemID string) (domain.Item, error) {
	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	foundItem, exists := repositoryInstance.itemsByID[itemID]
	if !exists {
		return domain.Item{}, domain.ErrItemNotFound
	}

	return foundItem, nil
}

// Create generates a new identifier and stores the item.
func (repositoryInstance *MemoryItemRepository) Create(_ context.Context, itemToCreate domain.Item) (domain.Item, error) {
	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	repositoryInstance.autoIncrementID++
	currentTimestamp := time.Now().UTC()

	itemToCreate.ID = strconv.FormatInt(repositoryInstance.autoIncrementID, 10)
	if itemToCreate.CreatedAt.IsZero() {
		itemToCreate.CreatedAt = currentTimestamp
	}
	itemToCreate.UpdatedAt = currentTimestamp

	repositoryInstance.itemsByID[itemToCreate.ID] = itemToCreate
	return itemToCreate, nil
}

// Update replaces an existing item with the provided details.
func (repositoryInstance *MemoryItemRepository) Update(_ context.Context, itemToUpdate domain.Item) (domain.Item, error) {
	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	existingItem, exists := repositoryInstance.itemsByID[itemToUpdate.ID]
	if !exists {
		return domain.Item{}, domain.ErrItemNotFound
	}

	itemToUpdate.CreatedAt = existingItem.CreatedAt
	itemToUpdate.UpdatedAt = time.Now().UTC()

	repositoryInstance.itemsByID[itemToUpdate.ID] = itemToUpdate
	return itemToUpdate, nil
}

// Delete removes an item by its identifier.
func (repositoryInstance *MemoryItemRepository) Delete(_ context.Context, itemID string) error {
	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	_, exists := repositoryInstance.itemsByID[itemID]
	if !exists {
		return domain.ErrItemNotFound
	}

	delete(repositoryInstance.itemsByID, itemID)
	return nil
}
