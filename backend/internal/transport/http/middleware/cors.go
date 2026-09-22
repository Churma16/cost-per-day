package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware handles cross-origin resource sharing headers and preflight OPTIONS requests.
func CORSMiddleware(allowedOrigins string) gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		originHeader := ginContext.Request.Header.Get("Origin")
		if allowedOrigins == "*" || allowedOrigins == "" {
			if originHeader != "" {
				ginContext.Writer.Header().Set("Access-Control-Allow-Origin", originHeader)
			} else {
				ginContext.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			ginContext.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigins)
		}

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
