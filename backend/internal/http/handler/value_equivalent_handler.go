package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/service"
	"cost-per-day/backend/internal/http/dto"
	"cost-per-day/backend/internal/http/response"
)

// ValueEquivalentHandler handles HTTP requests related to user-owned value equivalents.
type ValueEquivalentHandler struct {
	equivalentService service.ValueEquivalentService
}

// NewValueEquivalentHandler creates a new ValueEquivalentHandler instance.
func NewValueEquivalentHandler(equivalentService service.ValueEquivalentService) *ValueEquivalentHandler {
	return &ValueEquivalentHandler{
		equivalentService: equivalentService,
	}
}

// List handles GET /api/value-equivalents to retrieve only the current user's value equivalents.
func (handlerInstance *ValueEquivalentHandler) List(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	equivalentList, serviceError := handlerInstance.equivalentService.ListValueEquivalents(ginContext.Request.Context(), userID)
	if serviceError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve value equivalents")
		return
	}

	response.Success(ginContext, http.StatusOK, "value equivalents retrieved successfully", equivalentList)
}

// Get handles GET /api/value-equivalents/:id without revealing whether another user owns the identifier.
func (handlerInstance *ValueEquivalentHandler) Get(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	id := ginContext.Param("id")
	if id == "" {
		response.Error(ginContext, http.StatusBadRequest, "value equivalent identifier is required")
		return
	}

	equivalent, serviceError := handlerInstance.equivalentService.GetValueEquivalentByID(ginContext.Request.Context(), userID, id)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrValueEquivalentNotFound) {
			response.Error(ginContext, http.StatusNotFound, "value equivalent not found")
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve value equivalent")
		return
	}

	response.Success(ginContext, http.StatusOK, "value equivalent retrieved successfully", equivalent)
}

// Create handles POST /api/value-equivalents to create a new value equivalent for the user.
func (handlerInstance *ValueEquivalentHandler) Create(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	var requestBody dto.CreateValueEquivalentRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	createdEquivalent, serviceError := handlerInstance.equivalentService.CreateValueEquivalent(
		ginContext.Request.Context(),
		userID,
		requestBody.Name,
		requestBody.Amount,
		requestBody.CurrencyCode,
	)
	if serviceError != nil {
		if isValueEquivalentValidationError(serviceError) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to create value equivalent")
		return
	}

	response.Success(ginContext, http.StatusCreated, "value equivalent created successfully", createdEquivalent)
}

// Update handles PUT /api/value-equivalents/:id only when the equivalent belongs to the user.
func (handlerInstance *ValueEquivalentHandler) Update(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	id := ginContext.Param("id")
	if id == "" {
		response.Error(ginContext, http.StatusBadRequest, "value equivalent identifier is required")
		return
	}

	var requestBody dto.UpdateValueEquivalentRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	updatedEquivalent, serviceError := handlerInstance.equivalentService.UpdateValueEquivalent(
		ginContext.Request.Context(),
		userID,
		id,
		requestBody.Name,
		requestBody.Amount,
		requestBody.CurrencyCode,
	)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrValueEquivalentNotFound) {
			response.Error(ginContext, http.StatusNotFound, "value equivalent not found")
			return
		}
		if isValueEquivalentValidationError(serviceError) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to update value equivalent")
		return
	}

	response.Success(ginContext, http.StatusOK, "value equivalent updated successfully", updatedEquivalent)
}

// Delete handles DELETE /api/value-equivalents/:id only when the equivalent belongs to the user.
func (handlerInstance *ValueEquivalentHandler) Delete(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	id := ginContext.Param("id")
	if id == "" {
		response.Error(ginContext, http.StatusBadRequest, "value equivalent identifier is required")
		return
	}

	serviceError := handlerInstance.equivalentService.DeleteValueEquivalent(ginContext.Request.Context(), userID, id)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrValueEquivalentNotFound) {
			response.Error(ginContext, http.StatusNotFound, "value equivalent not found")
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to delete value equivalent")
		return
	}

	response.Success(ginContext, http.StatusOK, "value equivalent deleted successfully", nil)
}

func isValueEquivalentValidationError(candidate error) bool {
	return errors.Is(candidate, domain.ErrEmptyValueEquivalentName) ||
		errors.Is(candidate, domain.ErrInvalidValueEquivalentAmount) ||
		errors.Is(candidate, domain.ErrUnsupportedValueEquivalentAmount) ||
		errors.Is(candidate, domain.ErrInvalidValueEquivalentCurrency)
}
