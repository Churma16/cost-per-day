package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/http/middleware"
	"cost-per-day/backend/internal/http/response"
)

func authenticatedUserID(ginContext *gin.Context) (string, bool) {
	userID, exists := middleware.AuthenticatedUserID(ginContext)
	if !exists {
		response.Error(ginContext, http.StatusUnauthorized, domain.ErrUserIdentityRequired.Error())
		return "", false
	}
	return userID, true
}
