package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

const priceMicrosPerUnit int64 = 1_000_000

type itemScanner interface {
	Scan(destinations ...any) error
}

type itemCommandExecutor interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// ItemRepository implements repository.ItemRepository using user-scoped SQLite queries.
type ItemRepository struct {
	databaseConnection *sql.DB
}

// NewItemRepository creates a SQLite-backed item repository.
func NewItemRepository(databaseConnection *sql.DB) repository.ItemRepository {
	return &ItemRepository{
		databaseConnection: databaseConnection,
	}
}

// List returns only the current user's items in deterministic identifier order.
func (repositoryInstance *ItemRepository) List(ctx context.Context, userID string) ([]domain.Item, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	rows, queryError := repositoryInstance.databaseConnection.QueryContext(ctx, `
		SELECT user_id, id, name, price_micros, purchase_date, status, ended_at, sale_price_micros, target_type, target_value, created_at, updated_at
		FROM items
		WHERE user_id = ?
		ORDER BY id ASC
	`, normalizedUserID)
	if queryError != nil {
		return nil, fmt.Errorf("list items: %w", queryError)
	}
	defer rows.Close()

	items := make([]domain.Item, 0)
	for rows.Next() {
		item, scanError := scanItem(rows)
		if scanError != nil {
			return nil, scanError
		}
		items = append(items, item)
	}

	if rowsError := rows.Err(); rowsError != nil {
		return nil, fmt.Errorf("iterate items: %w", rowsError)
	}

	return items, nil
}

// GetByID returns an item only when both its identifier and owner match.
func (repositoryInstance *ItemRepository) GetByID(ctx context.Context, userID string, itemID string) (domain.Item, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	item, scanError := scanItem(repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		SELECT user_id, id, name, price_micros, purchase_date, status, ended_at, sale_price_micros, target_type, target_value, created_at, updated_at
		FROM items
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, itemID))
	if errors.Is(scanError, sql.ErrNoRows) {
		return domain.Item{}, domain.ErrItemNotFound
	}
	if scanError != nil {
		return domain.Item{}, scanError
	}

	return item, nil
}

// Create persists a new item under the current user and assigns its SQLite-generated identifier.
func (repositoryInstance *ItemRepository) Create(ctx context.Context, userID string, itemToCreate domain.Item) (domain.Item, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	return createItemWithExecutor(ctx, repositoryInstance.databaseConnection, normalizedUserID, itemToCreate)
}

func createItemWithExecutor(
	ctx context.Context,
	executor itemCommandExecutor,
	normalizedUserID string,
	itemToCreate domain.Item,
) (domain.Item, error) {
	priceMicros, conversionError := convertPriceToMicros(itemToCreate.Price)
	if conversionError != nil {
		return domain.Item{}, conversionError
	}
	itemToCreate.Price = convertMicrosToPrice(priceMicros)

	salePriceMicros, saleConversionError := convertOptionalSalePriceToMicros(itemToCreate.SalePrice)
	if saleConversionError != nil {
		return domain.Item{}, saleConversionError
	}
	if itemToCreate.SalePrice != nil {
		normalizedSalePrice := convertMicrosToPrice(*salePriceMicros)
		itemToCreate.SalePrice = &normalizedSalePrice
	}

	if itemToCreate.Status == "" {
		itemToCreate.Status = domain.ItemStatusActive
	}

	currentTimestamp := time.Now().UTC()
	if itemToCreate.CreatedAt.IsZero() {
		itemToCreate.CreatedAt = currentTimestamp
	} else {
		itemToCreate.CreatedAt = itemToCreate.CreatedAt.UTC()
	}
	itemToCreate.UpdatedAt = currentTimestamp
	itemToCreate.UserID = normalizedUserID

	insertResult, insertError := executor.ExecContext(ctx, `
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
			created_at,
			updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
		itemToCreate.CreatedAt.Format(time.RFC3339Nano),
		itemToCreate.UpdatedAt.Format(time.RFC3339Nano),
	)
	if insertError != nil {
		return domain.Item{}, fmt.Errorf("create item: %w", insertError)
	}

	itemIdentifier, identifierError := insertResult.LastInsertId()
	if identifierError != nil {
		return domain.Item{}, fmt.Errorf("read created item identifier: %w", identifierError)
	}

	itemToCreate.ID = strconv.FormatInt(itemIdentifier, 10)
	return itemToCreate, nil
}

// Update replaces mutable item fields only when the item belongs to the current user.
func (repositoryInstance *ItemRepository) Update(ctx context.Context, userID string, itemToUpdate domain.Item) (domain.Item, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	priceMicros, conversionError := convertPriceToMicros(itemToUpdate.Price)
	if conversionError != nil {
		return domain.Item{}, conversionError
	}
	itemToUpdate.Price = convertMicrosToPrice(priceMicros)

	salePriceMicros, saleConversionError := convertOptionalSalePriceToMicros(itemToUpdate.SalePrice)
	if saleConversionError != nil {
		return domain.Item{}, saleConversionError
	}
	if itemToUpdate.SalePrice != nil {
		normalizedSalePrice := convertMicrosToPrice(*salePriceMicros)
		itemToUpdate.SalePrice = &normalizedSalePrice
	}

	if itemToUpdate.Status == "" {
		itemToUpdate.Status = domain.ItemStatusActive
	}

	itemToUpdate.UserID = normalizedUserID
	itemToUpdate.UpdatedAt = time.Now().UTC()

	var createdAtText string
	updateError := repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		UPDATE items
		SET
			name = ?,
			price_micros = ?,
			purchase_date = ?,
			status = ?,
			ended_at = ?,
			sale_price_micros = ?,
			target_type = ?,
			target_value = ?,
			updated_at = ?
		WHERE user_id = ? AND id = ?
		RETURNING created_at
	`,
		itemToUpdate.Name,
		priceMicros,
		itemToUpdate.PurchaseDate,
		string(itemToUpdate.Status),
		nullableString(itemToUpdate.EndedAt),
		nullableInt64(salePriceMicros),
		nullableTargetType(itemToUpdate.TargetType),
		nullableFloat64(itemToUpdate.TargetValue),
		itemToUpdate.UpdatedAt.Format(time.RFC3339Nano),
		normalizedUserID,
		itemToUpdate.ID,
	).Scan(&createdAtText)
	if errors.Is(updateError, sql.ErrNoRows) {
		return domain.Item{}, domain.ErrItemNotFound
	}
	if updateError != nil {
		return domain.Item{}, fmt.Errorf("update item: %w", updateError)
	}

	createdAt, parseError := time.Parse(time.RFC3339Nano, createdAtText)
	if parseError != nil {
		return domain.Item{}, fmt.Errorf("parse item created timestamp: %w", parseError)
	}

	itemToUpdate.CreatedAt = createdAt.UTC()
	return itemToUpdate, nil
}

// Delete removes an item only when it belongs to the current user.
func (repositoryInstance *ItemRepository) Delete(ctx context.Context, userID string, itemID string) error {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return identityError
	}

	deleteResult, deleteError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		DELETE FROM items
		WHERE user_id = ? AND id = ?
	`, normalizedUserID, itemID)
	if deleteError != nil {
		return fmt.Errorf("delete item: %w", deleteError)
	}

	affectedRows, rowsError := deleteResult.RowsAffected()
	if rowsError != nil {
		return fmt.Errorf("read deleted item count: %w", rowsError)
	}
	if affectedRows == 0 {
		return domain.ErrItemNotFound
	}

	return nil
}

func scanItem(scanner itemScanner) (domain.Item, error) {
	var (
		itemIdentifier  int64
		priceMicros     int64
		statusText      string
		endedAtText     sql.NullString
		salePriceMicros sql.NullInt64
		targetTypeText  sql.NullString
		targetValueNum  sql.NullFloat64
		createdAtText   string
		updatedAtText   string
		item            domain.Item
	)

	scanError := scanner.Scan(
		&item.UserID,
		&itemIdentifier,
		&item.Name,
		&priceMicros,
		&item.PurchaseDate,
		&statusText,
		&endedAtText,
		&salePriceMicros,
		&targetTypeText,
		&targetValueNum,
		&createdAtText,
		&updatedAtText,
	)
	if scanError != nil {
		return domain.Item{}, scanError
	}

	createdAt, createdAtError := time.Parse(time.RFC3339Nano, createdAtText)
	if createdAtError != nil {
		return domain.Item{}, fmt.Errorf("parse item created timestamp: %w", createdAtError)
	}
	updatedAt, updatedAtError := time.Parse(time.RFC3339Nano, updatedAtText)
	if updatedAtError != nil {
		return domain.Item{}, fmt.Errorf("parse item updated timestamp: %w", updatedAtError)
	}

	item.ID = strconv.FormatInt(itemIdentifier, 10)
	item.Price = convertMicrosToPrice(priceMicros)
	item.Status = domain.ItemStatus(statusText)
	if item.Status == "" {
		item.Status = domain.ItemStatusActive
	}
	if endedAtText.Valid {
		endedAt := endedAtText.String
		item.EndedAt = &endedAt
	}
	if salePriceMicros.Valid {
		salePrice := convertMicrosToPrice(salePriceMicros.Int64)
		item.SalePrice = &salePrice
	}
	if targetTypeText.Valid && strings.TrimSpace(targetTypeText.String) != "" {
		targetType := domain.OwnershipTargetType(targetTypeText.String)
		item.TargetType = &targetType
	}
	if targetValueNum.Valid {
		targetValue := targetValueNum.Float64
		item.TargetValue = &targetValue
	}
	item.CreatedAt = createdAt.UTC()
	item.UpdatedAt = updatedAt.UTC()

	return item, nil
}

func requireSQLiteUserID(userID string) (string, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return "", domain.ErrUserIdentityRequired
	}
	return normalizedUserID, nil
}

func nullableString(value *string) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableInt64(value *int64) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableTargetType(value *domain.OwnershipTargetType) any {
	if value == nil {
		return nil
	}
	return string(*value)
}

func nullableFloat64(value *float64) any {
	if value == nil {
		return nil
	}
	return *value
}

func convertOptionalSalePriceToMicros(salePrice *float64) (*int64, error) {
	if salePrice == nil {
		return nil, nil
	}

	convertedValue, conversionError := convertNonNegativePriceToMicros(*salePrice)
	if conversionError != nil {
		return nil, conversionError
	}
	return &convertedValue, nil
}

func convertMicrosToPrice(priceMicros int64) float64 {
	return float64(priceMicros) / float64(priceMicrosPerUnit)
}

func convertPriceToMicros(price float64) (int64, error) {
	if price <= 0 || math.IsNaN(price) || math.IsInf(price, 0) {
		return 0, fmt.Errorf("price must be a finite positive value")
	}

	scaledPrice := price * float64(priceMicrosPerUnit)
	if scaledPrice >= float64(math.MaxInt64) {
		return 0, fmt.Errorf("price exceeds sqlite storage range")
	}

	priceMicros := int64(math.Round(scaledPrice))
	if priceMicros <= 0 {
		return 0, fmt.Errorf("price is smaller than supported six-decimal precision")
	}

	return priceMicros, nil
}

func convertNonNegativePriceToMicros(price float64) (int64, error) {
	if price < 0 || math.IsNaN(price) || math.IsInf(price, 0) {
		return 0, fmt.Errorf("sale price must be a finite non-negative value")
	}

	scaledPrice := price * float64(priceMicrosPerUnit)
	if scaledPrice >= float64(math.MaxInt64) {
		return 0, fmt.Errorf("sale price exceeds sqlite storage range")
	}

	priceMicros := int64(math.Round(scaledPrice))
	if price > 0 && priceMicros <= 0 {
		return 0, fmt.Errorf("sale price is smaller than supported six-decimal precision")
	}

	return priceMicros, nil
}
