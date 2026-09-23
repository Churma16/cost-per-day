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

// SettingsHandler handles HTTP requests related to user-owned application configuration settings.
type SettingsHandler struct {
	settingsService service.SettingsService
}

// NewSettingsHandler creates a new SettingsHandler instance.
func NewSettingsHandler(settingsService service.SettingsService) *SettingsHandler {
	return &SettingsHandler{
		settingsService: settingsService,
	}
}

// GetAll handles GET /api/settings to retrieve only the current user's preferences.
func (handlerInstance *SettingsHandler) GetAll(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	allSettings, serviceError := handlerInstance.settingsService.GetAllSettings(ginContext.Request.Context(), userID)
	if serviceError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve settings")
		return
	}

	response.Success(ginContext, http.StatusOK, "settings retrieved successfully", allSettings)
}

// Update handles PUT /api/settings/:key to update only the current user's preference.
func (handlerInstance *SettingsHandler) Update(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	settingKey := ginContext.Param("key")
	if settingKey == "" {
		response.Error(ginContext, http.StatusBadRequest, "setting key is required")
		return
	}

	var requestBody dto.UpdateSettingRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	updatedSetting, serviceError := handlerInstance.settingsService.UpdateSetting(
		ginContext.Request.Context(),
		userID,
		settingKey,
		requestBody.Value,
	)
	if serviceError != nil {
		if errors.Is(serviceError, domain.ErrEmptySettingKey) || errors.Is(serviceError, domain.ErrEmptySettingValue) {
			response.Error(ginContext, http.StatusBadRequest, serviceError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to update setting")
		return
	}

	response.Success(ginContext, http.StatusOK, "setting updated successfully", gin.H{
		"key":   updatedSetting.Key,
		"value": updatedSetting.Value,
	})
}
