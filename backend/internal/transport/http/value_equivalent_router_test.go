package http_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
	transportHttp "cost-per-day/backend/internal/transport/http"
	"cost-per-day/backend/internal/transport/http/dto"
	"cost-per-day/backend/internal/transport/http/handler"
	"cost-per-day/backend/internal/transport/http/middleware"
)

func setupEquivalentTestRouter(userID string) (*gin.Engine, service.ValueEquivalentService) {
	gin.SetMode(gin.TestMode)

	itemRepository := memory.NewMemoryItemRepository()
	settingsRepository := memory.NewMemorySettingsRepository()
	equivalentRepository := memory.NewMemoryValueEquivalentRepository()

	itemService := service.NewItemService(itemRepository)
	settingsService := service.NewSettingsService(settingsRepository)
	equivalentService := service.NewValueEquivalentService(equivalentRepository)

	itemHandler := handler.NewItemHandler(itemService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	healthHandler := handler.NewHealthHandler()
	equivalentHandler := handler.NewValueEquivalentHandler(equivalentService)

	routerEngine := transportHttp.SetupRouter(transportHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            itemHandler,
		SettingsHandler:        settingsHandler,
		HealthHandler:          healthHandler,
		ValueEquivalentHandler: equivalentHandler,
		UserIdentityMiddleware: middleware.StaticUserIdentity(userID),
	})

	return routerEngine, equivalentService
}

func TestValueEquivalentEndpoints(t *testing.T) {
	routerEngine, _ := setupEquivalentTestRouter("user-alpha")

	t.Run("creates and retrieves value equivalents", func(t *testing.T) {
		createPayload, _ := json.Marshal(dto.CreateValueEquivalentRequestDTO{
			Name:         "Gorengan",
			Amount:       2500,
			CurrencyCode: "IDR",
		})

		request, _ := http.NewRequest(http.MethodPost, "/api/value-equivalents", bytes.NewBuffer(createPayload))
		request.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d: %s", recorder.Code, recorder.Body.String())
		}

		envelope := parseResponseBody(t, recorder)
		dataMap, isMap := envelope.Data.(map[string]any)
		if !isMap {
			t.Fatalf("expected data object, got %T", envelope.Data)
		}
		equivalentID := dataMap["id"].(string)
		if equivalentID == "" {
			t.Fatal("expected non-empty id in response")
		}

		// GET by ID
		getRequest, _ := http.NewRequest(http.MethodGet, "/api/value-equivalents/"+equivalentID, nil)
		getRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(getRecorder, getRequest)

		if getRecorder.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", getRecorder.Code, getRecorder.Body.String())
		}

		// GET all
		listRequest, _ := http.NewRequest(http.MethodGet, "/api/value-equivalents", nil)
		listRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(listRecorder, listRequest)

		if listRecorder.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", listRecorder.Code, listRecorder.Body.String())
		}
		listEnvelope := parseResponseBody(t, listRecorder)
		itemsList, isList := listEnvelope.Data.([]any)
		if !isList || len(itemsList) != 1 {
			t.Fatalf("expected list of 1 equivalent, got %v", listEnvelope.Data)
		}

		// PUT update
		updatePayload, _ := json.Marshal(dto.UpdateValueEquivalentRequestDTO{
			Name:         "Gorengan Renyah",
			Amount:       3000,
			CurrencyCode: "IDR",
		})
		updateRequest, _ := http.NewRequest(http.MethodPut, "/api/value-equivalents/"+equivalentID, bytes.NewBuffer(updatePayload))
		updateRequest.Header.Set("Content-Type", "application/json")
		updateRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(updateRecorder, updateRequest)

		if updateRecorder.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", updateRecorder.Code, updateRecorder.Body.String())
		}

		// DELETE
		deleteRequest, _ := http.NewRequest(http.MethodDelete, "/api/value-equivalents/"+equivalentID, nil)
		deleteRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(deleteRecorder, deleteRequest)

		if deleteRecorder.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", deleteRecorder.Code, deleteRecorder.Body.String())
		}

		// GET after delete should return 404
		afterDeleteRequest, _ := http.NewRequest(http.MethodGet, "/api/value-equivalents/"+equivalentID, nil)
		afterDeleteRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(afterDeleteRecorder, afterDeleteRequest)

		if afterDeleteRecorder.Code != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found, got %d", afterDeleteRecorder.Code)
		}
	})

	t.Run("rejects invalid create requests", func(t *testing.T) {
		invalidPayload, _ := json.Marshal(dto.CreateValueEquivalentRequestDTO{
			Name:         "",
			Amount:       -10,
			CurrencyCode: "INVALID",
		})

		request, _ := http.NewRequest(http.MethodPost, "/api/value-equivalents", bytes.NewBuffer(invalidPayload))
		request.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 Bad Request, got %d", recorder.Code)
		}
	})

	t.Run("enforces cross-user isolation", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		sharedEquivalentRepo := memory.NewMemoryValueEquivalentRepository()
		equivalentService := service.NewValueEquivalentService(sharedEquivalentRepo)
		equivalentHandler := handler.NewValueEquivalentHandler(equivalentService)
		itemHandler := handler.NewItemHandler(service.NewItemService(memory.NewMemoryItemRepository()))
		settingsHandler := handler.NewSettingsHandler(service.NewSettingsService(memory.NewMemorySettingsRepository()))
		healthHandler := handler.NewHealthHandler()

		routerAlpha := transportHttp.SetupRouter(transportHttp.RouterConfig{
			AllowedOrigins:         "http://app.test",
			ItemHandler:            itemHandler,
			SettingsHandler:        settingsHandler,
			HealthHandler:          healthHandler,
			ValueEquivalentHandler: equivalentHandler,
			UserIdentityMiddleware: middleware.StaticUserIdentity("user-alpha"),
		})

		routerBeta := transportHttp.SetupRouter(transportHttp.RouterConfig{
			AllowedOrigins:         "http://app.test",
			ItemHandler:            itemHandler,
			SettingsHandler:        settingsHandler,
			HealthHandler:          healthHandler,
			ValueEquivalentHandler: equivalentHandler,
			UserIdentityMiddleware: middleware.StaticUserIdentity("user-beta"),
		})

		// Alpha creates an equivalent
		createPayload, _ := json.Marshal(dto.CreateValueEquivalentRequestDTO{
			Name:         "Secret Coffee",
			Amount:       15000,
			CurrencyCode: "IDR",
		})
		createReq, _ := http.NewRequest(http.MethodPost, "/api/value-equivalents", bytes.NewBuffer(createPayload))
		createReq.Header.Set("Content-Type", "application/json")
		createRec := httptest.NewRecorder()
		routerAlpha.ServeHTTP(createRec, createReq)

		if createRec.Code != http.StatusCreated {
			t.Fatalf("expected 201, got %d", createRec.Code)
		}
		data := parseResponseBody(t, createRec).Data.(map[string]any)
		id := data["id"].(string)

		// Beta cannot GET
		betaGetReq, _ := http.NewRequest(http.MethodGet, "/api/value-equivalents/"+id, nil)
		betaGetRec := httptest.NewRecorder()
		routerBeta.ServeHTTP(betaGetRec, betaGetReq)
		if betaGetRec.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for Beta, got %d", betaGetRec.Code)
		}

		// Beta sees empty list
		betaListReq, _ := http.NewRequest(http.MethodGet, "/api/value-equivalents", nil)
		betaListRec := httptest.NewRecorder()
		routerBeta.ServeHTTP(betaListRec, betaListReq)
		betaListData := parseResponseBody(t, betaListRec).Data.([]any)
		if len(betaListData) != 0 {
			t.Fatalf("expected Beta to see 0 equivalents, got %d", len(betaListData))
		}

		// Beta cannot PUT
		putPayload, _ := json.Marshal(dto.UpdateValueEquivalentRequestDTO{
			Name:         "Hacked Coffee",
			Amount:       1,
			CurrencyCode: "IDR",
		})
		betaPutReq, _ := http.NewRequest(http.MethodPut, "/api/value-equivalents/"+id, bytes.NewBuffer(putPayload))
		betaPutReq.Header.Set("Content-Type", "application/json")
		betaPutRec := httptest.NewRecorder()
		routerBeta.ServeHTTP(betaPutRec, betaPutReq)
		if betaPutRec.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for Beta PUT, got %d", betaPutRec.Code)
		}

		// Beta cannot DELETE
		betaDelReq, _ := http.NewRequest(http.MethodDelete, "/api/value-equivalents/"+id, nil)
		betaDelRec := httptest.NewRecorder()
		routerBeta.ServeHTTP(betaDelRec, betaDelReq)
		if betaDelRec.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for Beta DELETE, got %d", betaDelRec.Code)
		}
	})

	t.Run("persists and reloads amount with stable micro precision rounding", func(t *testing.T) {
		createPayload, _ := json.Marshal(dto.CreateValueEquivalentRequestDTO{
			Name:         "Precision Benchmark",
			Amount:       1.0000004,
			CurrencyCode: "USD",
		})

		request, _ := http.NewRequest(http.MethodPost, "/api/value-equivalents", bytes.NewBuffer(createPayload))
		request.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d: %s", recorder.Code, recorder.Body.String())
		}

		envelope := parseResponseBody(t, recorder)
		dataMap := envelope.Data.(map[string]any)
		equivalentID := dataMap["id"].(string)
		initialAmount := dataMap["amount"].(float64)

		if initialAmount != 1.0 {
			t.Fatalf("expected initial normalized amount 1.0, got %v", initialAmount)
		}

		// Reload from GET endpoint and assert amount remains identical and stable
		getRequest, _ := http.NewRequest(http.MethodGet, "/api/value-equivalents/"+equivalentID, nil)
		getRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(getRecorder, getRequest)

		if getRecorder.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", getRecorder.Code)
		}
		getEnvelope := parseResponseBody(t, getRecorder)
		getDataMap := getEnvelope.Data.(map[string]any)
		reloadedAmount := getDataMap["amount"].(float64)

		if reloadedAmount != initialAmount {
			t.Fatalf("expected reloaded amount %v to match initial amount %v", reloadedAmount, initialAmount)
		}
	})
}
