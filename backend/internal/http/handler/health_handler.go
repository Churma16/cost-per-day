package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/http/response"
)

// HealthHandler provides health check endpoints.
type HealthHandler struct {
	version  string
	revision string
}

// HealthHandlerConfig contains build metadata exposed by the health endpoint.
type HealthHandlerConfig struct {
	Version  string
	Revision string
}

// NewHealthHandler creates a health handler with development build metadata.
func NewHealthHandler() *HealthHandler {
	return NewHealthHandlerWithConfig(HealthHandlerConfig{})
}

// NewHealthHandlerWithConfig creates a health handler with explicit build metadata.
func NewHealthHandlerWithConfig(config HealthHandlerConfig) *HealthHandler {
	return &HealthHandler{
		version:  normalizeBuildMetadata(config.Version),
		revision: normalizeBuildMetadata(config.Revision),
	}
}

func normalizeBuildMetadata(value string) string {
	trimmedValue := strings.TrimSpace(value)
	if trimmedValue == "" {
		return "development"
	}
	return trimmedValue
}

// Check handles GET /health to return the service operational status.
func (handlerInstance *HealthHandler) Check(ginContext *gin.Context) {
	response.Success(ginContext, http.StatusOK, "service is healthy", gin.H{
		"status":   "healthy",
		"version":  handlerInstance.version,
		"revision": handlerInstance.revision,
	})
}
