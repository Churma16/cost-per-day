package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/transport/http/dto"
	"cost-per-day/backend/internal/transport/http/response"
)

// ReplaceAll handles PUT /api/items/replace to replace the complete item collection atomically.
func (handlerInstance *ItemHandler) ReplaceAll(ginContext *gin.Context) {
	var requestBody dto.ReplaceItemsRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}
	if requestBody == nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	replacementItems := make([]domain.Item, 0, len(requestBody))
	for _, requestItem := range requestBody {
		replacementItems = append(replacementItems, domain.Item{
			Name:         requestItem.Name,
			Price:        requestItem.Price,
			PurchaseDate: requestItem.PurchaseDate,
		})
	}

	replacedItems, serviceError := handlerInstance.itemService.ReplaceItems(
		ginContext.Request.Context(),
		replacementItems,
	)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrEmptyItemName) ||
			errors.Is(serviceError, domain.ErrInvalidItemPrice) ||
			errors.Is(serviceError, domain.ErrUnsupportedItemPrice) ||
			errors.Is(serviceError, domain.ErrInvalidPurchaseDate) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to replace items")
		return
	}

	response.Success(ginContext, http.StatusOK, "items replaced successfully", replacedItems)
}
