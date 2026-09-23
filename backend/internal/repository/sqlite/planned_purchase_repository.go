package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

type plannedPurchaseScanner interface {
	Scan(destinations ...any) error
}

// PlannedPurchaseRepository implements repository.PlannedPurchaseRepository using user-scoped SQLite queries.
type PlannedPurchaseRepository struct {
	databaseConnection *sql.DB
}

// NewPlannedPurchaseRepository creates a SQLite-backed planned purchase repository.
func NewPlannedPurchaseRepository(databaseConnection *sql.DB) repository.PlannedPurchaseRepository {
	return &PlannedPurchaseRepository{
		databaseConnection: databaseConnection,
	}
}

// List returns only the current user's planned purchases in deterministic order.
func (repositoryInstance *PlannedPurchaseRepository) List(ctx context.Context, userID string) ([]domain.PlannedPurchase, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	rows, queryError := repositoryInstance.databaseConnection.QueryContext(ctx, `
		SELECT user_id, id, name, target_price_micros, currency_code, target_date, contribution_amount_micros, contribution_cadence, created_at, updated_at
		FROM planned_purchases
		WHERE user_id = ?
		ORDER BY id ASC
	`, normalizedUserID)
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

	plannedPurchase, scanError := scanPlannedPurchase(repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		SELECT user_id, id, name, target_price_micros, currency_code, target_date, contribution_amount_micros, contribution_cadence, created_at, updated_at
		FROM planned_purchases
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, parsedID))
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

	executionResult, insertError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		INSERT INTO planned_purchases (user_id, name, target_price_micros, currency_code, target_date, contribution_amount_micros, contribution_cadence, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, normalizedUserID, strings.TrimSpace(purchaseToCreate.Name), targetPriceMicros, strings.TrimSpace(purchaseToCreate.CurrencyCode), targetDateValue, contributionAmountMicrosValue, contributionCadenceValue, formattedTimestamp, formattedTimestamp)
	if insertError != nil {
		return domain.PlannedPurchase{}, fmt.Errorf("insert planned purchase: %w", insertError)
	}

	generatedID, idError := executionResult.LastInsertId()
	if idError != nil {
		return domain.PlannedPurchase{}, fmt.Errorf("retrieve planned purchase last insert identifier: %w", idError)
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

	executionResult, updateError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		UPDATE planned_purchases
		SET name = ?, target_price_micros = ?, currency_code = ?, target_date = ?, contribution_amount_micros = ?, contribution_cadence = ?, updated_at = ?
		WHERE user_id = ? AND id = ?
	`, strings.TrimSpace(purchaseToUpdate.Name), targetPriceMicros, strings.TrimSpace(purchaseToUpdate.CurrencyCode), targetDateValue, contributionAmountMicrosValue, contributionCadenceValue, formattedTimestamp, normalizedUserID, parsedID)
	if updateError != nil {
		return domain.PlannedPurchase{}, fmt.Errorf("update planned purchase: %w", updateError)
	}

	affectedRows, rowsAffectedError := executionResult.RowsAffected()
	if rowsAffectedError != nil {
		return domain.PlannedPurchase{}, fmt.Errorf("inspect planned purchase rows affected: %w", rowsAffectedError)
	}
	if affectedRows == 0 {
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

	executionResult, deleteError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		DELETE FROM planned_purchases
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, parsedID)
	if deleteError != nil {
		return fmt.Errorf("delete planned purchase: %w", deleteError)
	}

	affectedRows, rowsAffectedError := executionResult.RowsAffected()
	if rowsAffectedError != nil {
		return fmt.Errorf("inspect planned purchase delete rows affected: %w", rowsAffectedError)
	}
	if affectedRows == 0 {
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
