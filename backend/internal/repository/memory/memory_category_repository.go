package memory

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// MemoryCategoryRepository implements repository.CategoryRepository in memory.
type MemoryCategoryRepository struct {
	mutex              sync.RWMutex
	categoriesByUserID map[string]map[int64]domain.Category
	autoIncrementID    int64
}

// NewMemoryCategoryRepository creates an in-memory category repository.
func NewMemoryCategoryRepository() repository.CategoryRepository {
	return &MemoryCategoryRepository{
		categoriesByUserID: make(map[string]map[int64]domain.Category),
	}
}

// List returns all categories for a user ordered alphabetically by name.
func (repositoryInstance *MemoryCategoryRepository) List(_ context.Context, userID string) ([]domain.Category, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	userCategories := repositoryInstance.categoriesByUserID[normalizedUserID]
	categoryList := make([]domain.Category, 0, len(userCategories))
	for _, category := range userCategories {
		categoryList = append(categoryList, category)
	}

	sort.Slice(categoryList, func(firstIndex, secondIndex int) bool {
		return strings.ToLower(categoryList[firstIndex].Name) < strings.ToLower(categoryList[secondIndex].Name)
	})

	return categoryList, nil
}

// FindOrCreate finds an existing category matching case-insensitively or creates a new one.
func (repositoryInstance *MemoryCategoryRepository) FindOrCreate(_ context.Context, userID string, name string) (domain.Category, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.Category{}, identityError
	}

	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return domain.Category{}, fmt.Errorf("category name cannot be empty")
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	if repositoryInstance.categoriesByUserID[normalizedUserID] == nil {
		repositoryInstance.categoriesByUserID[normalizedUserID] = make(map[int64]domain.Category)
	}

	for _, category := range repositoryInstance.categoriesByUserID[normalizedUserID] {
		if strings.EqualFold(category.Name, trimmedName) {
			return category, nil
		}
	}

	repositoryInstance.autoIncrementID++
	currentTimestamp := time.Now().UTC()
	newCategory := domain.Category{
		ID:        repositoryInstance.autoIncrementID,
		UserID:    normalizedUserID,
		Name:      trimmedName,
		CreatedAt: currentTimestamp,
		UpdatedAt: currentTimestamp,
	}

	repositoryInstance.categoriesByUserID[normalizedUserID][newCategory.ID] = newCategory
	return newCategory, nil
}

// GetByID finds a category by its identifier for a user.
func (repositoryInstance *MemoryCategoryRepository) GetByID(_ context.Context, userID string, id int64) (domain.Category, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.Category{}, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	category, exists := repositoryInstance.categoriesByUserID[normalizedUserID][id]
	if !exists {
		return domain.Category{}, fmt.Errorf("category not found")
	}

	return category, nil
}
