package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

type plannedPurchaseScanner interface {
	Scan(destinations ...any) error
}

// PlannedPurchaseRepository implements repository.PlannedPurchaseRepository using user-scoped SQLite queries through GORM.
type PlannedPurchaseRepository struct {
	database *gorm.DB
}

// NewPlannedPurchaseRepository creates a GORM-backed planned purchase repository.
func NewPlannedPurchaseRepository(database *gorm.DB) repository.PlannedPurchaseRepository {
	return &PlannedPurchaseRepository{
		database: database,
	}
}

// List returns only the current user's planned purchases in deterministic order.
func (repositoryInstance *PlannedPurchaseRepository) List(ctx context.Context, userID string) ([]domain.PlannedPurchase, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	rows, queryError := repositoryInstance.database.WithContext(ctx).Raw(`
		SELECT user_id, id, name, target_price_micros, currency_code, target_date, contribution_amount_micros, contribution_cadence, created_at, updated_at
		FROM planned_purchases
		WHERE user_id = ?
		ORDER BY id ASC
	`, normalizedUserID).Rows()
	if queryError != nil {
		return nil, fmt.Errorf("list planned purchases: %w", queryError)
	}
	defer rows.Close()

	plannedPurchases := make([]domain.PlannedPurchase, 0)
	for rows.Next() {
		plannedPurchase, scanError := scanPlannedPurchase(rows)
		if scanError != nil {
			return nil, scanError
		}
		plannedPurchases = append(plannedPurchases, plannedPurchase)
	}

	if rowsError := rows.Err(); rowsError != nil {
		return nil, fmt.Errorf("iterate planned purchases: %w", rowsError)
	}

	return plannedPurchases, nil
}

// GetByID returns a planned purchase only when both its identifier and owner match.
func (repositoryInstance *PlannedPurchaseRepository) GetByID(ctx context.Context, userID string, id string) (domain.PlannedPurchase, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.PlannedPurchase{}, identityError
	}

	parsedID, parseError := strconv.ParseInt(strings.TrimSpace(id), 10, 64)
	if parseError != nil {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}

	plannedPurchase, scanError := scanPlannedPurchase(repositoryInstance.database.WithContext(ctx).Raw(`
		SELECT user_id, id, name, target_price_micros, currency_code, target_date, contribution_amount_micros, contribution_cadence, created_at, updated_at
		FROM planned_purchases
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, parsedID).Row())
	if errors.Is(scanError, sql.ErrNoRows) {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}
	if scanError != nil {
		return domain.PlannedPurchase{}, scanError
	}

	return plannedPurchase, nil
}

// Create persists a new planned purchase under the current user and assigns its SQLite-generated identifier.
func (repositoryInstance *PlannedPurchaseRepository) Create(ctx context.Context, userID string, purchaseToCreate domain.PlannedPurchase) (domain.PlannedPurchase, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.PlannedPurchase{}, identityError
	}

	targetPriceMicros, conversionError := convertPriceToMicros(purchaseToCreate.TargetPrice)
	if conversionError != nil {
		return domain.PlannedPurchase{}, conversionError
	}

	var targetDateValue any = nil
	if purchaseToCreate.TargetDate != nil && strings.TrimSpace(*purchaseToCreate.TargetDate) != "" {
		targetDateValue = strings.TrimSpace(*purchaseToCreate.TargetDate)
	}

	var contributionAmountMicrosValue any = nil
	if purchaseToCreate.ContributionAmount != nil && *purchaseToCreate.ContributionAmount > 0 {
		convertedMicros, conversionError := convertPriceToMicros(*purchaseToCreate.ContributionAmount)
		if conversionError != nil {
			return domain.PlannedPurchase{}, conversionError
		}
		contributionAmountMicrosValue = convertedMicros
	}

	var contributionCadenceValue any = nil
	if purchaseToCreate.ContributionCadence != nil && strings.TrimSpace(string(*purchaseToCreate.ContributionCadence)) != "" {
		contributionCadenceValue = strings.TrimSpace(string(*purchaseToCreate.ContributionCadence))
	}

	currentTime := time.Now().UTC()
	formattedTimestamp := currentTime.Format(time.RFC3339Nano)

	var generatedID int64
	insertError := repositoryInstance.database.WithContext(ctx).Raw(`
		INSERT INTO planned_purchases (user_id, name, target_price_micros, currency_code, target_date, contribution_amount_micros, contribution_cadence, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, normalizedUserID, strings.TrimSpace(purchaseToCreate.Name), targetPriceMicros, strings.TrimSpace(purchaseToCreate.CurrencyCode), targetDateValue, contributionAmountMicrosValue, contributionCadenceValue, formattedTimestamp, formattedTimestamp).Row().Scan(&generatedID)
	if insertError != nil {
		return domain.PlannedPurchase{}, fmt.Errorf("insert planned purchase: %w", insertError)
	}

	createdPurchase := purchaseToCreate
	createdPurchase.ID = strconv.FormatInt(generatedID, 10)
	createdPurchase.UserID = normalizedUserID
	createdPurchase.TargetPrice = convertMicrosToPrice(targetPriceMicros)
	createdPurchase.CreatedAt = currentTime
	createdPurchase.UpdatedAt = currentTime

	return createdPurchase, nil
}

// Update replaces mutable fields on an existing planned purchase owned by the current user.
func (repositoryInstance *PlannedPurchaseRepository) Update(ctx context.Context, userID string, purchaseToUpdate domain.PlannedPurchase) (domain.PlannedPurchase, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.PlannedPurchase{}, identityError
	}

	parsedID, parseError := strconv.ParseInt(strings.TrimSpace(purchaseToUpdate.ID), 10, 64)
	if parseError != nil {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}

	targetPriceMicros, conversionError := convertPriceToMicros(purchaseToUpdate.TargetPrice)
	if conversionError != nil {
		return domain.PlannedPurchase{}, conversionError
	}

	var targetDateValue any = nil
	if purchaseToUpdate.TargetDate != nil && strings.TrimSpace(*purchaseToUpdate.TargetDate) != "" {
		targetDateValue = strings.TrimSpace(*purchaseToUpdate.TargetDate)
	}

	var contributionAmountMicrosValue any = nil
	if purchaseToUpdate.ContributionAmount != nil && *purchaseToUpdate.ContributionAmount > 0 {
		convertedMicros, conversionError := convertPriceToMicros(*purchaseToUpdate.ContributionAmount)
		if conversionError != nil {
			return domain.PlannedPurchase{}, conversionError
		}
		contributionAmountMicrosValue = convertedMicros
	}

	var contributionCadenceValue any = nil
	if purchaseToUpdate.ContributionCadence != nil && strings.TrimSpace(string(*purchaseToUpdate.ContributionCadence)) != "" {
		contributionCadenceValue = strings.TrimSpace(string(*purchaseToUpdate.ContributionCadence))
	}

	currentTime := time.Now().UTC()
	formattedTimestamp := currentTime.Format(time.RFC3339Nano)

	updateResult := repositoryInstance.database.WithContext(ctx).Exec(`
		UPDATE planned_purchases
		SET name = ?, target_price_micros = ?, currency_code = ?, target_date = ?, contribution_amount_micros = ?, contribution_cadence = ?, updated_at = ?
		WHERE user_id = ? AND id = ?
	`, strings.TrimSpace(purchaseToUpdate.Name), targetPriceMicros, strings.TrimSpace(purchaseToUpdate.CurrencyCode), targetDateValue, contributionAmountMicrosValue, contributionCadenceValue, formattedTimestamp, normalizedUserID, parsedID)
	if updateResult.Error != nil {
		return domain.PlannedPurchase{}, fmt.Errorf("update planned purchase: %w", updateResult.Error)
	}

	if updateResult.RowsAffected == 0 {
		return domain.PlannedPurchase{}, domain.ErrPlannedPurchaseNotFound
	}

	persistedPurchase, retrieveError := repositoryInstance.GetByID(ctx, normalizedUserID, strconv.FormatInt(parsedID, 10))
	if retrieveError != nil {
		return domain.PlannedPurchase{}, retrieveError
	}

	return persistedPurchase, nil
}

// Delete removes a planned purchase only when owned by the current user.
func (repositoryInstance *PlannedPurchaseRepository) Delete(ctx context.Context, userID string, id string) error {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return identityError
	}

	parsedID, parseError := strconv.ParseInt(strings.TrimSpace(id), 10, 64)
	if parseError != nil {
		return domain.ErrPlannedPurchaseNotFound
	}

	deleteResult := repositoryInstance.database.WithContext(ctx).Exec(`
		DELETE FROM planned_purchases
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, parsedID)
	if deleteResult.Error != nil {
		return fmt.Errorf("delete planned purchase: %w", deleteResult.Error)
	}

	if deleteResult.RowsAffected == 0 {
		return domain.ErrPlannedPurchaseNotFound
	}

	return nil
}

func scanPlannedPurchase(scanner plannedPurchaseScanner) (domain.PlannedPurchase, error) {
	var (
		userID                        string
		databaseID                    int64
		name                          string
		targetPriceMicros             int64
		currencyCode                  string
		targetDateNullable            sql.NullString
		contributionAmountMicrosNull  sql.NullInt64
		contributionCadenceNullable   sql.NullString
		createdAtString               string
		updatedAtString               string
	)

	scanError := scanner.Scan(
		&userID,
		&databaseID,
		&name,
		&targetPriceMicros,
		&currencyCode,
		&targetDateNullable,
		&contributionAmountMicrosNull,
		&contributionCadenceNullable,
		&createdAtString,
		&updatedAtString,
	)
	if scanError != nil {
		return domain.PlannedPurchase{}, scanError
	}

	createdAt, parseCreatedAtError := parseSQLiteTimestamp(createdAtString)
	if parseCreatedAtError != nil {
		return domain.PlannedPurchase{}, fmt.Errorf("parse planned purchase created_at: %w", parseCreatedAtError)
	}

	updatedAt, parseUpdatedAtError := parseSQLiteTimestamp(updatedAtString)
	if parseUpdatedAtError != nil {
		return domain.PlannedPurchase{}, fmt.Errorf("parse planned purchase updated_at: %w", parseUpdatedAtError)
	}

	var targetDate *string
	if targetDateNullable.Valid && strings.TrimSpace(targetDateNullable.String) != "" {
		trimmedDate := strings.TrimSpace(targetDateNullable.String)
		targetDate = &trimmedDate
	}

	var contributionAmount *float64
	if contributionAmountMicrosNull.Valid {
		amount := convertMicrosToPrice(contributionAmountMicrosNull.Int64)
		contributionAmount = &amount
	}

	var contributionCadence *domain.ContributionCadence
	if contributionCadenceNullable.Valid && strings.TrimSpace(contributionCadenceNullable.String) != "" {
		cadence := domain.ContributionCadence(strings.TrimSpace(contributionCadenceNullable.String))
		contributionCadence = &cadence
	}

	return domain.PlannedPurchase{
		ID:                  strconv.FormatInt(databaseID, 10),
		UserID:              userID,
		Name:                name,
		TargetPrice:         convertMicrosToPrice(targetPriceMicros),
		CurrencyCode:        currencyCode,
		TargetDate:          targetDate,
		ContributionAmount:  contributionAmount,
		ContributionCadence: contributionCadence,
		CreatedAt:           createdAt,
		UpdatedAt:           updatedAt,
	}, nil
}
