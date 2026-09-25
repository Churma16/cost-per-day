package service

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// ItemService defines the application operations available for user-owned items.
type ItemService interface {
	ListItems(ctx context.Context, userID string) ([]domain.Item, error)
	GetItemByID(ctx context.Context, userID string, itemID string) (domain.Item, error)
	CreateItem(
		ctx context.Context,
		userID string,
		name string,
		price float64,
		purchaseDate string,
		category *string,
		brand *string,
		targetType *domain.OwnershipTargetType,
		targetValue *float64,
	) (domain.Item, error)
	UpdateItem(
		ctx context.Context,
		userID string,
		itemID string,
		name string,
		price float64,
		purchaseDate string,
		status domain.ItemStatus,
		endedAt *string,
		salePrice *float64,
		category *string,
		brand *string,
		targetType *domain.OwnershipTargetType,
		targetValue *float64,
	) (domain.Item, error)
	DeleteItem(ctx context.Context, userID string, itemID string) error
	ReplaceItems(ctx context.Context, userID string, items []domain.Item) ([]domain.Item, error)
	CalculateReplacementBenchmark(
		ctx context.Context,
		userID string,
		itemID string,
		candidatePrice float64,
	) (domain.ReplacementBenchmark, error)
}

const itemPricePrecisionScale = 1_000_000

type itemServiceImpl struct {
	itemRepository     repository.ItemRepository
	categoryRepository repository.CategoryRepository
	brandRepository    repository.BrandRepository
}

// NewItemService creates a new ItemService instance backed by an ItemRepository and optional CategoryRepository and BrandRepository.
func NewItemService(
	itemRepository repository.ItemRepository,
	optionalRepositories ...any,
) ItemService {
	var categoryRepo repository.CategoryRepository
	var brandRepo repository.BrandRepository
	for _, repo := range optionalRepositories {
		if cr, ok := repo.(repository.CategoryRepository); ok {
			categoryRepo = cr
		}
		if br, ok := repo.(repository.BrandRepository); ok {
			brandRepo = br
		}
	}
	return &itemServiceImpl{
		itemRepository:     itemRepository,
		categoryRepository: categoryRepo,
		brandRepository:    brandRepo,
	}
}

// ListItems retrieves only the current user's items and calculates ownership metrics.
func (serviceInstance *itemServiceImpl) ListItems(ctx context.Context, userID string) ([]domain.Item, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	items, repositoryError := serviceInstance.itemRepository.List(ctx, normalizedUserID)
	if repositoryError != nil {
		return nil, repositoryError
	}

	return enrichItems(items, time.Now().UTC())
}

// GetItemByID retrieves an item only when it belongs to the current user.
func (serviceInstance *itemServiceImpl) GetItemByID(ctx context.Context, userID string, itemID string) (domain.Item, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return domain.Item{}, domain.ErrItemNotFound
	}

	item, repositoryError := serviceInstance.itemRepository.GetByID(ctx, normalizedUserID, trimmedItemID)
	if repositoryError != nil {
		return domain.Item{}, repositoryError
	}

	return enrichItem(item, time.Now().UTC())
}

// CreateItem validates and creates a new active item for the current user.
func (serviceInstance *itemServiceImpl) CreateItem(
	ctx context.Context,
	userID string,
	name string,
	price float64,
	purchaseDate string,
	category *string,
	brand *string,
	targetType *domain.OwnershipTargetType,
	targetValue *float64,
) (domain.Item, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	rawItem := domain.Item{
		Name:         name,
		Price:        price,
		PurchaseDate: purchaseDate,
		Status:       domain.ItemStatusActive,
		Category:     category,
		Brand:        brand,
		TargetType:   targetType,
		TargetValue:  targetValue,
	}
	resolvedItem, taxonomyError := serviceInstance.resolveItemTaxonomy(ctx, normalizedUserID, rawItem)
	if taxonomyError != nil {
		return domain.Item{}, taxonomyError
	}

	validatedItem, validationError := validateItem(resolvedItem)
	if validationError != nil {
		return domain.Item{}, validationError
	}

	createdItem, repositoryError := serviceInstance.itemRepository.Create(ctx, normalizedUserID, validatedItem)
	if repositoryError != nil {
		return domain.Item{}, repositoryError
	}

	return enrichItem(createdItem, time.Now().UTC())
}

// UpdateItem validates and updates an item only when it belongs to the current user.
func (serviceInstance *itemServiceImpl) UpdateItem(
	ctx context.Context,
	userID string,
	itemID string,
	name string,
	price float64,
	purchaseDate string,
	status domain.ItemStatus,
	endedAt *string,
	salePrice *float64,
	category *string,
	brand *string,
	targetType *domain.OwnershipTargetType,
	targetValue *float64,
) (domain.Item, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.Item{}, identityError
	}

	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return domain.Item{}, domain.ErrItemNotFound
	}

	rawItem := domain.Item{
		ID:           trimmedItemID,
		Name:         name,
		Price:        price,
		PurchaseDate: purchaseDate,
		Status:       status,
		EndedAt:      endedAt,
		SalePrice:    salePrice,
		Category:     category,
		Brand:        brand,
		TargetType:   targetType,
		TargetValue:  targetValue,
	}
	resolvedItem, taxonomyError := serviceInstance.resolveItemTaxonomy(ctx, normalizedUserID, rawItem)
	if taxonomyError != nil {
		return domain.Item{}, taxonomyError
	}

	validatedItem, validationError := validateItem(resolvedItem)
	if validationError != nil {
		return domain.Item{}, validationError
	}

	updatedItem, repositoryError := serviceInstance.itemRepository.Update(ctx, normalizedUserID, validatedItem)
	if repositoryError != nil {
		return domain.Item{}, repositoryError
	}

	return enrichItem(updatedItem, time.Now().UTC())
}

// DeleteItem removes an item only when it belongs to the current user.
func (serviceInstance *itemServiceImpl) DeleteItem(ctx context.Context, userID string, itemID string) error {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return identityError
	}

	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return domain.ErrItemNotFound
	}
	return serviceInstance.itemRepository.Delete(ctx, normalizedUserID, trimmedItemID)
}

// ReplaceItems validates the replacement set and atomically replaces only the current user's items.
func (serviceInstance *itemServiceImpl) ReplaceItems(ctx context.Context, userID string, items []domain.Item) ([]domain.Item, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return nil, identityError
	}

	validatedItems := make([]domain.Item, 0, len(items))
	for _, item := range items {
		resolvedItem, taxonomyError := serviceInstance.resolveItemTaxonomy(ctx, normalizedUserID, item)
		if taxonomyError != nil {
			return nil, taxonomyError
		}

		validatedItem, validationError := validateItem(resolvedItem)
		if validationError != nil {
			return nil, validationError
		}
		validatedItems = append(validatedItems, validatedItem)
	}

	replacedItems, repositoryError := serviceInstance.itemRepository.ReplaceAll(ctx, normalizedUserID, validatedItems)
	if repositoryError != nil {
		return nil, repositoryError
	}

	return enrichItems(replacedItems, time.Now().UTC())
}

// CalculateReplacementBenchmark projects the ownership duration a candidate replacement purchase must achieve
// to match or beat a completed historical item's final ownership economics.
func (serviceInstance *itemServiceImpl) CalculateReplacementBenchmark(
	ctx context.Context,
	userID string,
	itemID string,
	candidatePrice float64,
) (domain.ReplacementBenchmark, error) {
	normalizedUserID, identityError := normalizeUserID(userID)
	if identityError != nil {
		return domain.ReplacementBenchmark{}, identityError
	}

	trimmedItemID := strings.TrimSpace(itemID)
	if trimmedItemID == "" {
		return domain.ReplacementBenchmark{}, domain.ErrItemNotFound
	}

	if candidatePrice <= 0 || math.IsNaN(candidatePrice) || math.IsInf(candidatePrice, 0) {
		return domain.ReplacementBenchmark{}, domain.ErrInvalidBenchmarkPrice
	}

	scaledPrice := candidatePrice * itemPricePrecisionScale
	if scaledPrice >= float64(math.MaxInt64) || math.Round(scaledPrice) <= 0 {
		return domain.ReplacementBenchmark{}, domain.ErrUnsupportedBenchmarkPrice
	}

	item, getError := serviceInstance.GetItemByID(ctx, normalizedUserID, trimmedItemID)
	if getError != nil {
		return domain.ReplacementBenchmark{}, getError
	}

	if item.Status == domain.ItemStatusActive {
		return domain.ReplacementBenchmark{}, domain.ErrBenchmarkItemNotCompleted
	}

	finalCostPerDay := item.GrossCostPerDay
	if item.Status == domain.ItemStatusSold && item.NetCostPerDay != nil {
		finalCostPerDay = *item.NetCostPerDay
	}

	benchmark := domain.ReplacementBenchmark{
		ItemID:             item.ID,
		ItemName:           item.Name,
		ItemStatus:         item.Status,
		PreviousPrice:      item.Price,
		FinalOwnershipDays: item.OwnershipDays,
		FinalCostPerDay:    finalCostPerDay,
		CandidatePrice:     candidatePrice,
	}

	if finalCostPerDay > 0 {
		matchDays := int(math.Ceil(candidatePrice / finalCostPerDay))
		if matchDays < 1 {
			matchDays = 1
		}
		beatDays := int(math.Floor(candidatePrice / finalCostPerDay)) + 1
		if beatDays < 1 {
			beatDays = 1
		}
		benchmark.DaysToMatchPrevious = &matchDays
		benchmark.DaysToBeatPrevious = &beatDays
	} else {
		benchmark.IsUnmatchable = true
		unmatchableMessage := "item had zero or negative net ownership cost"
		benchmark.UnmatchableReason = &unmatchableMessage
	}

	if item.TargetCostPerDay != nil && *item.TargetCostPerDay > 0 {
		benchmark.HasTarget = true
		targetCost := *item.TargetCostPerDay
		benchmark.TargetCostPerDay = &targetCost
		targetDays := int(math.Ceil(candidatePrice / targetCost))
		if targetDays < 1 {
			targetDays = 1
		}
		benchmark.DaysToMatchTarget = &targetDays
	}

	return benchmark, nil
}

// resolveItemTaxonomy normalizes optional taxonomy names and resolves canonical user-scoped entries.
func (serviceInstance *itemServiceImpl) resolveItemTaxonomy(
	ctx context.Context,
	userID string,
	item domain.Item,
) (domain.Item, error) {
	resolvedItem := item

	if item.Category != nil {
		trimmedCategory := strings.TrimSpace(*item.Category)
		if trimmedCategory == "" {
			resolvedItem.CategoryID = nil
			resolvedItem.Category = nil
		} else {
			resolvedItem.Category = &trimmedCategory
			if serviceInstance.categoryRepository != nil {
				category, categoryError := serviceInstance.categoryRepository.FindOrCreate(ctx, userID, trimmedCategory)
				if categoryError != nil {
					return domain.Item{}, fmt.Errorf("resolve category: %w", categoryError)
				}
				resolvedItem.CategoryID = &category.ID
				resolvedItem.Category = &category.Name
			}
		}
	}

	if item.Brand != nil {
		trimmedBrand := strings.TrimSpace(*item.Brand)
		if trimmedBrand == "" {
			resolvedItem.BrandID = nil
			resolvedItem.Brand = nil
		} else {
			resolvedItem.Brand = &trimmedBrand
			if serviceInstance.brandRepository != nil {
				brand, brandError := serviceInstance.brandRepository.FindOrCreate(ctx, userID, trimmedBrand)
				if brandError != nil {
					return domain.Item{}, fmt.Errorf("resolve brand: %w", brandError)
				}
				resolvedItem.BrandID = &brand.ID
				resolvedItem.Brand = &brand.Name
			}
		}
	}

	return resolvedItem, nil
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

	if item.Category != nil {
		trimmedCategory := strings.TrimSpace(*item.Category)
		if trimmedCategory == "" {
			validatedItem.Category = nil
			validatedItem.CategoryID = nil
		} else {
			validatedItem.Category = &trimmedCategory
		}
	}
	if item.Brand != nil {
		trimmedBrand := strings.TrimSpace(*item.Brand)
		if trimmedBrand == "" {
			validatedItem.Brand = nil
			validatedItem.BrandID = nil
		} else {
			validatedItem.Brand = &trimmedBrand
		}
	}

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
			return domain.Item{}, domain.ErrInvalidItemEndDate
		}
		if parsedEndDate.Before(parsedPurchaseDate) {
			return domain.Item{}, domain.ErrItemEndBeforePurchase
		}
		if isAfterUTCDate(parsedEndDate, time.Now().UTC()) {
			return domain.Item{}, domain.ErrItemEndInFuture
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

	if item.TargetType == nil && item.TargetValue != nil {
		return domain.Item{}, domain.ErrMissingOwnershipTargetType
	}
	if item.TargetType != nil && item.TargetValue == nil {
		return domain.Item{}, domain.ErrMissingOwnershipTargetValue
	}
	if item.TargetType != nil && item.TargetValue != nil {
		normalizedType := domain.OwnershipTargetType(strings.ToLower(strings.TrimSpace(string(*item.TargetType))))
		if normalizedType != domain.OwnershipTargetTypeCostPerDay && normalizedType != domain.OwnershipTargetTypeDuration {
			return domain.Item{}, domain.ErrInvalidOwnershipTargetType
		}

		value := *item.TargetValue
		if value <= 0 || math.IsNaN(value) || math.IsInf(value, 0) {
			return domain.Item{}, domain.ErrInvalidOwnershipTargetValue
		}

		scaledValue := value * itemPricePrecisionScale
		if scaledValue >= float64(math.MaxInt64) || math.Round(scaledValue) <= 0 {
			return domain.Item{}, domain.ErrUnsupportedOwnershipTargetValue
		}

		if normalizedType == domain.OwnershipTargetTypeDuration {
			if math.Round(value) < 1 {
				return domain.Item{}, domain.ErrInvalidOwnershipTargetValue
			}
			roundedValue := math.Round(value)
			validatedItem.TargetValue = &roundedValue
		} else {
			validatedItem.TargetValue = &value
		}
		validatedItem.TargetType = &normalizedType
	} else {
		validatedItem.TargetType = nil
		validatedItem.TargetValue = nil
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
			return domain.Item{}, domain.ErrInvalidItemEndDate
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

	if item.TargetType != nil && item.TargetValue != nil {
		effectiveCost := item.Price
		if status == domain.ItemStatusSold && item.NetOwnershipCost != nil {
			if *item.NetOwnershipCost > 0 {
				effectiveCost = *item.NetOwnershipCost
			} else {
				effectiveCost = 0
			}
		}

		var targetCostPerDay float64
		var targetDurationDays int

		switch *item.TargetType {
		case domain.OwnershipTargetTypeCostPerDay:
			targetCostPerDay = *item.TargetValue
			if effectiveCost <= 0 {
				targetDurationDays = 1
			} else {
				targetDurationDays = int(math.Ceil(effectiveCost / targetCostPerDay))
				if targetDurationDays < 1 {
					targetDurationDays = 1
				}
			}
		case domain.OwnershipTargetTypeDuration:
			targetDurationDays = int(math.Round(*item.TargetValue))
			if targetDurationDays < 1 {
				targetDurationDays = 1
			}
			if effectiveCost <= 0 {
				targetCostPerDay = 0
			} else {
				targetCostPerDay = effectiveCost / float64(targetDurationDays)
			}
		}

		item.TargetCostPerDay = &targetCostPerDay
		item.TargetDurationDays = &targetDurationDays

		var progressPercentage float64
		if targetDurationDays > 0 {
			progressPercentage = (float64(item.OwnershipDays) / float64(targetDurationDays)) * 100.0
		}
		item.ProgressPercentage = &progressPercentage

		targetReached := item.OwnershipDays >= targetDurationDays || (effectiveCost <= 0)
		item.TargetReached = &targetReached

		var remainingDays int
		var daysBeyond int
		var targetState string

		if effectiveCost <= 0 {
			remainingDays = 0
			daysBeyond = 0
			targetState = "target_reached"
		} else if item.OwnershipDays > targetDurationDays {
			remainingDays = 0
			daysBeyond = item.OwnershipDays - targetDurationDays
			targetState = "beyond_target"
		} else if item.OwnershipDays == targetDurationDays {
			remainingDays = 0
			daysBeyond = 0
			targetState = "target_reached"
		} else if item.OwnershipDays <= 1 {
			remainingDays = targetDurationDays - item.OwnershipDays
			daysBeyond = 0
			targetState = "new"
		} else {
			remainingDays = targetDurationDays - item.OwnershipDays
			daysBeyond = 0
			targetState = "in_progress"
		}

		item.RemainingDays = &remainingDays
		item.DaysBeyond = &daysBeyond
		item.TargetState = &targetState
	}

	return item, nil
}

func isAfterUTCDate(candidate time.Time, reference time.Time) bool {
	candidateYear, candidateMonth, candidateDay := candidate.UTC().Date()
	referenceYear, referenceMonth, referenceDay := reference.UTC().Date()

	candidateDate := time.Date(candidateYear, candidateMonth, candidateDay, 0, 0, 0, 0, time.UTC)
	referenceDate := time.Date(referenceYear, referenceMonth, referenceDay, 0, 0, 0, 0, time.UTC)

	return candidateDate.After(referenceDate)
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
