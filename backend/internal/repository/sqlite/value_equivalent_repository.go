package sqlite

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// valueEquivalentRecord represents the persistence schema for the value_equivalents table.
type valueEquivalentRecord struct {
	ID           int64  `gorm:"column:id;primaryKey;autoIncrement"`
	UserID       string `gorm:"column:user_id;not null"`
	Name         string `gorm:"column:name;not null"`
	AmountMicros int64  `gorm:"column:amount_micros;not null"`
	CurrencyCode string `gorm:"column:currency_code;not null"`
	CreatedAt    string `gorm:"column:created_at;not null"`
	UpdatedAt    string `gorm:"column:updated_at;not null"`
}

func (valueEquivalentRecord) TableName() string {
	return "value_equivalents"
}

func (record valueEquivalentRecord) toDomain() (domain.ValueEquivalent, error) {
	createdAt, parseCreatedAtError := parseSQLiteTimestamp(record.CreatedAt)
	if parseCreatedAtError != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("parse value equivalent created_at: %w", parseCreatedAtError)
	}

	updatedAt, parseUpdatedAtError := parseSQLiteTimestamp(record.UpdatedAt)
	if parseUpdatedAtError != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("parse value equivalent updated_at: %w", parseUpdatedAtError)
	}

	return domain.ValueEquivalent{
		ID:           strconv.FormatInt(record.ID, 10),
		UserID:       record.UserID,
		Name:         record.Name,
		Amount:       convertMicrosToPrice(record.AmountMicros),
		CurrencyCode: record.CurrencyCode,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
	}, nil
}

func toValueEquivalentRecord(userID string, equivalent domain.ValueEquivalent, timestamp time.Time) (valueEquivalentRecord, error) {
	amountMicros, conversionError := convertPriceToMicros(equivalent.Amount)
	if conversionError != nil {
		return valueEquivalentRecord{}, conversionError
	}

	formattedTimestamp := timestamp.UTC().Format(time.RFC3339Nano)

	return valueEquivalentRecord{
		UserID:       userID,
		Name:         strings.TrimSpace(equivalent.Name),
		AmountMicros: amountMicros,
		CurrencyCode: strings.TrimSpace(equivalent.CurrencyCode),
		CreatedAt:    formattedTimestamp,
		UpdatedAt:    formattedTimestamp,
	}, nil
}

// ValueEquivalentRepository implements repository.ValueEquivalentRepository using user-scoped GORM queries.
type ValueEquivalentRepository struct {
	database *gorm.DB
}

// NewValueEquivalentRepository creates a GORM-backed value equivalent repository.
func NewValueEquivalentRepository(database *gorm.DB) repository.ValueEquivalentRepository {
	return &ValueEquivalentRepository{
		database: database,
	}
}

// List returns only the current user's value equivalents in deterministic order.
func (repositoryInstance *ValueEquivalentRepository) List(ctx context.Context, userID string) ([]domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	var records []valueEquivalentRecord
	result := repositoryInstance.database.WithContext(ctx).
		Where("user_id = ?", normalizedUserID).
		Order("id ASC").
		Find(&records)
	if result.Error != nil {
		return nil, fmt.Errorf("list value equivalents: %w", result.Error)
	}

	valueEquivalents := make([]domain.ValueEquivalent, 0, len(records))
	for _, record := range records {
		equivalent, mapError := record.toDomain()
		if mapError != nil {
			return nil, mapError
		}
		valueEquivalents = append(valueEquivalents, equivalent)
	}

	return valueEquivalents, nil
}

// GetByID returns a value equivalent only when both its identifier and owner match.
func (repositoryInstance *ValueEquivalentRepository) GetByID(ctx context.Context, userID string, id string) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	parsedID, parseError := strconv.ParseInt(strings.TrimSpace(id), 10, 64)
	if parseError != nil {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	var record valueEquivalentRecord
	result := repositoryInstance.database.WithContext(ctx).
		Where("user_id = ? AND id = ?", normalizedUserID, parsedID).
		First(&record)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}
	if result.Error != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("get value equivalent: %w", result.Error)
	}

	return record.toDomain()
}

// Create persists a new value equivalent under the current user and assigns its SQLite-generated identifier.
func (repositoryInstance *ValueEquivalentRepository) Create(ctx context.Context, userID string, equivalentToCreate domain.ValueEquivalent) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	currentTime := time.Now().UTC()
	record, mapError := toValueEquivalentRecord(normalizedUserID, equivalentToCreate, currentTime)
	if mapError != nil {
		return domain.ValueEquivalent{}, mapError
	}

	result := repositoryInstance.database.WithContext(ctx).Create(&record)
	if result.Error != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("insert value equivalent: %w", result.Error)
	}

	createdEquivalent := equivalentToCreate
	createdEquivalent.ID = strconv.FormatInt(record.ID, 10)
	createdEquivalent.UserID = normalizedUserID
	createdEquivalent.Amount = convertMicrosToPrice(record.AmountMicros)
	createdEquivalent.CreatedAt = currentTime
	createdEquivalent.UpdatedAt = currentTime

	return createdEquivalent, nil
}

// Update replaces mutable fields on an existing value equivalent owned by the current user.
func (repositoryInstance *ValueEquivalentRepository) Update(ctx context.Context, userID string, equivalentToUpdate domain.ValueEquivalent) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	parsedID, parseError := strconv.ParseInt(strings.TrimSpace(equivalentToUpdate.ID), 10, 64)
	if parseError != nil {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	amountMicros, conversionError := convertPriceToMicros(equivalentToUpdate.Amount)
	if conversionError != nil {
		return domain.ValueEquivalent{}, conversionError
	}

	currentTime := time.Now().UTC()
	formattedTimestamp := currentTime.Format(time.RFC3339Nano)

	updateColumns := map[string]any{
		"name":          strings.TrimSpace(equivalentToUpdate.Name),
		"amount_micros": amountMicros,
		"currency_code": strings.TrimSpace(equivalentToUpdate.CurrencyCode),
		"updated_at":    formattedTimestamp,
	}

	result := repositoryInstance.database.WithContext(ctx).
		Model(&valueEquivalentRecord{}).
		Where("user_id = ? AND id = ?", normalizedUserID, parsedID).
		Updates(updateColumns)
	if result.Error != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("update value equivalent: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	return repositoryInstance.GetByID(ctx, normalizedUserID, strconv.FormatInt(parsedID, 10))
}

// Delete removes a value equivalent only when owned by the current user.
func (repositoryInstance *ValueEquivalentRepository) Delete(ctx context.Context, userID string, id string) error {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return identityError
	}

	parsedID, parseError := strconv.ParseInt(strings.TrimSpace(id), 10, 64)
	if parseError != nil {
		return domain.ErrValueEquivalentNotFound
	}

	result := repositoryInstance.database.WithContext(ctx).
		Where("user_id = ? AND id = ?", normalizedUserID, parsedID).
		Delete(&valueEquivalentRecord{})
	if result.Error != nil {
		return fmt.Errorf("delete value equivalent: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return domain.ErrValueEquivalentNotFound
	}

	return nil
}

func parseSQLiteTimestamp(value string) (time.Time, error) {
	if parsedTime, parseError := time.Parse(time.RFC3339Nano, value); parseError == nil {
		return parsedTime.UTC(), nil
	}
	if parsedTime, parseError := time.Parse(time.RFC3339, value); parseError == nil {
		return parsedTime.UTC(), nil
	}
	return time.Time{}, fmt.Errorf("invalid timestamp format: %q", value)
}
