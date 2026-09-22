package http_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
	transportHttp "cost-per-day/backend/internal/transport/http"
	"cost-per-day/backend/internal/transport/http/handler"
)

func setupStaticFrontendTestRouter(t *testing.T) *gin.Engine {
	t.Helper()

	staticDirectory := t.TempDir()
	if writeError := os.WriteFile(filepath.Join(staticDirectory, "index.html"), []byte("<html>production-spa</html>"), 0o644); writeError != nil {
		t.Fatalf("write test index: %v", writeError)
	}

	assetDirectory := filepath.Join(staticDirectory, "static")
	if makeDirectoryError := os.MkdirAll(assetDirectory, 0o755); makeDirectoryError != nil {
		t.Fatalf("create test asset directory: %v", makeDirectoryError)
	}
	if writeError := os.WriteFile(filepath.Join(assetDirectory, "app.js"), []byte("console.log('asset')"), 0o644); writeError != nil {
		t.Fatalf("write test asset: %v", writeError)
	}

	databaseLikeFile := filepath.Join(filepath.Dir(staticDirectory), "cost-per-day.db")
	if writeError := os.WriteFile(databaseLikeFile, []byte("sensitive-database-content"), 0o600); writeError != nil {
		t.Fatalf("write database-like test file: %v", writeError)
	}

	itemRepository := memory.NewMemoryItemRepository()
	settingsRepository := memory.NewMemorySettingsRepository()

	itemService := service.NewItemService(itemRepository)
	settingsService := service.NewSettingsService(settingsRepository)

	return transportHttp.SetupRouter(transportHttp.RouterConfig{
		AllowedOrigins:  "*",
		ItemHandler:     handler.NewItemHandler(itemService),
		SettingsHandler: handler.NewSettingsHandler(settingsService),
		HealthHandler:   handler.NewHealthHandler(),
		StaticDir:       staticDirectory,
	})
}

func TestStaticFrontendServesAssetsAndSPAFallback(t *testing.T) {
	routerInstance := setupStaticFrontendTestRouter(t)

	testCases := []struct {
		name             string
		requestPath      string
		expectedStatus   int
		expectedBodyText string
	}{
		{
			name:             "root serves frontend index",
			requestPath:      "/",
			expectedStatus:   http.StatusOK,
			expectedBodyText: "production-spa",
		},
		{
			name:             "client route falls back to frontend index",
			requestPath:      "/settings",
			expectedStatus:   http.StatusOK,
			expectedBodyText: "production-spa",
		},
		{
			name:             "compiled asset is served directly",
			requestPath:      "/static/app.js",
			expectedStatus:   http.StatusOK,
			expectedBodyText: "console.log('asset')",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(subTest *testing.T) {
			request := httptest.NewRequest(http.MethodGet, testCase.requestPath, nil)
			responseRecorder := httptest.NewRecorder()

			routerInstance.ServeHTTP(responseRecorder, request)

			if responseRecorder.Code != testCase.expectedStatus {
				subTest.Fatalf("expected status %d, got %d", testCase.expectedStatus, responseRecorder.Code)
			}
			if !strings.Contains(responseRecorder.Body.String(), testCase.expectedBodyText) {
				subTest.Fatalf("expected response to contain %q, got %q", testCase.expectedBodyText, responseRecorder.Body.String())
			}
		})
	}
}

func TestStaticFrontendDoesNotExposeRuntimeFiles(t *testing.T) {
	routerInstance := setupStaticFrontendTestRouter(t)

	request := httptest.NewRequest(http.MethodGet, "/cost-per-day.db", nil)
	responseRecorder := httptest.NewRecorder()

	routerInstance.ServeHTTP(responseRecorder, request)

	if strings.Contains(responseRecorder.Body.String(), "sensitive-database-content") {
		t.Fatal("database-like file outside static root was exposed")
	}
	if !strings.Contains(responseRecorder.Body.String(), "production-spa") {
		t.Fatalf("expected SPA fallback, got %q", responseRecorder.Body.String())
	}
}

func TestStaticFrontendDoesNotMaskUnknownAPIRoutes(t *testing.T) {
	routerInstance := setupStaticFrontendTestRouter(t)

	request := httptest.NewRequest(http.MethodGet, "/api/does-not-exist", nil)
	responseRecorder := httptest.NewRecorder()

	routerInstance.ServeHTTP(responseRecorder, request)

	if responseRecorder.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", responseRecorder.Code)
	}
	if strings.Contains(responseRecorder.Body.String(), "production-spa") {
		t.Fatal("unknown API route was incorrectly handled by SPA fallback")
	}
}
