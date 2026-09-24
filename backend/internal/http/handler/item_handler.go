package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/service"
	"cost-per-day/backend/internal/http/dto"
	"cost-per-day/backend/internal/http/response"
)

// ItemHandler handles HTTP requests related to item management.
type ItemHandler struct {
	itemService service.ItemService
}

// NewItemHandler creates a new ItemHandler instance.
func NewItemHandler(itemService service.ItemService) *ItemHandler {
	return &ItemHandler{
		itemService: itemService,
	}
}

// List handles GET /api/items to retrieve only the current user's items.
func (handlerInstance *ItemHandler) List(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	itemList, serviceError := handlerInstance.itemService.ListItems(ginContext.Request.Context(), userID)
	if serviceError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve items")
		return
	}

	response.Success(ginContext, http.StatusOK, "items retrieved successfully", itemList)
}

// Get handles GET /api/items/:id without revealing whether another user owns the identifier.
func (handlerInstance *ItemHandler) Get(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	itemID := ginContext.Param("id")
	if itemID == "" {
		response.Error(ginContext, http.StatusBadRequest, "item identifier is required")
		return
	}

	item, serviceError := handlerInstance.itemService.GetItemByID(ginContext.Request.Context(), userID, itemID)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrItemNotFound) {
			response.Error(ginContext, http.StatusNotFound, "item not found")
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve item")
		return
	}

	response.Success(ginContext, http.StatusOK, "item retrieved successfully", item)
}

// Create handles POST /api/items to add a new active item for the current user.
func (handlerInstance *ItemHandler) Create(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	var requestBody dto.CreateItemRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	var targetType *domain.OwnershipTargetType
	if requestBody.TargetType != nil {
		t := domain.OwnershipTargetType(*requestBody.TargetType)
		targetType = &t
	}

	createdItem, serviceError := handlerInstance.itemService.CreateItem(
		ginContext.Request.Context(),
		userID,
		requestBody.Name,
		requestBody.Price,
		requestBody.PurchaseDate,
		requestBody.Category,
		requestBody.Brand,
		targetType,
		requestBody.TargetValue,
	)
	if serviceError != nil {
		if isItemValidationError(serviceError) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to create item")
		return
	}

	response.Success(ginContext, http.StatusCreated, "item created successfully", createdItem)
}

// Update handles PUT /api/items/:id only when the item belongs to the current user.
func (handlerInstance *ItemHandler) Update(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	itemID := ginContext.Param("id")
	if itemID == "" {
		response.Error(ginContext, http.StatusBadRequest, "item identifier is required")
		return
	}

	var requestBody dto.UpdateItemRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	var targetType *domain.OwnershipTargetType
	if requestBody.TargetType != nil {
		t := domain.OwnershipTargetType(*requestBody.TargetType)
		targetType = &t
	}

	updatedItem, serviceError := handlerInstance.itemService.UpdateItem(
		ginContext.Request.Context(),
		userID,
		itemID,
		requestBody.Name,
		requestBody.Price,
		requestBody.PurchaseDate,
		domain.ItemStatus(requestBody.Status),
		requestBody.EndedAt,
		requestBody.SalePrice,
		requestBody.Category,
		requestBody.Brand,
		targetType,
		requestBody.TargetValue,
	)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrItemNotFound) {
			response.Error(ginContext, http.StatusNotFound, "item not found")
			return
		}
		if isItemValidationError(serviceError) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to update item")
		return
	}

	response.Success(ginContext, http.StatusOK, "item updated successfully", updatedItem)
}

// Delete handles DELETE /api/items/:id only when the item belongs to the current user.
func (handlerInstance *ItemHandler) Delete(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	itemID := ginContext.Param("id")
	if itemID == "" {
		response.Error(ginContext, http.StatusBadRequest, "item identifier is required")
		return
	}

	serviceError := handlerInstance.itemService.DeleteItem(ginContext.Request.Context(), userID, itemID)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrItemNotFound) {
			response.Error(ginContext, http.StatusNotFound, "item not found")
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to delete item")
		return
	}

	response.SuccessWithoutData(ginContext, http.StatusOK, "item deleted successfully")
}

// GetReplacementBenchmark handles GET /api/items/:id/replacement-benchmark?price=...
func (handlerInstance *ItemHandler) GetReplacementBenchmark(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	itemID := ginContext.Param("id")
	if itemID == "" {
		response.Error(ginContext, http.StatusBadRequest, "item identifier is required")
		return
	}

	priceParam := ginContext.Query("price")
	if priceParam == "" {
		response.Error(ginContext, http.StatusBadRequest, "replacement price is required")
		return
	}

	candidatePrice, parseError := strconv.ParseFloat(priceParam, 64)
	if parseError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid replacement price format")
		return
	}

	benchmark, serviceError := handlerInstance.itemService.CalculateReplacementBenchmark(
		ginContext.Request.Context(),
		userID,
		itemID,
		candidatePrice,
	)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrItemNotFound) {
			response.Error(ginContext, http.StatusNotFound, "item not found")
			return
		}
		if isItemValidationError(serviceError) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to calculate replacement benchmark")
		return
	}

	responseDTO := dto.ReplacementBenchmarkResponseDTO{
		ItemID:              benchmark.ItemID,
		ItemName:            benchmark.ItemName,
		ItemStatus:          string(benchmark.ItemStatus),
		PreviousPrice:       benchmark.PreviousPrice,
		FinalOwnershipDays:  benchmark.FinalOwnershipDays,
		FinalCostPerDay:     benchmark.FinalCostPerDay,
		CandidatePrice:      benchmark.CandidatePrice,
		DaysToMatchPrevious: benchmark.DaysToMatchPrevious,
		DaysToBeatPrevious:  benchmark.DaysToBeatPrevious,
		HasTarget:           benchmark.HasTarget,
		TargetCostPerDay:    benchmark.TargetCostPerDay,
		DaysToMatchTarget:   benchmark.DaysToMatchTarget,
		IsUnmatchable:       benchmark.IsUnmatchable,
		UnmatchableReason:   benchmark.UnmatchableReason,
	}

	response.Success(ginContext, http.StatusOK, "replacement benchmark calculated successfully", responseDTO)
}

func isItemValidationError(serviceError error) bool {
	return errors.Is(serviceError, domain.ErrEmptyItemName) ||
		errors.Is(serviceError, domain.ErrInvalidItemPrice) ||
		errors.Is(serviceError, domain.ErrUnsupportedItemPrice) ||
		errors.Is(serviceError, domain.ErrInvalidPurchaseDate) ||
		errors.Is(serviceError, domain.ErrInvalidItemStatus) ||
		errors.Is(serviceError, domain.ErrMissingItemEndDate) ||
		errors.Is(serviceError, domain.ErrInvalidItemEndDate) ||
		errors.Is(serviceError, domain.ErrItemEndBeforePurchase) ||
		errors.Is(serviceError, domain.ErrItemEndInFuture) ||
		errors.Is(serviceError, domain.ErrInvalidSalePrice) ||
		errors.Is(serviceError, domain.ErrUnexpectedSalePrice) ||
		errors.Is(serviceError, domain.ErrMissingOwnershipTargetType) ||
		errors.Is(serviceError, domain.ErrMissingOwnershipTargetValue) ||
		errors.Is(serviceError, domain.ErrInvalidOwnershipTargetType) ||
		errors.Is(serviceError, domain.ErrInvalidOwnershipTargetValue) ||
		errors.Is(serviceError, domain.ErrUnsupportedOwnershipTargetValue) ||
		errors.Is(serviceError, domain.ErrInvalidBenchmarkPrice) ||
		errors.Is(serviceError, domain.ErrUnsupportedBenchmarkPrice) ||
		errors.Is(serviceError, domain.ErrBenchmarkItemNotCompleted)
}
