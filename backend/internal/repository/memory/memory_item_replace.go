package memory

import (
	"context"
	"strconv"
	"time"

	"cost-per-day/backend/internal/domain"
)

// ReplaceAll atomically replaces only the current user's complete in-memory item set.
func (repositoryInstance *MemoryItemRepository) ReplaceAll(_ context.Context, userID string, items []domain.Item) ([]domain.Item, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	replacementItems := make(map[string]domain.Item, len(items))
	createdItems := make([]domain.Item, 0, len(items))
	nextID := repositoryInstance.autoIncrementID
	currentTimestamp := time.Now().UTC()

	for _, itemToCreate := range items {
		nextID++
		itemToCreate.ID = strconv.FormatInt(nextID, 10)
		itemToCreate.UserID = normalizedUserID
		itemToCreate.CreatedAt = currentTimestamp
		itemToCreate.UpdatedAt = currentTimestamp

		replacementItems[itemToCreate.ID] = itemToCreate
		createdItems = append(createdItems, itemToCreate)
	}

	repositoryInstance.itemsByUserID[normalizedUserID] = replacementItems
	repositoryInstance.autoIncrementID = nextID

	return createdItems, nil
}
