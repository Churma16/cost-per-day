package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/transport/http/response"
)

// HealthHandler provides health check endpoints.
type HealthHandler struct{}

// NewHealthHandler creates a new HealthHandler instance.
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Check handles GET /health to return the service operational status.
func (handlerInstance *HealthHandler) Check(ginContext *gin.Context) {
	response.Success(ginContext, http.StatusOK, "service is healthy", gin.H{
		"status": "healthy",
	})
}
