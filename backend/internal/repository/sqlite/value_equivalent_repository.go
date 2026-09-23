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

type valueEquivalentScanner interface {
	Scan(destinations ...any) error
}

// ValueEquivalentRepository implements repository.ValueEquivalentRepository using user-scoped SQLite queries.
type ValueEquivalentRepository struct {
	databaseConnection *sql.DB
}

// NewValueEquivalentRepository creates a SQLite-backed value equivalent repository.
func NewValueEquivalentRepository(databaseConnection *sql.DB) repository.ValueEquivalentRepository {
	return &ValueEquivalentRepository{
		databaseConnection: databaseConnection,
	}
}

// List returns only the current user's value equivalents in deterministic order.
func (repositoryInstance *ValueEquivalentRepository) List(ctx context.Context, userID string) ([]domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	rows, queryError := repositoryInstance.databaseConnection.QueryContext(ctx, `
		SELECT user_id, id, name, amount_micros, currency_code, created_at, updated_at
		FROM value_equivalents
		WHERE user_id = ?
		ORDER BY id ASC
	`, normalizedUserID)
	if queryError != nil {
		return nil, fmt.Errorf("list value equivalents: %w", queryError)
	}
	defer rows.Close()

	valueEquivalents := make([]domain.ValueEquivalent, 0)
	for rows.Next() {
		equivalent, scanError := scanValueEquivalent(rows)
		if scanError != nil {
			return nil, scanError
		}
		valueEquivalents = append(valueEquivalents, equivalent)
	}

	if rowsError := rows.Err(); rowsError != nil {
		return nil, fmt.Errorf("iterate value equivalents: %w", rowsError)
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

	equivalent, scanError := scanValueEquivalent(repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		SELECT user_id, id, name, amount_micros, currency_code, created_at, updated_at
		FROM value_equivalents
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, parsedID))
	if errors.Is(scanError, sql.ErrNoRows) {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}
	if scanError != nil {
		return domain.ValueEquivalent{}, scanError
	}

	return equivalent, nil
}

// Create persists a new value equivalent under the current user and assigns its SQLite-generated identifier.
func (repositoryInstance *ValueEquivalentRepository) Create(ctx context.Context, userID string, equivalentToCreate domain.ValueEquivalent) (domain.ValueEquivalent, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.ValueEquivalent{}, identityError
	}

	amountMicros, conversionError := convertPriceToMicros(equivalentToCreate.Amount)
	if conversionError != nil {
		return domain.ValueEquivalent{}, conversionError
	}

	currentTime := time.Now().UTC()
	formattedTimestamp := currentTime.Format(time.RFC3339Nano)

	executionResult, insertError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		INSERT INTO value_equivalents (user_id, name, amount_micros, currency_code, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, normalizedUserID, strings.TrimSpace(equivalentToCreate.Name), amountMicros, strings.TrimSpace(equivalentToCreate.CurrencyCode), formattedTimestamp, formattedTimestamp)
	if insertError != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("insert value equivalent: %w", insertError)
	}

	generatedID, idError := executionResult.LastInsertId()
	if idError != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("retrieve value equivalent last insert identifier: %w", idError)
	}

	createdEquivalent := equivalentToCreate
	createdEquivalent.ID = strconv.FormatInt(generatedID, 10)
	createdEquivalent.UserID = normalizedUserID
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

	executionResult, updateError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		UPDATE value_equivalents
		SET name = ?, amount_micros = ?, currency_code = ?, updated_at = ?
		WHERE user_id = ? AND id = ?
	`, strings.TrimSpace(equivalentToUpdate.Name), amountMicros, strings.TrimSpace(equivalentToUpdate.CurrencyCode), formattedTimestamp, normalizedUserID, parsedID)
	if updateError != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("update value equivalent: %w", updateError)
	}

	affectedRows, rowsAffectedError := executionResult.RowsAffected()
	if rowsAffectedError != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("inspect value equivalent rows affected: %w", rowsAffectedError)
	}
	if affectedRows == 0 {
		return domain.ValueEquivalent{}, domain.ErrValueEquivalentNotFound
	}

	persistedEquivalent, retrieveError := repositoryInstance.GetByID(ctx, normalizedUserID, strconv.FormatInt(parsedID, 10))
	if retrieveError != nil {
		return domain.ValueEquivalent{}, retrieveError
	}

	return persistedEquivalent, nil
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

	executionResult, deleteError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		DELETE FROM value_equivalents
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, parsedID)
	if deleteError != nil {
		return fmt.Errorf("delete value equivalent: %w", deleteError)
	}

	affectedRows, rowsAffectedError := executionResult.RowsAffected()
	if rowsAffectedError != nil {
		return fmt.Errorf("inspect value equivalent delete rows affected: %w", rowsAffectedError)
	}
	if affectedRows == 0 {
		return domain.ErrValueEquivalentNotFound
	}

	return nil
}

func scanValueEquivalent(scanner valueEquivalentScanner) (domain.ValueEquivalent, error) {
	var (
		userID            string
		databaseID        int64
		name              string
		amountMicros      int64
		currencyCode      string
		createdAtString   string
		updatedAtString   string
	)

	scanError := scanner.Scan(
		&userID,
		&databaseID,
		&name,
		&amountMicros,
		&currencyCode,
		&createdAtString,
		&updatedAtString,
	)
	if scanError != nil {
		return domain.ValueEquivalent{}, scanError
	}

	createdAt, parseCreatedAtError := parseSQLiteTimestamp(createdAtString)
	if parseCreatedAtError != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("parse value equivalent created_at: %w", parseCreatedAtError)
	}

	updatedAt, parseUpdatedAtError := parseSQLiteTimestamp(updatedAtString)
	if parseUpdatedAtError != nil {
		return domain.ValueEquivalent{}, fmt.Errorf("parse value equivalent updated_at: %w", parseUpdatedAtError)
	}

	return domain.ValueEquivalent{
		ID:           strconv.FormatInt(databaseID, 10),
		UserID:       userID,
		Name:         name,
		Amount:       convertMicrosToPrice(amountMicros),
		CurrencyCode: currencyCode,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
	}, nil
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
