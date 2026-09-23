package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/http/dto"
	"cost-per-day/backend/internal/http/response"
)

// ReplaceAll handles PUT /api/items/replace to replace only the current user's item collection atomically.
func (handlerInstance *ItemHandler) ReplaceAll(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

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
		var targetType *domain.OwnershipTargetType
		if requestItem.TargetType != nil {
			t := domain.OwnershipTargetType(*requestItem.TargetType)
			targetType = &t
		}
		replacementItems = append(replacementItems, domain.Item{
			Name:         requestItem.Name,
			Price:        requestItem.Price,
			PurchaseDate: requestItem.PurchaseDate,
			Status:       domain.ItemStatus(requestItem.Status),
			EndedAt:      requestItem.EndedAt,
			SalePrice:    requestItem.SalePrice,
			TargetType:   targetType,
			TargetValue:  requestItem.TargetValue,
		})
	}

	replacedItems, serviceError := handlerInstance.itemService.ReplaceItems(
		ginContext.Request.Context(),
		userID,
		replacementItems,
	)
	if serviceError != nil {
		if isItemValidationError(serviceError) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to replace items")
		return
	}

	response.Success(ginContext, http.StatusOK, "items replaced successfully", replacedItems)
}
