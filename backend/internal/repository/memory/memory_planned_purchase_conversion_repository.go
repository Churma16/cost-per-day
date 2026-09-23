package memory

import (
	"context"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

type memoryPlannedPurchaseConversionRepository struct {
	itemRepository            repository.ItemRepository
	plannedPurchaseRepository repository.PlannedPurchaseRepository
}

// NewMemoryPlannedPurchaseConversionRepository creates an in-memory conversion adapter used by tests and local composition.
func NewMemoryPlannedPurchaseConversionRepository(
	itemRepository repository.ItemRepository,
	plannedPurchaseRepository repository.PlannedPurchaseRepository,
) repository.PlannedPurchaseConversionRepository {
	return &memoryPlannedPurchaseConversionRepository{
		itemRepository:            itemRepository,
		plannedPurchaseRepository: plannedPurchaseRepository,
	}
}

func (repositoryInstance *memoryPlannedPurchaseConversionRepository) Convert(
	ctx context.Context,
	userID string,
	plannedPurchaseID string,
	item domain.Item,
) (domain.Item, error) {
	if _, getError := repositoryInstance.plannedPurchaseRepository.GetByID(ctx, userID, plannedPurchaseID); getError != nil {
		return domain.Item{}, getError
	}

	createdItem, createError := repositoryInstance.itemRepository.Create(ctx, userID, item)
	if createError != nil {
		return domain.Item{}, createError
	}

	if deleteError := repositoryInstance.plannedPurchaseRepository.Delete(ctx, userID, plannedPurchaseID); deleteError != nil {
		_ = repositoryInstance.itemRepository.Delete(ctx, userID, createdItem.ID)
		return domain.Item{}, deleteError
	}

	return createdItem, nil
}
