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

// MemoryBrandRepository implements repository.BrandRepository in memory.
type MemoryBrandRepository struct {
	mutex           sync.RWMutex
	brandsByUserID  map[string]map[int64]domain.Brand
	autoIncrementID int64
}

// NewMemoryBrandRepository creates an in-memory brand repository.
func NewMemoryBrandRepository() repository.BrandRepository {
	return &MemoryBrandRepository{
		brandsByUserID: make(map[string]map[int64]domain.Brand),
	}
}

// List returns all brands for a user ordered alphabetically by name.
func (repositoryInstance *MemoryBrandRepository) List(_ context.Context, userID string) ([]domain.Brand, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	userBrands := repositoryInstance.brandsByUserID[normalizedUserID]
	brandList := make([]domain.Brand, 0, len(userBrands))
	for _, brand := range userBrands {
		brandList = append(brandList, brand)
	}

	sort.Slice(brandList, func(firstIndex, secondIndex int) bool {
		return strings.ToLower(brandList[firstIndex].Name) < strings.ToLower(brandList[secondIndex].Name)
	})

	return brandList, nil
}

// FindOrCreate finds an existing brand matching case-insensitively or creates a new one.
func (repositoryInstance *MemoryBrandRepository) FindOrCreate(_ context.Context, userID string, name string) (domain.Brand, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.Brand{}, identityError
	}

	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return domain.Brand{}, fmt.Errorf("brand name cannot be empty")
	}

	repositoryInstance.mutex.Lock()
	defer repositoryInstance.mutex.Unlock()

	if repositoryInstance.brandsByUserID[normalizedUserID] == nil {
		repositoryInstance.brandsByUserID[normalizedUserID] = make(map[int64]domain.Brand)
	}

	for _, brand := range repositoryInstance.brandsByUserID[normalizedUserID] {
		if strings.EqualFold(brand.Name, trimmedName) {
			return brand, nil
		}
	}

	repositoryInstance.autoIncrementID++
	currentTimestamp := time.Now().UTC()
	newBrand := domain.Brand{
		ID:        repositoryInstance.autoIncrementID,
		UserID:    normalizedUserID,
		Name:      trimmedName,
		CreatedAt: currentTimestamp,
		UpdatedAt: currentTimestamp,
	}

	repositoryInstance.brandsByUserID[normalizedUserID][newBrand.ID] = newBrand
	return newBrand, nil
}

// GetByID finds a brand by its identifier for a user.
func (repositoryInstance *MemoryBrandRepository) GetByID(_ context.Context, userID string, id int64) (domain.Brand, error) {
	normalizedUserID, identityError := requireUserID(userID)
	if identityError != nil {
		return domain.Brand{}, identityError
	}

	repositoryInstance.mutex.RLock()
	defer repositoryInstance.mutex.RUnlock()

	brand, exists := repositoryInstance.brandsByUserID[normalizedUserID][id]
	if !exists {
		return domain.Brand{}, fmt.Errorf("brand not found")
	}

	return brand, nil
}
