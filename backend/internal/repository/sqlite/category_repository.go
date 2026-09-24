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

type categoryRecord struct {
	ID        int64  `gorm:"column:id;primaryKey;autoIncrement"`
	UserID    string `gorm:"column:user_id;not null"`
	Name      string `gorm:"column:name;not null"`
	CreatedAt string `gorm:"column:created_at;not null"`
	UpdatedAt string `gorm:"column:updated_at;not null"`
}

func (categoryRecord) TableName() string {
	return "categories"
}

func (record categoryRecord) toDomain() (domain.Category, error) {
	createdAt, parseCreatedAtError := parseSQLiteTimestamp(record.CreatedAt)
	if parseCreatedAtError != nil {
		return domain.Category{}, fmt.Errorf("parse category created_at: %w", parseCreatedAtError)
	}

	updatedAt, parseUpdatedAtError := parseSQLiteTimestamp(record.UpdatedAt)
	if parseUpdatedAtError != nil {
		return domain.Category{}, fmt.Errorf("parse category updated_at: %w", parseUpdatedAtError)
	}

	return domain.Category{
		ID:        record.ID,
		UserID:    record.UserID,
		Name:      record.Name,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}, nil
}

// CategoryRepository implements repository.CategoryRepository using user-scoped GORM queries.
type CategoryRepository struct {
	database *gorm.DB
}

// NewCategoryRepository creates a GORM-backed category repository.
func NewCategoryRepository(database *gorm.DB) repository.CategoryRepository {
	return &CategoryRepository{
		database: database,
	}
}

// List returns all categories owned by the current user ordered alphabetically.
func (repositoryInstance *CategoryRepository) List(ctx context.Context, userID string) ([]domain.Category, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	var records []categoryRecord
	result := repositoryInstance.database.WithContext(ctx).
		Where("user_id = ?", normalizedUserID).
		Order("name COLLATE NOCASE ASC").
		Find(&records)
	if result.Error != nil {
		return nil, fmt.Errorf("list categories: %w", result.Error)
	}

	categories := make([]domain.Category, 0, len(records))
	for _, record := range records {
		category, mapError := record.toDomain()
		if mapError != nil {
			return nil, mapError
		}
		categories = append(categories, category)
	}

	return categories, nil
}

// FindOrCreate finds an existing category matching case-insensitively or creates a new one.
func (repositoryInstance *CategoryRepository) FindOrCreate(ctx context.Context, userID string, name string) (domain.Category, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.Category{}, identityError
	}

	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return domain.Category{}, fmt.Errorf("category name cannot be empty")
	}

	var record categoryRecord
	findResult := repositoryInstance.database.WithContext(ctx).
		Where("user_id = ? AND LOWER(name) = LOWER(?)", normalizedUserID, trimmedName).
		First(&record)

	if findResult.Error == nil {
		return record.toDomain()
	}

	if !errors.Is(findResult.Error, gorm.ErrRecordNotFound) {
		return domain.Category{}, fmt.Errorf("find category: %w", findResult.Error)
	}

	currentTimestamp := time.Now().UTC().Format(time.RFC3339Nano)
	newRecord := categoryRecord{
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
		return domain.Category{}, fmt.Errorf("create category: %w", createResult.Error)
	}

	return newRecord.toDomain()
}

// GetByID returns a category only when it belongs to the specified user.
func (repositoryInstance *CategoryRepository) GetByID(ctx context.Context, userID string, id int64) (domain.Category, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.Category{}, identityError
	}

	var record categoryRecord
	result := repositoryInstance.database.WithContext(ctx).
		Where("user_id = ? AND id = ?", normalizedUserID, id).
		First(&record)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return domain.Category{}, fmt.Errorf("category not found")
	}
	if result.Error != nil {
		return domain.Category{}, fmt.Errorf("get category by id: %w", result.Error)
	}

	return record.toDomain()
}
