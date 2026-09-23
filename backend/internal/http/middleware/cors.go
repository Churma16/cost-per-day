package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware allows credentialed cross-origin requests only from explicitly configured origins.
func CORSMiddleware(allowedOrigins string) gin.HandlerFunc {
	allowedOriginSet := make(map[string]struct{})
	for _, configuredOrigin := range strings.Split(allowedOrigins, ",") {
		normalizedOrigin := strings.TrimSpace(configuredOrigin)
		if normalizedOrigin == "" || normalizedOrigin == "*" {
			continue
		}
		allowedOriginSet[normalizedOrigin] = struct{}{}
	}

	return func(ginContext *gin.Context) {
		originHeader := strings.TrimSpace(ginContext.Request.Header.Get("Origin"))
		if originHeader == "" {
			ginContext.Next()
			return
		}

		if _, allowed := allowedOriginSet[originHeader]; !allowed {
			if ginContext.Request.Method == http.MethodOptions {
				ginContext.AbortWithStatus(http.StatusForbidden)
				return
			}
			ginContext.Next()
			return
		}

		ginContext.Writer.Header().Set("Vary", "Origin")
		ginContext.Writer.Header().Set("Access-Control-Allow-Origin", originHeader)
		ginContext.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		ginContext.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		ginContext.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if ginContext.Request.Method == http.MethodOptions {
			ginContext.AbortWithStatus(http.StatusNoContent)
			return
		}

		ginContext.Next()
	}
}
