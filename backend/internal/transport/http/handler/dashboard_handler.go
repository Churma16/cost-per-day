package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/service"
	"cost-per-day/backend/internal/transport/http/response"
)

// DashboardHandler provides HTTP transport endpoints for home dashboard metrics and carousel insights.
type DashboardHandler struct {
	dashboardService service.DashboardService
}

// NewDashboardHandler constructs a new DashboardHandler instance.
func NewDashboardHandler(dashboardService service.DashboardService) *DashboardHandler {
	return &DashboardHandler{
		dashboardService: dashboardService,
	}
}

// GetDashboard retrieves aggregated metrics and ranked insights for the authenticated user.
func (handler *DashboardHandler) GetDashboard(ginContext *gin.Context) {
	userID, exists := authenticatedUserID(ginContext)
	if !exists {
		return
	}

	dashboardData, serviceError := handler.dashboardService.GetDashboard(ginContext.Request.Context(), userID)
	if serviceError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "Failed to load dashboard data.")
		return
	}

	response.Success(ginContext, http.StatusOK, "Dashboard data retrieved successfully.", dashboardData)
}
