package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strconv"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

const priceMicrosPerUnit int64 = 1_000_000

type itemScanner interface {
	Scan(destinations ...any) error
}

// ItemRepository implements repository.ItemRepository using explicit SQLite queries.
type ItemRepository struct {
	databaseConnection *sql.DB
}

// NewItemRepository creates a SQLite-backed item repository.
func NewItemRepository(databaseConnection *sql.DB) repository.ItemRepository {
	return &ItemRepository{
		databaseConnection: databaseConnection,
	}
}

// List returns all items in deterministic identifier order.
func (repositoryInstance *ItemRepository) List(ctx context.Context) ([]domain.Item, error) {
	rows, queryError := repositoryInstance.databaseConnection.QueryContext(ctx, `
		SELECT id, name, price_micros, purchase_date, created_at, updated_at
		FROM items
		ORDER BY id ASC
	`)
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

// GetByID returns a single item by identifier.
func (repositoryInstance *ItemRepository) GetByID(ctx context.Context, itemID string) (domain.Item, error) {
	item, scanError := scanItem(repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		SELECT id, name, price_micros, purchase_date, created_at, updated_at
		FROM items
		WHERE id = ?
	`, itemID))
	if errors.Is(scanError, sql.ErrNoRows) {
		return domain.Item{}, domain.ErrItemNotFound
	}
	if scanError != nil {
		return domain.Item{}, scanError
	}

	return item, nil
}

// Create persists a new item and assigns its SQLite-generated identifier.
func (repositoryInstance *ItemRepository) Create(ctx context.Context, itemToCreate domain.Item) (domain.Item, error) {
	priceMicros, conversionError := convertPriceToMicros(itemToCreate.Price)
	if conversionError != nil {
		return domain.Item{}, conversionError
	}
	itemToCreate.Price = convertMicrosToPrice(priceMicros)

	currentTimestamp := time.Now().UTC()
	if itemToCreate.CreatedAt.IsZero() {
		itemToCreate.CreatedAt = currentTimestamp
	} else {
		itemToCreate.CreatedAt = itemToCreate.CreatedAt.UTC()
	}
	itemToCreate.UpdatedAt = currentTimestamp

	insertResult, insertError := repositoryInstance.databaseConnection.ExecContext(ctx, `
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
		return domain.Item{}, fmt.Errorf("create item: %w", insertError)
	}

	itemIdentifier, identifierError := insertResult.LastInsertId()
	if identifierError != nil {
		return domain.Item{}, fmt.Errorf("read created item identifier: %w", identifierError)
	}

	itemToCreate.ID = strconv.FormatInt(itemIdentifier, 10)
	return itemToCreate, nil
}

// Update replaces mutable item fields while preserving the original creation timestamp.
func (repositoryInstance *ItemRepository) Update(ctx context.Context, itemToUpdate domain.Item) (domain.Item, error) {
	priceMicros, conversionError := convertPriceToMicros(itemToUpdate.Price)
	if conversionError != nil {
		return domain.Item{}, conversionError
	}
	itemToUpdate.Price = convertMicrosToPrice(priceMicros)

	itemToUpdate.UpdatedAt = time.Now().UTC()

	var createdAtText string
	updateError := repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		UPDATE items
		SET name = ?, price_micros = ?, purchase_date = ?, updated_at = ?
		WHERE id = ?
		RETURNING created_at
	`,
		itemToUpdate.Name,
		priceMicros,
		itemToUpdate.PurchaseDate,
		itemToUpdate.UpdatedAt.Format(time.RFC3339Nano),
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

// Delete removes an item by identifier.
func (repositoryInstance *ItemRepository) Delete(ctx context.Context, itemID string) error {
	deleteResult, deleteError := repositoryInstance.databaseConnection.ExecContext(ctx, `
		DELETE FROM items
		WHERE id = ?
	`, itemID)
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
		itemIdentifier int64
		priceMicros    int64
		createdAtText  string
		updatedAtText  string
		item            domain.Item
	)

	scanError := scanner.Scan(
		&itemIdentifier,
		&item.Name,
		&priceMicros,
		&item.PurchaseDate,
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
	item.CreatedAt = createdAt.UTC()
	item.UpdatedAt = updatedAt.UTC()

	return item, nil
}

func convertMicrosToPrice(priceMicros int64) float64 {
	return float64(priceMicros) / float64(priceMicrosPerUnit)
}

func convertPriceToMicros(price float64) (int64, error) {
	if price <= 0 || math.IsNaN(price) || math.IsInf(price, 0) {
		return 0, fmt.Errorf("price must be a finite positive value")
	}

	scaledPrice := price * float64(priceMicrosPerUnit)
	if scaledPrice > float64(math.MaxInt64) {
		return 0, fmt.Errorf("price exceeds sqlite storage range")
	}

	priceMicros := int64(math.Round(scaledPrice))
	if priceMicros <= 0 {
		return 0, fmt.Errorf("price is smaller than supported six-decimal precision")
	}

	return priceMicros, nil
}
