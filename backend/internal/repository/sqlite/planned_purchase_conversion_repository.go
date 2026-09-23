package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// PlannedPurchaseConversionRepository converts a user-owned plan into an owned item in one SQLite transaction.
type PlannedPurchaseConversionRepository struct {
	databaseConnection *sql.DB
}

// NewPlannedPurchaseConversionRepository creates a SQLite-backed conversion repository.
func NewPlannedPurchaseConversionRepository(databaseConnection *sql.DB) repository.PlannedPurchaseConversionRepository {
	return &PlannedPurchaseConversionRepository{databaseConnection: databaseConnection}
}

// Convert creates the owned item first and removes the source plan only inside the same committed transaction.
func (repositoryInstance *PlannedPurchaseConversionRepository) Convert(
	ctx context.Context,
	userID string,
	plannedPurchaseID string,
	item domain.Item,
) (domain.Item, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	parsedID, parseError := strconv.ParseInt(strings.TrimSpace(plannedPurchaseID), 10, 64)
	if parseError != nil {
		return domain.Item{}, domain.ErrPlannedPurchaseNotFound
	}

	transaction, beginError := repositoryInstance.databaseConnection.BeginTx(ctx, nil)
	if beginError != nil {
		return domain.Item{}, fmt.Errorf("begin planned purchase conversion: %w", beginError)
	}
	defer func() {
		_ = transaction.Rollback()
	}()

	var existingID int64
	lookupError := transaction.QueryRowContext(ctx, `
		SELECT id
		FROM planned_purchases
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, parsedID).Scan(&existingID)
	if errors.Is(lookupError, sql.ErrNoRows) {
		return domain.Item{}, domain.ErrPlannedPurchaseNotFound
	}
	if lookupError != nil {
		return domain.Item{}, fmt.Errorf("load planned purchase for conversion: %w", lookupError)
	}

	createdItem, createError := createItemWithExecutor(ctx, transaction, normalizedUserID, item)
	if createError != nil {
		return domain.Item{}, createError
	}

	deleteResult, deleteError := transaction.ExecContext(ctx, `
		DELETE FROM planned_purchases
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, parsedID)
	if deleteError != nil {
		return domain.Item{}, fmt.Errorf("delete converted planned purchase: %w", deleteError)
	}

	affectedRows, rowsError := deleteResult.RowsAffected()
	if rowsError != nil {
		return domain.Item{}, fmt.Errorf("inspect converted planned purchase rows affected: %w", rowsError)
	}
	if affectedRows != 1 {
		return domain.Item{}, domain.ErrPlannedPurchaseNotFound
	}

	if commitError := transaction.Commit(); commitError != nil {
		return domain.Item{}, fmt.Errorf("commit planned purchase conversion: %w", commitError)
	}

	return createdItem, nil
}
