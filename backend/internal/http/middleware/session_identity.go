package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/service"
	"cost-per-day/backend/internal/http/response"
)

// DefaultSessionCookieName is the opaque application session cookie shared by auth handlers and middleware.
const DefaultSessionCookieName = "cost_per_day_session"

// SessionIdentity resolves the application-owned session cookie to a trusted local user identity.
func SessionIdentity(authService *service.AuthService, cookieName string) gin.HandlerFunc {
	normalizedCookieName := strings.TrimSpace(cookieName)
	if normalizedCookieName == "" {
		normalizedCookieName = DefaultSessionCookieName
	}

	return func(ginContext *gin.Context) {
		sessionToken, cookieError := ginContext.Cookie(normalizedCookieName)
		if cookieError != nil {
			if errors.Is(cookieError, http.ErrNoCookie) {
				ginContext.Next()
				return
			}
			response.Error(ginContext, http.StatusBadRequest, "invalid authentication cookie")
			ginContext.Abort()
			return
		}

		user, authenticationError := authService.AuthenticateSession(ginContext.Request.Context(), sessionToken)
		if authenticationError != nil {
			if errors.Is(authenticationError, domain.ErrSessionNotFound) || errors.Is(authenticationError, domain.ErrUserNotFound) {
				ginContext.Next()
				return
			}
			response.Error(ginContext, http.StatusInternalServerError, "failed to authenticate session")
			ginContext.Abort()
			return
		}

		SetAuthenticatedUserID(ginContext, user.ID)
		ginContext.Next()
	}
}
