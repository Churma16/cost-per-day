package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/http/response"
	"cost-per-day/backend/internal/service"
)

// DurabilityHandler handles HTTP requests related to durability analytics, categories, and brands.
type DurabilityHandler struct {
	durabilityService service.DurabilityAnalyticsService
}

// NewDurabilityHandler creates a new DurabilityHandler instance.
func NewDurabilityHandler(durabilityService service.DurabilityAnalyticsService) *DurabilityHandler {
	return &DurabilityHandler{
		durabilityService: durabilityService,
	}
}

// GetDurabilityAnalytics handles GET /api/insights/durability with optional category and brand query parameters.
func (handlerInstance *DurabilityHandler) GetDurabilityAnalytics(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	categoryFilter := ginContext.Query("category")
	brandFilter := ginContext.Query("brand")

	analyticsResult, calculationError := handlerInstance.durabilityService.CalculateDurabilityAnalytics(
		ginContext.Request.Context(),
		userID,
		categoryFilter,
		brandFilter,
	)
	if calculationError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to calculate durability analytics")
		return
	}

	response.Success(ginContext, http.StatusOK, "durability analytics retrieved successfully", analyticsResult)
}

// ListCategories handles GET /api/categories to retrieve user's taxonomy categories.
func (handlerInstance *DurabilityHandler) ListCategories(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	categoryList, serviceError := handlerInstance.durabilityService.ListCategories(ginContext.Request.Context(), userID)
	if serviceError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve categories")
		return
	}

	response.Success(ginContext, http.StatusOK, "categories retrieved successfully", categoryList)
}

// ListBrands handles GET /api/brands to retrieve user's taxonomy brands.
func (handlerInstance *DurabilityHandler) ListBrands(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	brandList, serviceError := handlerInstance.durabilityService.ListBrands(ginContext.Request.Context(), userID)
	if serviceError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve brands")
		return
	}

	response.Success(ginContext, http.StatusOK, "brands retrieved successfully", brandList)
}
