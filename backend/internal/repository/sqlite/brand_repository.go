package sqlite

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

type brandRecord struct {
	ID        int64  `gorm:"column:id;primaryKey;autoIncrement"`
	UserID    string `gorm:"column:user_id;not null"`
	Name      string `gorm:"column:name;not null"`
	CreatedAt string `gorm:"column:created_at;not null"`
	UpdatedAt string `gorm:"column:updated_at;not null"`
}

func (brandRecord) TableName() string {
	return "brands"
}

func (record brandRecord) toDomain() (domain.Brand, error) {
	createdAt, parseCreatedAtError := parseSQLiteTimestamp(record.CreatedAt)
	if parseCreatedAtError != nil {
		return domain.Brand{}, fmt.Errorf("parse brand created_at: %w", parseCreatedAtError)
	}

	updatedAt, parseUpdatedAtError := parseSQLiteTimestamp(record.UpdatedAt)
	if parseUpdatedAtError != nil {
		return domain.Brand{}, fmt.Errorf("parse brand updated_at: %w", parseUpdatedAtError)
	}

	return domain.Brand{
		ID:        record.ID,
		UserID:    record.UserID,
		Name:      record.Name,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}, nil
}

// BrandRepository implements repository.BrandRepository using user-scoped GORM queries.
type BrandRepository struct {
	database *gorm.DB
}

// NewBrandRepository creates a GORM-backed brand repository.
func NewBrandRepository(database *gorm.DB) repository.BrandRepository {
	return &BrandRepository{
		database: database,
	}
}

// List returns all brands owned by the current user ordered alphabetically.
func (repositoryInstance *BrandRepository) List(ctx context.Context, userID string) ([]domain.Brand, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	var records []brandRecord
	result := repositoryInstance.database.WithContext(ctx).
		Where("user_id = ?", normalizedUserID).
		Order("name COLLATE NOCASE ASC").
		Find(&records)
	if result.Error != nil {
		return nil, fmt.Errorf("list brands: %w", result.Error)
	}

	brands := make([]domain.Brand, 0, len(records))
	for _, record := range records {
		brand, mapError := record.toDomain()
		if mapError != nil {
			return nil, mapError
		}
		brands = append(brands, brand)
	}

	return brands, nil
}

// FindOrCreate finds an existing brand matching case-insensitively or creates a new one.
func (repositoryInstance *BrandRepository) FindOrCreate(ctx context.Context, userID string, name string) (domain.Brand, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.Brand{}, identityError
	}

	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return domain.Brand{}, fmt.Errorf("brand name cannot be empty")
	}

	var record brandRecord
	findResult := repositoryInstance.database.WithContext(ctx).
		Where("user_id = ? AND LOWER(name) = LOWER(?)", normalizedUserID, trimmedName).
		First(&record)

	if findResult.Error == nil {
		return record.toDomain()
	}

	if !errors.Is(findResult.Error, gorm.ErrRecordNotFound) {
		return domain.Brand{}, fmt.Errorf("find brand: %w", findResult.Error)
	}

	currentTimestamp := time.Now().UTC().Format(time.RFC3339Nano)
	newRecord := brandRecord{
		UserID:    normalizedUserID,
		Name:      trimmedName,
		CreatedAt: currentTimestamp,
		UpdatedAt: currentTimestamp,
	}

	createResult := repositoryInstance.database.WithContext(ctx).Create(&newRecord)
	if createResult.Error != nil {
		// In case of concurrent insert with UNIQUE constraint, try finding again
		retryResult := repositoryInstance.database.WithContext(ctx).
			Where("user_id = ? AND LOWER(name) = LOWER(?)", normalizedUserID, trimmedName).
			First(&record)
		if retryResult.Error == nil {
			return record.toDomain()
		}
		return domain.Brand{}, fmt.Errorf("create brand: %w", createResult.Error)
	}

	return newRecord.toDomain()
}

// GetByID returns a brand only when it belongs to the specified user.
func (repositoryInstance *BrandRepository) GetByID(ctx context.Context, userID string, id int64) (domain.Brand, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.Brand{}, identityError
	}

	var record brandRecord
	result := repositoryInstance.database.WithContext(ctx).
		Where("user_id = ? AND id = ?", normalizedUserID, id).
		First(&record)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return domain.Brand{}, fmt.Errorf("brand not found")
	}
	if result.Error != nil {
		return domain.Brand{}, fmt.Errorf("get brand by id: %w", result.Error)
	}

	return record.toDomain()
}
