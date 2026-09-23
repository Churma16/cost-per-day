package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/http/response"
)

const authenticatedUserIDKey = "authenticated_user_id"

// StaticUserIdentity injects one trusted local user identity into every request.
// It keeps the pre-authentication deployment working until the real OIDC boundary replaces it.
func StaticUserIdentity(userID string) gin.HandlerFunc {
	normalizedUserID := strings.TrimSpace(userID)
	return func(ginContext *gin.Context) {
		SetAuthenticatedUserID(ginContext, normalizedUserID)
		ginContext.Next()
	}
}

// SetAuthenticatedUserID stores a trusted local user identity on the request context.
// Authentication middleware and tests can use this without exposing a client-controlled identity header in production.
func SetAuthenticatedUserID(ginContext *gin.Context, userID string) {
	ginContext.Set(authenticatedUserIDKey, strings.TrimSpace(userID))
}

// AuthenticatedUserID returns the local user identity supplied by the authentication boundary.
func AuthenticatedUserID(ginContext *gin.Context) (string, bool) {
	value, exists := ginContext.Get(authenticatedUserIDKey)
	if !exists {
		return "", false
	}

	userID, isString := value.(string)
	userID = strings.TrimSpace(userID)
	return userID, isString && userID != ""
}

// RequireAuthenticatedUser rejects API requests that reach the application without a user identity.
func RequireAuthenticatedUser() gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		if _, exists := AuthenticatedUserID(ginContext); !exists {
			response.Error(ginContext, 401, domain.ErrUserIdentityRequired.Error())
			ginContext.Abort()
			return
		}
		ginContext.Next()
	}
}
