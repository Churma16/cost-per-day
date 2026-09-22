package service

import (
	"context"
	"math"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// ItemService defines the application operations available for items.
type ItemService interface {
	ListItems(ctx context.Context) ([]domain.Item, error)
	GetItemByID(ctx context.Context, itemID string) (domain.Item, error)
	CreateItem(ctx context.Context, name string, price float64, purchaseDate string) (domain.Item, error)
	UpdateItem(ctx context.Context, itemID string, name string, price float64, purchaseDate string) (domain.Item, error)
	DeleteItem(ctx context.Context, itemID string) error
	ReplaceItems(ctx context.Context, items []domain.Item) ([]domain.Item, error)
}

const itemPricePrecisionScale = 1_000_000

type itemServiceImpl struct {
	itemRepository repository.ItemRepository
}

// NewItemService creates a new ItemService instance backed by an ItemRepository.
func NewItemService(itemRepository repository.ItemRepository) ItemService {
	return &itemServiceImpl{
		itemRepository: itemRepository,
	}
}

// ListItems retrieves all items from the persistence layer.
func (serviceInstance *itemServiceImpl) ListItems(ctx context.Context) ([]domain.Item, error) {
	return serviceInstance.itemRepository.List(ctx)
}

// GetItemByID retrieves an item by its unique identifier.
func (serviceInstance *itemServiceImpl) GetItemByID(ctx context.Context, itemID string) (domain.Item, error) {
	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return domain.Item{}, domain.ErrItemNotFound
	}
	return serviceInstance.itemRepository.GetByID(ctx, trimmedItemID)
}

// CreateItem validates and creates a new item.
func (serviceInstance *itemServiceImpl) CreateItem(ctx context.Context, name string, price float64, purchaseDate string) (domain.Item, error) {
	validatedName, validatedPurchaseDate, validationError := serviceInstance.validateItemInput(name, price, purchaseDate)
	if validationError != nil {
		return domain.Item{}, validationError
	}

	itemToCreate := domain.Item{
		Name:         validatedName,
		Price:        price,
		PurchaseDate: validatedPurchaseDate,
	}

	return serviceInstance.itemRepository.Create(ctx, itemToCreate)
}

// UpdateItem validates and updates an existing item.
func (serviceInstance *itemServiceImpl) UpdateItem(ctx context.Context, itemID string, name string, price float64, purchaseDate string) (domain.Item, error) {
	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return domain.Item{}, domain.ErrItemNotFound
	}

	validatedName, validatedPurchaseDate, validationError := serviceInstance.validateItemInput(name, price, purchaseDate)
	if validationError != nil {
		return domain.Item{}, validationError
	}

	itemToUpdate := domain.Item{
		ID:           trimmedItemID,
		Name:         validatedName,
		Price:        price,
		PurchaseDate: validatedPurchaseDate,
	}

	return serviceInstance.itemRepository.Update(ctx, itemToUpdate)
}

// DeleteItem removes an existing item by its identifier.
func (serviceInstance *itemServiceImpl) DeleteItem(ctx context.Context, itemID string) error {
	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return domain.ErrItemNotFound
	}
	return serviceInstance.itemRepository.Delete(ctx, trimmedItemID)
}

// ReplaceItems validates the full replacement set before asking the repository to swap it atomically.
func (serviceInstance *itemServiceImpl) ReplaceItems(ctx context.Context, items []domain.Item) ([]domain.Item, error) {
	validatedItems := make([]domain.Item, 0, len(items))

	for _, item := range items {
		validatedName, validatedPurchaseDate, validationError := serviceInstance.validateItemInput(
			item.Name,
			item.Price,
			item.PurchaseDate,
		)
		if validationError != nil {
			return nil, validationError
		}

		validatedItems = append(validatedItems, domain.Item{
			Name:         validatedName,
			Price:        item.Price,
			PurchaseDate: validatedPurchaseDate,
		})
	}

	return serviceInstance.itemRepository.ReplaceAll(ctx, validatedItems)
}

// validateItemInput validates the item fields according to domain rules.
func (serviceInstance *itemServiceImpl) validateItemInput(name string, price float64, purchaseDate string) (string, string, error) {
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return "", "", domain.ErrEmptyItemName
	}

	if price <= 0 || math.IsNaN(price) || math.IsInf(price, 0) {
		return "", "", domain.ErrInvalidItemPrice
	}

	scaledPrice := price * itemPricePrecisionScale
	if scaledPrice >= float64(math.MaxInt64) || math.Round(scaledPrice) <= 0 {
		return "", "", domain.ErrUnsupportedItemPrice
	}

	trimmedPurchaseDate := strings.TrimSpace(purchaseDate)
	if trimmedPurchaseDate == "" {
		return "", "", domain.ErrInvalidPurchaseDate
	}

	parsedDate, parseError := parsePurchaseDate(trimmedPurchaseDate)
	if parseError != nil {
		return "", "", domain.ErrInvalidPurchaseDate
	}

	formattedPurchaseDate := parsedDate.Format(time.RFC3339)
	return trimmedName, formattedPurchaseDate, nil
}

// parsePurchaseDate attempts to parse various supported ISO 8601 and RFC 3339 date formats.
func parsePurchaseDate(dateString string) (time.Time, error) {
	supportedLayouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.000Z07:00",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}

	for _, layout := range supportedLayouts {
		if parsedTime, parseError := time.Parse(layout, dateString); parseError == nil {
			return parsedTime.UTC(), nil
		}
	}

	return time.Time{}, domain.ErrInvalidPurchaseDate
}
