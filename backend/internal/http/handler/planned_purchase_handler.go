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

// PlannedPurchaseHandler handles HTTP requests related to user-owned planned purchases.
type PlannedPurchaseHandler struct {
	plannedPurchaseService           service.PlannedPurchaseService
	plannedPurchaseConversionService service.PlannedPurchaseConversionService
}

// NewPlannedPurchaseHandler creates a new PlannedPurchaseHandler instance.
func NewPlannedPurchaseHandler(
	plannedPurchaseService service.PlannedPurchaseService,
	conversionServices ...service.PlannedPurchaseConversionService,
) *PlannedPurchaseHandler {
	var conversionService service.PlannedPurchaseConversionService
	if len(conversionServices) > 0 {
		conversionService = conversionServices[0]
	}
	return &PlannedPurchaseHandler{
		plannedPurchaseService:           plannedPurchaseService,
		plannedPurchaseConversionService: conversionService,
	}
}

// List handles GET /api/planned-purchases to retrieve only the current user's planned purchases.
func (handlerInstance *PlannedPurchaseHandler) List(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	purchaseList, serviceError := handlerInstance.plannedPurchaseService.ListPlannedPurchases(ginContext.Request.Context(), userID)
	if serviceError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve planned purchases")
		return
	}

	response.Success(ginContext, http.StatusOK, "planned purchases retrieved successfully", purchaseList)
}

// Get handles GET /api/planned-purchases/:id without revealing whether another user owns the identifier.
func (handlerInstance *PlannedPurchaseHandler) Get(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	id := ginContext.Param("id")
	if id == "" {
		response.Error(ginContext, http.StatusBadRequest, "planned purchase identifier is required")
		return
	}

	purchase, serviceError := handlerInstance.plannedPurchaseService.GetPlannedPurchaseByID(ginContext.Request.Context(), userID, id)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrPlannedPurchaseNotFound) {
			response.Error(ginContext, http.StatusNotFound, "planned purchase not found")
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve planned purchase")
		return
	}

	response.Success(ginContext, http.StatusOK, "planned purchase retrieved successfully", purchase)
}

// Create handles POST /api/planned-purchases to create a new planned purchase for the current user.
func (handlerInstance *PlannedPurchaseHandler) Create(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	var requestBody dto.CreatePlannedPurchaseRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	var cadencePointer *domain.ContributionCadence
	if requestBody.ContributionCadence != nil {
		cadence := domain.ContributionCadence(*requestBody.ContributionCadence)
		cadencePointer = &cadence
	}

	createdPurchase, serviceError := handlerInstance.plannedPurchaseService.CreatePlannedPurchase(
		ginContext.Request.Context(),
		userID,
		domain.PlannedPurchase{
			Name:                requestBody.Name,
			TargetPrice:         requestBody.TargetPrice,
			CurrencyCode:        requestBody.CurrencyCode,
			TargetDate:          requestBody.TargetDate,
			ContributionAmount:  requestBody.ContributionAmount,
			ContributionCadence: cadencePointer,
		},
	)
	if serviceError != nil {
		if isPlannedPurchaseValidationError(serviceError) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to create planned purchase")
		return
	}

	response.Success(ginContext, http.StatusCreated, "planned purchase created successfully", createdPurchase)
}

// Update handles PUT /api/planned-purchases/:id only when the purchase belongs to the current user.
func (handlerInstance *PlannedPurchaseHandler) Update(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	id := ginContext.Param("id")
	if id == "" {
		response.Error(ginContext, http.StatusBadRequest, "planned purchase identifier is required")
		return
	}

	var requestBody dto.UpdatePlannedPurchaseRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	var cadencePointer *domain.ContributionCadence
	if requestBody.ContributionCadence != nil {
		cadence := domain.ContributionCadence(*requestBody.ContributionCadence)
		cadencePointer = &cadence
	}

	updatedPurchase, serviceError := handlerInstance.plannedPurchaseService.UpdatePlannedPurchase(
		ginContext.Request.Context(),
		userID,
		domain.PlannedPurchase{
			ID:                  id,
			Name:                requestBody.Name,
			TargetPrice:         requestBody.TargetPrice,
			CurrencyCode:        requestBody.CurrencyCode,
			TargetDate:          requestBody.TargetDate,
			ContributionAmount:  requestBody.ContributionAmount,
			ContributionCadence: cadencePointer,
		},
	)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrPlannedPurchaseNotFound) {
			response.Error(ginContext, http.StatusNotFound, "planned purchase not found")
			return
		}
		if isPlannedPurchaseValidationError(serviceError) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to update planned purchase")
		return
	}

	response.Success(ginContext, http.StatusOK, "planned purchase updated successfully", updatedPurchase)
}

// Delete handles DELETE /api/planned-purchases/:id only when the purchase belongs to the current user.
func (handlerInstance *PlannedPurchaseHandler) Delete(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	id := ginContext.Param("id")
	if id == "" {
		response.Error(ginContext, http.StatusBadRequest, "planned purchase identifier is required")
		return
	}

	serviceError := handlerInstance.plannedPurchaseService.DeletePlannedPurchase(ginContext.Request.Context(), userID, id)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrPlannedPurchaseNotFound) {
			response.Error(ginContext, http.StatusNotFound, "planned purchase not found")
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to delete planned purchase")
		return
	}

	response.Success(ginContext, http.StatusOK, "planned purchase deleted successfully", nil)
}

// Convert handles POST /api/planned-purchases/:id/convert and returns the newly created owned item.
func (handlerInstance *PlannedPurchaseHandler) Convert(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	id := ginContext.Param("id")
	if id == "" {
		response.Error(ginContext, http.StatusBadRequest, "planned purchase identifier is required")
		return
	}
	if handlerInstance.plannedPurchaseConversionService == nil {
		response.Error(ginContext, http.StatusInternalServerError, "planned purchase conversion is unavailable")
		return
	}

	var requestBody dto.ConvertPlannedPurchaseRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	createdItem, serviceError := handlerInstance.plannedPurchaseConversionService.ConvertPlannedPurchase(
		ginContext.Request.Context(),
		userID,
		id,
		requestBody.PurchasePrice,
		requestBody.CurrencyCode,
		requestBody.PurchaseDate,
	)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrPlannedPurchaseNotFound) {
			response.Error(ginContext, http.StatusNotFound, "planned purchase not found")
			return
		}
		if isItemValidationError(serviceError) || errors.Is(serviceError, domain.ErrPlannedPurchaseCurrencyMismatch) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to convert planned purchase")
		return
	}

	response.Success(ginContext, http.StatusCreated, "planned purchase converted successfully", createdItem)
}

func isPlannedPurchaseValidationError(candidate error) bool {
	return errors.Is(candidate, domain.ErrEmptyPlannedPurchaseName) ||
		errors.Is(candidate, domain.ErrInvalidPlannedPurchasePrice) ||
		errors.Is(candidate, domain.ErrUnsupportedPlannedPurchasePrice) ||
		errors.Is(candidate, domain.ErrInvalidPlannedPurchaseCurrency) ||
		errors.Is(candidate, domain.ErrInvalidTargetDate) ||
		errors.Is(candidate, domain.ErrInvalidContributionAmount) ||
		errors.Is(candidate, domain.ErrUnsupportedContributionAmount) ||
		errors.Is(candidate, domain.ErrInvalidContributionCadence) ||
		errors.Is(candidate, domain.ErrMissingContributionCadence) ||
		errors.Is(candidate, domain.ErrMissingContributionAmount)
}
