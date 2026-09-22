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
	UpdateItem(
		ctx context.Context,
		itemID string,
		name string,
		price float64,
		purchaseDate string,
		status domain.ItemStatus,
		endedAt *string,
		salePrice *float64,
	) (domain.Item, error)
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

// ListItems retrieves all items and calculates current or final ownership metrics.
func (serviceInstance *itemServiceImpl) ListItems(ctx context.Context) ([]domain.Item, error) {
	items, repositoryError := serviceInstance.itemRepository.List(ctx)
	if repositoryError != nil {
		return nil, repositoryError
	}

	return enrichItems(items, time.Now().UTC())
}

// GetItemByID retrieves an item by its unique identifier and calculates ownership metrics.
func (serviceInstance *itemServiceImpl) GetItemByID(ctx context.Context, itemID string) (domain.Item, error) {
	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return domain.Item{}, domain.ErrItemNotFound
	}

	item, repositoryError := serviceInstance.itemRepository.GetByID(ctx, trimmedItemID)
	if repositoryError != nil {
		return domain.Item{}, repositoryError
	}

	return enrichItem(item, time.Now().UTC())
}

// CreateItem validates and creates a new active item.
func (serviceInstance *itemServiceImpl) CreateItem(ctx context.Context, name string, price float64, purchaseDate string) (domain.Item, error) {
	validatedItem, validationError := validateItem(domain.Item{
		Name:         name,
		Price:        price,
		PurchaseDate: purchaseDate,
		Status:       domain.ItemStatusActive,
	})
	if validationError != nil {
		return domain.Item{}, validationError
	}

	createdItem, repositoryError := serviceInstance.itemRepository.Create(ctx, validatedItem)
	if repositoryError != nil {
		return domain.Item{}, repositoryError
	}

	return enrichItem(createdItem, time.Now().UTC())
}

// UpdateItem validates and updates the item, including lifecycle facts.
func (serviceInstance *itemServiceImpl) UpdateItem(
	ctx context.Context,
	itemID string,
	name string,
	price float64,
	purchaseDate string,
	status domain.ItemStatus,
	endedAt *string,
	salePrice *float64,
) (domain.Item, error) {
	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return domain.Item{}, domain.ErrItemNotFound
	}

	validatedItem, validationError := validateItem(domain.Item{
		ID:           trimmedItemID,
		Name:         name,
		Price:        price,
		PurchaseDate: purchaseDate,
		Status:       status,
		EndedAt:      endedAt,
		SalePrice:    salePrice,
	})
	if validationError != nil {
		return domain.Item{}, validationError
	}

	updatedItem, repositoryError := serviceInstance.itemRepository.Update(ctx, validatedItem)
	if repositoryError != nil {
		return domain.Item{}, repositoryError
	}

	return enrichItem(updatedItem, time.Now().UTC())
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
		validatedItem, validationError := validateItem(item)
		if validationError != nil {
			return nil, validationError
		}
		validatedItems = append(validatedItems, validatedItem)
	}

	replacedItems, repositoryError := serviceInstance.itemRepository.ReplaceAll(ctx, validatedItems)
	if repositoryError != nil {
		return nil, repositoryError
	}

	return enrichItems(replacedItems, time.Now().UTC())
}

func validateItem(item domain.Item) (domain.Item, error) {
	trimmedName := strings.TrimSpace(item.Name)
	if trimmedName == "" {
		return domain.Item{}, domain.ErrEmptyItemName
	}

	if item.Price <= 0 || math.IsNaN(item.Price) || math.IsInf(item.Price, 0) {
		return domain.Item{}, domain.ErrInvalidItemPrice
	}

	scaledPrice := item.Price * itemPricePrecisionScale
	if scaledPrice >= float64(math.MaxInt64) || math.Round(scaledPrice) <= 0 {
		return domain.Item{}, domain.ErrUnsupportedItemPrice
	}

	trimmedPurchaseDate := strings.TrimSpace(item.PurchaseDate)
	if trimmedPurchaseDate == "" {
		return domain.Item{}, domain.ErrInvalidPurchaseDate
	}

	parsedPurchaseDate, parseError := parseItemDate(trimmedPurchaseDate)
	if parseError != nil {
		return domain.Item{}, domain.ErrInvalidPurchaseDate
	}

	status := domain.ItemStatus(strings.ToLower(strings.TrimSpace(string(item.Status))))
	if status == "" {
		status = domain.ItemStatusActive
	}

	validatedItem := item
	validatedItem.Name = trimmedName
	validatedItem.PurchaseDate = parsedPurchaseDate.Format(time.RFC3339)
	validatedItem.Status = status

	switch status {
	case domain.ItemStatusActive:
		validatedItem.EndedAt = nil
		validatedItem.SalePrice = nil
	case domain.ItemStatusRetired, domain.ItemStatusLost, domain.ItemStatusSold:
		if item.EndedAt == nil || strings.TrimSpace(*item.EndedAt) == "" {
			return domain.Item{}, domain.ErrMissingItemEndDate
		}

		parsedEndDate, endDateError := parseItemDate(strings.TrimSpace(*item.EndedAt))
		if endDateError != nil {
			return domain.Item{}, domain.ErrMissingItemEndDate
		}
		if parsedEndDate.Before(parsedPurchaseDate) {
			return domain.Item{}, domain.ErrItemEndBeforePurchase
		}

		formattedEndDate := parsedEndDate.Format(time.RFC3339)
		validatedItem.EndedAt = &formattedEndDate

		if status == domain.ItemStatusSold {
			if item.SalePrice == nil || !isSupportedSalePrice(*item.SalePrice) {
				return domain.Item{}, domain.ErrInvalidSalePrice
			}
			validatedSalePrice := *item.SalePrice
			validatedItem.SalePrice = &validatedSalePrice
		} else {
			if item.SalePrice != nil {
				return domain.Item{}, domain.ErrUnexpectedSalePrice
			}
			validatedItem.SalePrice = nil
		}
	default:
		return domain.Item{}, domain.ErrInvalidItemStatus
	}

	return validatedItem, nil
}

func isSupportedSalePrice(salePrice float64) bool {
	if salePrice < 0 || math.IsNaN(salePrice) || math.IsInf(salePrice, 0) {
		return false
	}

	scaledPrice := salePrice * itemPricePrecisionScale
	if scaledPrice >= float64(math.MaxInt64) {
		return false
	}
	if salePrice > 0 && math.Round(scaledPrice) <= 0 {
		return false
	}

	return true
}

func enrichItems(items []domain.Item, asOf time.Time) ([]domain.Item, error) {
	enrichedItems := make([]domain.Item, 0, len(items))
	for _, item := range items {
		enrichedItem, enrichmentError := enrichItem(item, asOf)
		if enrichmentError != nil {
			return nil, enrichmentError
		}
		enrichedItems = append(enrichedItems, enrichedItem)
	}
	return enrichedItems, nil
}

func enrichItem(item domain.Item, asOf time.Time) (domain.Item, error) {
	status := item.Status
	if status == "" {
		status = domain.ItemStatusActive
	}
	item.Status = status

	purchaseDate, purchaseDateError := time.Parse(time.RFC3339, item.PurchaseDate)
	if purchaseDateError != nil {
		return domain.Item{}, domain.ErrInvalidPurchaseDate
	}

	ownershipEnd := asOf.UTC()
	if status != domain.ItemStatusActive {
		if item.EndedAt == nil {
			return domain.Item{}, domain.ErrMissingItemEndDate
		}

		parsedEndDate, endDateError := time.Parse(time.RFC3339, *item.EndedAt)
		if endDateError != nil {
			return domain.Item{}, domain.ErrMissingItemEndDate
		}
		ownershipEnd = parsedEndDate.UTC()
	}

	ownershipDays := int(math.Ceil(ownershipEnd.Sub(purchaseDate.UTC()).Hours() / 24))
	if ownershipDays < 1 {
		ownershipDays = 1
	}

	item.OwnershipDays = ownershipDays
	item.GrossCostPerDay = item.Price / float64(ownershipDays)
	item.NetOwnershipCost = nil
	item.NetCostPerDay = nil

	if status == domain.ItemStatusSold {
		if item.SalePrice == nil {
			return domain.Item{}, domain.ErrInvalidSalePrice
		}
		netOwnershipCost := item.Price - *item.SalePrice
		netCostPerDay := netOwnershipCost / float64(ownershipDays)
		item.NetOwnershipCost = &netOwnershipCost
		item.NetCostPerDay = &netCostPerDay
	}

	return item, nil
}

// parseItemDate attempts to parse supported ISO 8601 and RFC 3339 date formats.
func parseItemDate(dateString string) (time.Time, error) {
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
