package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/http/middleware"
)

func TestCORSMiddlewareAllowsOnlyConfiguredCredentialedOrigins(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(middleware.CORSMiddleware("https://app.example.com,http://localhost:3000"))
	router.GET("/resource", func(context *gin.Context) {
		context.Status(http.StatusOK)
	})

	allowedRequest := httptest.NewRequest(http.MethodGet, "/resource", nil)
	allowedRequest.Header.Set("Origin", "https://app.example.com")
	allowedResponse := httptest.NewRecorder()
	router.ServeHTTP(allowedResponse, allowedRequest)
	if allowedResponse.Header().Get("Access-Control-Allow-Origin") != "https://app.example.com" {
		t.Fatalf("expected configured origin to be authorized, headers: %v", allowedResponse.Header())
	}
	if allowedResponse.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatal("expected credentialed CORS for configured origin")
	}

	blockedRequest := httptest.NewRequest(http.MethodGet, "/resource", nil)
	blockedRequest.Header.Set("Origin", "https://sibling.example.com")
	blockedResponse := httptest.NewRecorder()
	router.ServeHTTP(blockedResponse, blockedRequest)
	if blockedResponse.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("unexpected CORS authorization for untrusted origin: %v", blockedResponse.Header())
	}

	blockedPreflight := httptest.NewRequest(http.MethodOptions, "/resource", nil)
	blockedPreflight.Header.Set("Origin", "https://sibling.example.com")
	blockedPreflight.Header.Set("Access-Control-Request-Method", http.MethodPost)
	blockedPreflightResponse := httptest.NewRecorder()
	router.ServeHTTP(blockedPreflightResponse, blockedPreflight)
	if blockedPreflightResponse.Code != http.StatusForbidden {
		t.Fatalf("expected untrusted preflight to be rejected, got %d", blockedPreflightResponse.Code)
	}
	if blockedPreflightResponse.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("untrusted preflight must not receive CORS authorization: %v", blockedPreflightResponse.Header())
	}

	allowedPreflight := httptest.NewRequest(http.MethodOptions, "/resource", nil)
	allowedPreflight.Header.Set("Origin", "https://app.example.com")
	allowedPreflight.Header.Set("Access-Control-Request-Method", http.MethodPut)
	allowedPreflightResponse := httptest.NewRecorder()
	router.ServeHTTP(allowedPreflightResponse, allowedPreflight)
	if allowedPreflightResponse.Code != http.StatusNoContent {
		t.Fatalf("expected trusted preflight 204, got %d", allowedPreflightResponse.Code)
	}
	if allowedPreflightResponse.Header().Get("Access-Control-Allow-Origin") != "https://app.example.com" {
		t.Fatalf("expected trusted preflight authorization, headers: %v", allowedPreflightResponse.Header())
	}
}
