package http_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
	transportHttp "cost-per-day/backend/internal/transport/http"
	"cost-per-day/backend/internal/transport/http/handler"
	"cost-per-day/backend/internal/transport/http/middleware"
	"cost-per-day/backend/internal/transport/http/response"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)

	itemRepository := memory.NewMemoryItemRepository()
	settingsRepository := memory.NewMemorySettingsRepository()

	itemService := service.NewItemService(itemRepository)
	settingsService := service.NewSettingsService(settingsRepository)

	itemHandler := handler.NewItemHandler(itemService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	healthHandler := handler.NewHealthHandler()

	return transportHttp.SetupRouter(transportHttp.RouterConfig{
		AllowedOrigins:  "http://app.test",
		ItemHandler:     itemHandler,
		SettingsHandler: settingsHandler,
		HealthHandler:          healthHandler,
		UserIdentityMiddleware: middleware.StaticUserIdentity(domain.LegacyUserID),
	})
}

func parseResponseBody(t *testing.T, responseRecorder *httptest.ResponseRecorder) response.Envelope {
	t.Helper()
	var parsedEnvelope response.Envelope
	decodeError := json.Unmarshal(responseRecorder.Body.Bytes(), &parsedEnvelope)
	if decodeError != nil {
		t.Fatalf("failed to decode JSON response envelope: %v. Body: %s", decodeError, responseRecorder.Body.String())
	}
	return parsedEnvelope
}

func TestHealthEndpoint(t *testing.T) {
	routerInstance := setupTestRouter()

	request, _ := http.NewRequest(http.MethodGet, "/health", nil)
	responseRecorder := httptest.NewRecorder()
	routerInstance.ServeHTTP(responseRecorder, request)

	if responseRecorder.Code != http.StatusOK {
		t.Errorf("expected status 200, got: %d", responseRecorder.Code)
	}

	responseEnvelope := parseResponseBody(t, responseRecorder)
	if responseEnvelope.Meta.Code != http.StatusOK {
		t.Errorf("expected meta.code 200, got: %d", responseEnvelope.Meta.Code)
	}
	if responseEnvelope.Meta.Message != "service is healthy" {
		t.Errorf("expected message 'service is healthy', got: %s", responseEnvelope.Meta.Message)
	}
	if responseEnvelope.Data == nil {
		t.Errorf("expected non-nil data payload for health check")
	}
}

func TestItemsAPI_CRUD(t *testing.T) {
	routerInstance := setupTestRouter()

	t.Run("GET /api/items initially returns empty list in canonical envelope", func(subTest *testing.T) {
		request, _ := http.NewRequest(http.MethodGet, "/api/items", nil)
		responseRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(responseRecorder, request)

		if responseRecorder.Code != http.StatusOK {
			subTest.Errorf("expected status 200, got: %d", responseRecorder.Code)
		}

		responseEnvelope := parseResponseBody(t, responseRecorder)
		if responseEnvelope.Meta.Code != http.StatusOK {
			subTest.Errorf("expected meta.code 200, got: %d", responseEnvelope.Meta.Code)
		}

		itemsDataSlice, isSlice := responseEnvelope.Data.([]any)
		if !isSlice || len(itemsDataSlice) != 0 {
			subTest.Errorf("expected empty array in data, got: %v", responseEnvelope.Data)
		}
	})

	var createdItemID string

	t.Run("POST /api/items creates item and returns 201 with envelope", func(subTest *testing.T) {
		payload := []byte(`{"name":"Smartphone","price":799.50,"purchaseDate":"2026-09-18T10:00:00Z"}`)
		request, _ := http.NewRequest(http.MethodPost, "/api/items", bytes.NewBuffer(payload))
		request.Header.Set("Content-Type", "application/json")

		responseRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(responseRecorder, request)

		if responseRecorder.Code != http.StatusCreated {
			subTest.Fatalf("expected status 201, got: %d, body: %s", responseRecorder.Code, responseRecorder.Body.String())
		}

		responseEnvelope := parseResponseBody(t, responseRecorder)
		if responseEnvelope.Meta.Code != http.StatusCreated {
			subTest.Errorf("expected meta.code 201, got: %d", responseEnvelope.Meta.Code)
		}

		itemMap, isMap := responseEnvelope.Data.(map[string]any)
		if !isMap {
			subTest.Fatalf("expected data to be an item map, got: %v", responseEnvelope.Data)
		}

		idValue, idExists := itemMap["id"].(string)
		if !idExists || idValue == "" {
			subTest.Errorf("expected non-empty item id in response")
		}
		createdItemID = idValue

		if itemMap["name"] != "Smartphone" {
			subTest.Errorf("expected name 'Smartphone', got: %v", itemMap["name"])
		}
		if itemMap["price"] != 799.50 {
			subTest.Errorf("expected price 799.50, got: %v", itemMap["price"])
		}
	})

	t.Run("POST /api/items validation failures return 400 with null data", func(subTest *testing.T) {
		testCases := []struct {
			testName        string
			jsonPayload     string
			expectedMessage string
		}{
			{
				testName:        "empty name",
				jsonPayload:     `{"name":"   ","price":100.0,"purchaseDate":"2026-09-18T10:00:00Z"}`,
				expectedMessage: "item name cannot be empty",
			},
			{
				testName:        "negative price",
				jsonPayload:     `{"name":"Monitor","price":-50.0,"purchaseDate":"2026-09-18T10:00:00Z"}`,
				expectedMessage: "item price must be greater than zero",
			},
			{
				testName:        "zero price",
				jsonPayload:     `{"name":"Monitor","price":0.0,"purchaseDate":"2026-09-18T10:00:00Z"}`,
				expectedMessage: "item price must be greater than zero",
			},
			{
				testName:        "price below supported precision",
				jsonPayload:     `{"name":"Monitor","price":0.0000004,"purchaseDate":"2026-09-18T10:00:00Z"}`,
				expectedMessage: "item price is outside supported range",
			},
			{
				testName:        "price at int64 boundary",
				jsonPayload:     `{"name":"Monitor","price":9223372036854.7754,"purchaseDate":"2026-09-18T10:00:00Z"}`,
				expectedMessage: "item price is outside supported range",
			},
			{
				testName:        "price above supported range",
				jsonPayload:     `{"name":"Monitor","price":10000000000000,"purchaseDate":"2026-09-18T10:00:00Z"}`,
				expectedMessage: "item price is outside supported range",
			},
			{
				testName:        "invalid purchase date",
				jsonPayload:     `{"name":"Monitor","price":150.0,"purchaseDate":"invalid-date"}`,
				expectedMessage: "invalid purchase date",
			},
			{
				testName:        "malformed json",
				jsonPayload:     `{not-valid-json}`,
				expectedMessage: "invalid request body format",
			},
		}

		for _, testCase := range testCases {
			subTest.Run(testCase.testName, func(caseTest *testing.T) {
				request, _ := http.NewRequest(http.MethodPost, "/api/items", bytes.NewBufferString(testCase.jsonPayload))
				request.Header.Set("Content-Type", "application/json")

				responseRecorder := httptest.NewRecorder()
				routerInstance.ServeHTTP(responseRecorder, request)

				if responseRecorder.Code != http.StatusBadRequest {
					caseTest.Errorf("expected status 400, got: %d", responseRecorder.Code)
				}

				responseEnvelope := parseResponseBody(caseTest, responseRecorder)
				if responseEnvelope.Meta.Code != http.StatusBadRequest {
					caseTest.Errorf("expected meta.code 400, got: %d", responseEnvelope.Meta.Code)
				}
				if responseEnvelope.Meta.Message != testCase.expectedMessage {
					caseTest.Errorf("expected message '%s', got: '%s'", testCase.expectedMessage, responseEnvelope.Meta.Message)
				}
				if responseEnvelope.Data != nil {
					caseTest.Errorf("expected data to be null, got: %v", responseEnvelope.Data)
				}
			})
		}
	})

	t.Run("PUT /api/items/:id updates item successfully", func(subTest *testing.T) {
		payload := []byte(`{"name":"Smartphone Pro","price":899.00,"purchaseDate":"2026-09-19T10:00:00Z"}`)
		request, _ := http.NewRequest(http.MethodPut, "/api/items/"+createdItemID, bytes.NewBuffer(payload))
		request.Header.Set("Content-Type", "application/json")

		responseRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(responseRecorder, request)

		if responseRecorder.Code != http.StatusOK {
			subTest.Fatalf("expected status 200, got: %d", responseRecorder.Code)
		}

		responseEnvelope := parseResponseBody(t, responseRecorder)
		itemMap := responseEnvelope.Data.(map[string]any)
		if itemMap["name"] != "Smartphone Pro" {
			subTest.Errorf("expected name 'Smartphone Pro', got: %v", itemMap["name"])
		}
		if itemMap["price"] != 899.00 {
			subTest.Errorf("expected price 899.00, got: %v", itemMap["price"])
		}
	})

	t.Run("PUT /api/items/:id with non-existent ID returns 404 with null data", func(subTest *testing.T) {
		payload := []byte(`{"name":"Phantom Item","price":10.0,"purchaseDate":"2026-09-19T10:00:00Z"}`)
		request, _ := http.NewRequest(http.MethodPut, "/api/items/non-existent-id", bytes.NewBuffer(payload))
		request.Header.Set("Content-Type", "application/json")

		responseRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(responseRecorder, request)

		if responseRecorder.Code != http.StatusNotFound {
			subTest.Errorf("expected status 404, got: %d", responseRecorder.Code)
		}

		responseEnvelope := parseResponseBody(t, responseRecorder)
		if responseEnvelope.Meta.Code != http.StatusNotFound {
			subTest.Errorf("expected meta.code 404, got: %d", responseEnvelope.Meta.Code)
		}
		if responseEnvelope.Data != nil {
			subTest.Errorf("expected data to be null, got: %v", responseEnvelope.Data)
		}
	})

	t.Run("DELETE /api/items/:id deletes item and returns 200 with null data", func(subTest *testing.T) {
		request, _ := http.NewRequest(http.MethodDelete, "/api/items/"+createdItemID, nil)
		responseRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(responseRecorder, request)

		if responseRecorder.Code != http.StatusOK {
			subTest.Fatalf("expected status 200, got: %d", responseRecorder.Code)
		}

		responseEnvelope := parseResponseBody(t, responseRecorder)
		if responseEnvelope.Meta.Code != http.StatusOK {
			subTest.Errorf("expected meta.code 200, got: %d", responseEnvelope.Meta.Code)
		}
		if responseEnvelope.Data != nil {
			subTest.Errorf("expected data to be null, got: %v", responseEnvelope.Data)
		}

		// Verify deletion
		getRequest, _ := http.NewRequest(http.MethodGet, "/api/items", nil)
		getResponseRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(getResponseRecorder, getRequest)
		getEnvelope := parseResponseBody(t, getResponseRecorder)
		itemsList := getEnvelope.Data.([]any)
		if len(itemsList) != 0 {
			subTest.Errorf("expected 0 items after deletion, got: %d", len(itemsList))
		}
	})

	t.Run("DELETE /api/items/:id on non-existent ID returns 404 with null data", func(subTest *testing.T) {
		request, _ := http.NewRequest(http.MethodDelete, "/api/items/non-existent-id", nil)
		responseRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(responseRecorder, request)

		if responseRecorder.Code != http.StatusNotFound {
			subTest.Errorf("expected status 404, got: %d", responseRecorder.Code)
		}

		responseEnvelope := parseResponseBody(t, responseRecorder)
		if responseEnvelope.Meta.Code != http.StatusNotFound {
			subTest.Errorf("expected meta.code 404, got: %d", responseEnvelope.Meta.Code)
		}
		if responseEnvelope.Data != nil {
			subTest.Errorf("expected data to be null, got: %v", responseEnvelope.Data)
		}
	})
}

func TestSettingsAPI(t *testing.T) {
	routerInstance := setupTestRouter()

	t.Run("GET /api/settings returns default settings in envelope", func(subTest *testing.T) {
		request, _ := http.NewRequest(http.MethodGet, "/api/settings", nil)
		responseRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(responseRecorder, request)

		if responseRecorder.Code != http.StatusOK {
			subTest.Errorf("expected status 200, got: %d", responseRecorder.Code)
		}

		responseEnvelope := parseResponseBody(t, responseRecorder)
		settingsMap, isMap := responseEnvelope.Data.(map[string]any)
		if !isMap {
			subTest.Fatalf("expected data to be a settings map, got: %v", responseEnvelope.Data)
		}

		if settingsMap["language"] != "en" {
			subTest.Errorf("expected default language 'en', got: %v", settingsMap["language"])
		}
		if settingsMap["currency"] != "USD" {
			subTest.Errorf("expected default currency 'USD', got: %v", settingsMap["currency"])
		}
	})

	t.Run("PUT /api/settings/:key returns normalized setting and reflects it in subsequent GET", func(subTest *testing.T) {
		payload := []byte(`{"value":" id "}`)
		updateRequest, _ := http.NewRequest(http.MethodPut, "/api/settings/language", bytes.NewBuffer(payload))
		updateRequest.Header.Set("Content-Type", "application/json")

		updateRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(updateRecorder, updateRequest)

		if updateRecorder.Code != http.StatusOK {
			subTest.Fatalf("expected status 200, got: %d", updateRecorder.Code)
		}

		updateEnvelope := parseResponseBody(t, updateRecorder)
		if updateEnvelope.Meta.Code != http.StatusOK {
			subTest.Errorf("expected meta.code 200, got: %d", updateEnvelope.Meta.Code)
		}
		updatedSetting, isMap := updateEnvelope.Data.(map[string]any)
		if !isMap {
			subTest.Fatalf("expected updated setting data to be a map, got: %v", updateEnvelope.Data)
		}
		if updatedSetting["key"] != "language" {
			subTest.Errorf("expected normalized key 'language', got: %v", updatedSetting["key"])
		}
		if updatedSetting["value"] != "id" {
			subTest.Errorf("expected normalized value 'id', got: %v", updatedSetting["value"])
		}

		// Verify change with GET /api/settings
		getRequest, _ := http.NewRequest(http.MethodGet, "/api/settings", nil)
		getRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(getRecorder, getRequest)

		getEnvelope := parseResponseBody(t, getRecorder)
		settingsMap := getEnvelope.Data.(map[string]any)
		if settingsMap["language"] != "id" {
			subTest.Errorf("expected updated language 'id', got: %v", settingsMap["language"])
		}
	})

	t.Run("PUT /api/settings/:key with empty value returns 400 with null data", func(subTest *testing.T) {
		payload := []byte(`{"value":"   "}`)
		updateRequest, _ := http.NewRequest(http.MethodPut, "/api/settings/language", bytes.NewBuffer(payload))
		updateRequest.Header.Set("Content-Type", "application/json")

		updateRecorder := httptest.NewRecorder()
		routerInstance.ServeHTTP(updateRecorder, updateRequest)

		if updateRecorder.Code != http.StatusBadRequest {
			subTest.Errorf("expected status 400, got: %d", updateRecorder.Code)
		}

		updateEnvelope := parseResponseBody(t, updateRecorder)
		if updateEnvelope.Meta.Code != http.StatusBadRequest {
			subTest.Errorf("expected meta.code 400, got: %d", updateEnvelope.Meta.Code)
		}
		if updateEnvelope.Data != nil {
			subTest.Errorf("expected data to be null, got: %v", updateEnvelope.Data)
		}
	})
}
