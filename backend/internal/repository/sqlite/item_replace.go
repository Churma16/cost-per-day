package sqlite

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"cost-per-day/backend/internal/domain"
)

// ReplaceAll atomically replaces only the current user's stored items.
func (repositoryInstance *ItemRepository) ReplaceAll(ctx context.Context, userID string, items []domain.Item) ([]domain.Item, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	transaction, beginError := repositoryInstance.databaseConnection.BeginTx(ctx, nil)
	if beginError != nil {
		return nil, fmt.Errorf("begin item replacement: %w", beginError)
	}
	defer func() {
		_ = transaction.Rollback()
	}()

	if _, deleteError := transaction.ExecContext(ctx, "DELETE FROM items WHERE user_id = ?", normalizedUserID); deleteError != nil {
		return nil, fmt.Errorf("clear items for replacement: %w", deleteError)
	}

	createdItems := make([]domain.Item, 0, len(items))
	for _, itemToCreate := range items {
		priceMicros, conversionError := convertPriceToMicros(itemToCreate.Price)
		if conversionError != nil {
			return nil, conversionError
		}
		itemToCreate.Price = convertMicrosToPrice(priceMicros)

		salePriceMicros, saleConversionError := convertOptionalSalePriceToMicros(itemToCreate.SalePrice)
		if saleConversionError != nil {
			return nil, saleConversionError
		}
		if itemToCreate.SalePrice != nil {
			normalizedSalePrice := convertMicrosToPrice(*salePriceMicros)
			itemToCreate.SalePrice = &normalizedSalePrice
		}

		if itemToCreate.Status == "" {
			itemToCreate.Status = domain.ItemStatusActive
		}

		currentTimestamp := time.Now().UTC()
		itemToCreate.UserID = normalizedUserID
		itemToCreate.CreatedAt = currentTimestamp
		itemToCreate.UpdatedAt = currentTimestamp

		insertResult, insertError := transaction.ExecContext(ctx, `
			INSERT INTO items (
				user_id,
				name,
				price_micros,
				purchase_date,
				status,
				ended_at,
				sale_price_micros,
				target_type,
				target_value,
				category_id,
				brand_id,
				created_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			normalizedUserID,
			itemToCreate.Name,
			priceMicros,
			itemToCreate.PurchaseDate,
			string(itemToCreate.Status),
			nullableString(itemToCreate.EndedAt),
			nullableInt64(salePriceMicros),
			nullableTargetType(itemToCreate.TargetType),
			nullableFloat64(itemToCreate.TargetValue),
			nullableInt64(itemToCreate.CategoryID),
			nullableInt64(itemToCreate.BrandID),
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
