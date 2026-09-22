package sqlite

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"cost-per-day/backend/internal/domain"
)

// ReplaceAll atomically replaces every stored item in one SQLite transaction.
func (repositoryInstance *ItemRepository) ReplaceAll(ctx context.Context, items []domain.Item) ([]domain.Item, error) {
	transaction, beginError := repositoryInstance.databaseConnection.BeginTx(ctx, nil)
	if beginError != nil {
		return nil, fmt.Errorf("begin item replacement: %w", beginError)
	}
	defer func() {
		_ = transaction.Rollback()
	}()

	if _, deleteError := transaction.ExecContext(ctx, "DELETE FROM items"); deleteError != nil {
		return nil, fmt.Errorf("clear items for replacement: %w", deleteError)
	}

	createdItems := make([]domain.Item, 0, len(items))
	for _, itemToCreate := range items {
		priceMicros, conversionError := convertPriceToMicros(itemToCreate.Price)
		if conversionError != nil {
			return nil, conversionError
		}
		itemToCreate.Price = convertMicrosToPrice(priceMicros)

		currentTimestamp := time.Now().UTC()
		itemToCreate.CreatedAt = currentTimestamp
		itemToCreate.UpdatedAt = currentTimestamp

		insertResult, insertError := transaction.ExecContext(ctx, `
			INSERT INTO items (name, price_micros, purchase_date, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?)
		`,
			itemToCreate.Name,
			priceMicros,
			itemToCreate.PurchaseDate,
			itemToCreate.CreatedAt.Format(time.RFC3339Nano),
			itemToCreate.UpdatedAt.Format(time.RFC3339Nano),
		)
		if insertError != nil {
			return nil, fmt.Errorf("create replacement item: %w", insertError)
		}

		itemIdentifier, identifierError := insertResult.LastInsertId()
		if identifierError != nil {
			return nil, fmt.Errorf("read replacement item identifier: %w", identifierError)
		}

		itemToCreate.ID = strconv.FormatInt(itemIdentifier, 10)
		createdItems = append(createdItems, itemToCreate)
	}

	if commitError := transaction.Commit(); commitError != nil {
		return nil, fmt.Errorf("commit item replacement: %w", commitError)
	}

	return createdItems, nil
}
