package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/service"
	"cost-per-day/backend/internal/transport/http/dto"
	"cost-per-day/backend/internal/transport/http/response"
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

// List handles GET /api/items to retrieve all items.
func (handlerInstance *ItemHandler) List(ginContext *gin.Context) {
	itemList, serviceError := handlerInstance.itemService.ListItems(ginContext.Request.Context())
	if serviceError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve items")
		return
	}

	response.Success(ginContext, http.StatusOK, "items retrieved successfully", itemList)
}

// Create handles POST /api/items to add a new item.
func (handlerInstance *ItemHandler) Create(ginContext *gin.Context) {
	var requestBody dto.CreateItemRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	createdItem, serviceError := handlerInstance.itemService.CreateItem(
		ginContext.Request.Context(),
		requestBody.Name,
		requestBody.Price,
		requestBody.PurchaseDate,
	)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrEmptyItemName) ||
			errors.Is(serviceError, domain.ErrInvalidItemPrice) ||
			errors.Is(serviceError, domain.ErrInvalidPurchaseDate) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to create item")
		return
	}

	response.Success(ginContext, http.StatusCreated, "item created successfully", createdItem)
}

// Update handles PUT /api/items/:id to modify an existing item.
func (handlerInstance *ItemHandler) Update(ginContext *gin.Context) {
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

	updatedItem, serviceError := handlerInstance.itemService.UpdateItem(
		ginContext.Request.Context(),
		itemID,
		requestBody.Name,
		requestBody.Price,
		requestBody.PurchaseDate,
	)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrItemNotFound) {
			response.Error(ginContext, http.StatusNotFound, "item not found")
			return
		}
		if errors.Is(serviceError, domain.ErrEmptyItemName) ||
			errors.Is(serviceError, domain.ErrInvalidItemPrice) ||
			errors.Is(serviceError, domain.ErrInvalidPurchaseDate) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to update item")
		return
	}

	response.Success(ginContext, http.StatusOK, "item updated successfully", updatedItem)
}

// Delete handles DELETE /api/items/:id to remove an item.
func (handlerInstance *ItemHandler) Delete(ginContext *gin.Context) {
	itemID := ginContext.Param("id")
	if itemID == "" {
		response.Error(ginContext, http.StatusBadRequest, "item identifier is required")
		return
	}

	serviceError := handlerInstance.itemService.DeleteItem(ginContext.Request.Context(), itemID)
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
