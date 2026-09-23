package http_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
	appHttp "cost-per-day/backend/internal/http"
	"cost-per-day/backend/internal/http/dto"
	"cost-per-day/backend/internal/http/handler"
	"cost-per-day/backend/internal/http/middleware"
)

func setupPlannedPurchaseTestRouter(userID string) (*gin.Engine, service.PlannedPurchaseService) {
	gin.SetMode(gin.TestMode)

	itemRepository := memory.NewMemoryItemRepository()
	settingsRepository := memory.NewMemorySettingsRepository()
	plannedPurchaseRepository := memory.NewMemoryPlannedPurchaseRepository()

	itemService := service.NewItemService(itemRepository)
	settingsService := service.NewSettingsService(settingsRepository)
	plannedPurchaseService := service.NewPlannedPurchaseService(plannedPurchaseRepository)

	itemHandler := handler.NewItemHandler(itemService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	healthHandler := handler.NewHealthHandler()
	plannedPurchaseHandler := handler.NewPlannedPurchaseHandler(plannedPurchaseService)

	routerEngine := appHttp.SetupRouter(appHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            itemHandler,
		SettingsHandler:        settingsHandler,
		HealthHandler:          healthHandler,
		PlannedPurchaseHandler: plannedPurchaseHandler,
		UserIdentityMiddleware: middleware.StaticUserIdentity(userID),
	})

	return routerEngine, plannedPurchaseService
}

func TestPlannedPurchaseEndpoints(t *testing.T) {
	routerEngine, _ := setupPlannedPurchaseTestRouter("user-alpha")

	t.Run("creates and retrieves planned purchases with contribution framing", func(t *testing.T) {
		contributionAmount := 25000.0
		cadence := "daily"
		createPayload, _ := json.Marshal(dto.CreatePlannedPurchaseRequestDTO{
			Name:                "MacBook Air",
			TargetPrice:         18000000,
			CurrencyCode:        "IDR",
			ContributionAmount:  &contributionAmount,
			ContributionCadence: &cadence,
		})

		request, _ := http.NewRequest(http.MethodPost, "/api/planned-purchases", bytes.NewBuffer(createPayload))
		request.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d: %s", recorder.Code, recorder.Body.String())
		}

		envelope := parseResponseBody(t, recorder)
		dataMap, isMap := envelope.Data.(map[string]any)
		if !isMap {
			t.Fatalf("expected data map, got %T", envelope.Data)
		}
		purchaseID, isString := dataMap["id"].(string)
		if !isString || purchaseID == "" {
			t.Fatal("expected non-empty purchase ID in response")
		}

		// Verify calculated framing
		estimatedPeriods, hasPeriods := dataMap["estimatedPeriods"].(float64)
		if !hasPeriods || estimatedPeriods != 720 {
			t.Fatalf("expected estimatedPeriods 720, got %v", dataMap["estimatedPeriods"])
		}

		// GET by ID
		getRequest, _ := http.NewRequest(http.MethodGet, "/api/planned-purchases/"+purchaseID, nil)
		getRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(getRecorder, getRequest)

		if getRecorder.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", getRecorder.Code, getRecorder.Body.String())
		}

		// GET all list
		listRequest, _ := http.NewRequest(http.MethodGet, "/api/planned-purchases", nil)
		listRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(listRecorder, listRequest)

		if listRecorder.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", listRecorder.Code, listRecorder.Body.String())
		}
		listEnvelope := parseResponseBody(t, listRecorder)
		purchasesList, isList := listEnvelope.Data.([]any)
		if !isList || len(purchasesList) != 1 {
			t.Fatalf("expected list of 1 planned purchase, got %v", listEnvelope.Data)
		}

		// PUT update
		updatedAmount := 30000.0
		updatePayload, _ := json.Marshal(dto.UpdatePlannedPurchaseRequestDTO{
			Name:                "MacBook Pro",
			TargetPrice:         18000000,
			CurrencyCode:        "IDR",
			ContributionAmount:  &updatedAmount,
			ContributionCadence: &cadence,
		})
		updateRequest, _ := http.NewRequest(http.MethodPut, "/api/planned-purchases/"+purchaseID, bytes.NewBuffer(updatePayload))
		updateRequest.Header.Set("Content-Type", "application/json")
		updateRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(updateRecorder, updateRequest)

		if updateRecorder.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", updateRecorder.Code, updateRecorder.Body.String())
		}
		updatedEnvelope := parseResponseBody(t, updateRecorder)
		updatedData := updatedEnvelope.Data.(map[string]any)
		if updatedData["name"] != "MacBook Pro" {
			t.Fatalf("expected updated name MacBook Pro, got %v", updatedData["name"])
		}
		if updatedData["estimatedPeriods"] != 600.0 { // 18M / 30K = 600
			t.Fatalf("expected updated estimatedPeriods 600, got %v", updatedData["estimatedPeriods"])
		}

		// DELETE
		deleteRequest, _ := http.NewRequest(http.MethodDelete, "/api/planned-purchases/"+purchaseID, nil)
		deleteRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(deleteRecorder, deleteRequest)

		if deleteRecorder.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d: %s", deleteRecorder.Code, deleteRecorder.Body.String())
		}

		// Verify 404 after delete
		verifyGetRequest, _ := http.NewRequest(http.MethodGet, "/api/planned-purchases/"+purchaseID, nil)
		verifyGetRecorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(verifyGetRecorder, verifyGetRequest)

		if verifyGetRecorder.Code != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found after delete, got %d", verifyGetRecorder.Code)
		}
	})

	t.Run("calculates required contributions when target date is supplied", func(t *testing.T) {
		targetDate := time.Now().UTC().AddDate(0, 0, 365).Format("2006-01-02")
		createPayload, _ := json.Marshal(dto.CreatePlannedPurchaseRequestDTO{
			Name:         "Camera",
			TargetPrice:  3650,
			CurrencyCode: "USD",
			TargetDate:   &targetDate,
		})

		request, _ := http.NewRequest(http.MethodPost, "/api/planned-purchases", bytes.NewBuffer(createPayload))
		request.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusCreated {
			t.Fatalf("expected 201 Created, got %d: %s", recorder.Code, recorder.Body.String())
		}

		envelope := parseResponseBody(t, recorder)
		dataMap := envelope.Data.(map[string]any)
		dailyContribution, hasDaily := dataMap["requiredDailyContribution"].(float64)
		if !hasDaily || dailyContribution < 9.9 || dailyContribution > 10.1 {
			t.Fatalf("expected requiredDailyContribution ~10.0, got %v", dataMap["requiredDailyContribution"])
		}
	})

	t.Run("rejects invalid inputs with 400 Bad Request", func(t *testing.T) {
		invalidPayloads := []dto.CreatePlannedPurchaseRequestDTO{
			{Name: "", TargetPrice: 100, CurrencyCode: "USD"},
			{Name: "Item", TargetPrice: -10, CurrencyCode: "USD"},
			{Name: "Item", TargetPrice: 100, CurrencyCode: "INVALID"},
		}

		for _, payload := range invalidPayloads {
			body, _ := json.Marshal(payload)
			request, _ := http.NewRequest(http.MethodPost, "/api/planned-purchases", bytes.NewBuffer(body))
			request.Header.Set("Content-Type", "application/json")
			recorder := httptest.NewRecorder()
			routerEngine.ServeHTTP(recorder, request)

			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("expected 400 Bad Request for %+v, got %d: %s", payload, recorder.Code, recorder.Body.String())
			}
		}
	})
}

func TestPlannedPurchaseUserIsolation(t *testing.T) {
	plannedPurchaseRepository := memory.NewMemoryPlannedPurchaseRepository()
	itemRepository := memory.NewMemoryItemRepository()
	settingsRepository := memory.NewMemorySettingsRepository()

	itemService := service.NewItemService(itemRepository)
	settingsService := service.NewSettingsService(settingsRepository)
	plannedPurchaseService := service.NewPlannedPurchaseService(plannedPurchaseRepository)

	itemHandler := handler.NewItemHandler(itemService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	healthHandler := handler.NewHealthHandler()
	plannedPurchaseHandler := handler.NewPlannedPurchaseHandler(plannedPurchaseService)

	userAlphaEngine := appHttp.SetupRouter(appHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            itemHandler,
		SettingsHandler:        settingsHandler,
		HealthHandler:          healthHandler,
		PlannedPurchaseHandler: plannedPurchaseHandler,
		UserIdentityMiddleware: middleware.StaticUserIdentity("user-alpha"),
	})

	userBetaEngine := appHttp.SetupRouter(appHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            itemHandler,
		SettingsHandler:        settingsHandler,
		HealthHandler:          healthHandler,
		PlannedPurchaseHandler: plannedPurchaseHandler,
		UserIdentityMiddleware: middleware.StaticUserIdentity("user-beta"),
	})

	// User Alpha creates a planned purchase
	createPayload, _ := json.Marshal(dto.CreatePlannedPurchaseRequestDTO{
		Name:         "Drone",
		TargetPrice:  1500,
		CurrencyCode: "USD",
	})
	request, _ := http.NewRequest(http.MethodPost, "/api/planned-purchases", bytes.NewBuffer(createPayload))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	userAlphaEngine.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d", recorder.Code)
	}
	envelope := parseResponseBody(t, recorder)
	purchaseID := envelope.Data.(map[string]any)["id"].(string)

	// User Beta cannot GET Alpha's purchase (should return 404)
	betaGetRequest, _ := http.NewRequest(http.MethodGet, "/api/planned-purchases/"+purchaseID, nil)
	betaGetRecorder := httptest.NewRecorder()
	userBetaEngine.ServeHTTP(betaGetRecorder, betaGetRequest)

	if betaGetRecorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for User Beta accessing Alpha's purchase, got %d", betaGetRecorder.Code)
	}

	// User Beta cannot list Alpha's purchase
	betaListRequest, _ := http.NewRequest(http.MethodGet, "/api/planned-purchases", nil)
	betaListRecorder := httptest.NewRecorder()
	userBetaEngine.ServeHTTP(betaListRecorder, betaListRequest)

	betaEnvelope := parseResponseBody(t, betaListRecorder)
	betaList := betaEnvelope.Data.([]any)
	if len(betaList) != 0 {
		t.Fatalf("expected empty list for User Beta, got %d items", len(betaList))
	}

	// User Beta cannot PUT Alpha's purchase
	updatePayload, _ := json.Marshal(dto.UpdatePlannedPurchaseRequestDTO{
		Name:         "Hacked Drone",
		TargetPrice:  2000,
		CurrencyCode: "USD",
	})
	betaPutRequest, _ := http.NewRequest(http.MethodPut, "/api/planned-purchases/"+purchaseID, bytes.NewBuffer(updatePayload))
	betaPutRequest.Header.Set("Content-Type", "application/json")
	betaPutRecorder := httptest.NewRecorder()
	userBetaEngine.ServeHTTP(betaPutRecorder, betaPutRequest)

	if betaPutRecorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for User Beta attempting update, got %d", betaPutRecorder.Code)
	}

	// User Beta cannot DELETE Alpha's purchase
	betaDeleteRequest, _ := http.NewRequest(http.MethodDelete, "/api/planned-purchases/"+purchaseID, nil)
	betaDeleteRecorder := httptest.NewRecorder()
	userBetaEngine.ServeHTTP(betaDeleteRecorder, betaDeleteRequest)

	if betaDeleteRecorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for User Beta attempting delete, got %d", betaDeleteRecorder.Code)
	}
}
