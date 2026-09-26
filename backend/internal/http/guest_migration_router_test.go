package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	appHttp "cost-per-day/backend/internal/http"
	"cost-per-day/backend/internal/http/handler"
	"cost-per-day/backend/internal/http/middleware"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
	"cost-per-day/backend/internal/service"
)

func TestGuestMigrationRequiresAuthenticationAndIsIdempotent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx := context.Background()
	databaseConnection, databaseError := sqliterepository.Open(
		ctx,
		filepath.Join(t.TempDir(), "guest-migration.db"),
	)
	if databaseError != nil {
		t.Fatalf("open guest migration database: %v", databaseError)
	}
	t.Cleanup(func() { _ = databaseConnection.Close() })

	gormDB, gormError := sqliterepository.NewGORM(databaseConnection)
	if gormError != nil {
		t.Fatalf("initialize GORM: %v", gormError)
	}

	userRepository := sqliterepository.NewUserRepository(gormDB)
	user, userError := userRepository.FindOrCreateGoogleUser(ctx, domain.User{
		ID:          "guest-migration-user",
		GoogleSub:   "guest-migration-google-sub",
		Email:       "guest@example.com",
		DisplayName: "Guest Migration User",
	})
	if userError != nil {
		t.Fatalf("create test user: %v", userError)
	}

	itemRepository := sqliterepository.NewItemRepository(gormDB)
	plannedPurchaseRepository := sqliterepository.NewPlannedPurchaseRepository(gormDB)
	settingsRepository := sqliterepository.NewSettingsRepository(gormDB)
	guestMigrationRepository := sqliterepository.NewGuestMigrationRepository(gormDB)

	itemService := service.NewItemService(
		itemRepository,
		sqliterepository.NewCategoryRepository(gormDB),
		sqliterepository.NewBrandRepository(gormDB),
	)
	plannedPurchaseService := service.NewPlannedPurchaseService(plannedPurchaseRepository)
	guestMigrationService := service.NewGuestMigrationService(guestMigrationRepository)

	itemHandler := handler.NewItemHandler(itemService)
	plannedPurchaseHandler := handler.NewPlannedPurchaseHandler(plannedPurchaseService)
	guestMigrationHandler := handler.NewGuestMigrationHandler(guestMigrationService)
	settingsHandler := handler.NewSettingsHandler(service.NewSettingsService(settingsRepository))
	healthHandler := handler.NewHealthHandler()

	router := appHttp.SetupRouter(appHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            itemHandler,
		SettingsHandler:        settingsHandler,
		HealthHandler:          healthHandler,
		PlannedPurchaseHandler: plannedPurchaseHandler,
		GuestMigrationHandler:  guestMigrationHandler,
		UserIdentityMiddleware: middleware.StaticUserIdentity(user.ID),
	})

	payload := []byte(`{
		"migrationId":"guest-local-dataset-1",
		"userId":"attacker-controlled",
		"items":[{
			"name":"Guest camera",
			"price":1200,
			"purchaseDate":"2026-09-20",
			"status":"active",
			"category":"Electronics"
		}],
		"plannedPurchases":[{
			"name":"Guest lens",
			"targetPrice":500,
			"currencyCode":"USD"
		}]
	}`)

	postMigration := func() *httptest.ResponseRecorder {
		request := httptest.NewRequest(http.MethodPost, "/api/guest-migrations", bytes.NewReader(payload))
		request.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, request)
		return recorder
	}

	firstResponse := postMigration()
	if firstResponse.Code != http.StatusOK {
		t.Fatalf("expected first migration to succeed, got %d: %s", firstResponse.Code, firstResponse.Body.String())
	}
	firstData := parseResponseBody(t, firstResponse).Data.(map[string]any)
	if firstData["alreadyImported"] != false ||
		firstData["importedItems"] != float64(1) ||
		firstData["importedPlannedPurchases"] != float64(1) {
		t.Fatalf("unexpected first migration result: %v", firstData)
	}

	secondResponse := postMigration()
	if secondResponse.Code != http.StatusOK {
		t.Fatalf("expected migration retry to succeed, got %d: %s", secondResponse.Code, secondResponse.Body.String())
	}
	secondData := parseResponseBody(t, secondResponse).Data.(map[string]any)
	if secondData["alreadyImported"] != true {
		t.Fatalf("expected retry to be idempotent, got %v", secondData)
	}

	itemsRequest := httptest.NewRequest(http.MethodGet, "/api/items", nil)
	itemsRecorder := httptest.NewRecorder()
	router.ServeHTTP(itemsRecorder, itemsRequest)
	itemsData := parseResponseBody(t, itemsRecorder).Data.([]any)
	if len(itemsData) != 1 {
		t.Fatalf("expected exactly one migrated item, got %d", len(itemsData))
	}

	plannedRequest := httptest.NewRequest(http.MethodGet, "/api/planned-purchases", nil)
	plannedRecorder := httptest.NewRecorder()
	router.ServeHTTP(plannedRecorder, plannedRequest)
	plannedData := parseResponseBody(t, plannedRecorder).Data.([]any)
	if len(plannedData) != 1 {
		t.Fatalf("expected exactly one migrated planned purchase, got %d", len(plannedData))
	}

	unauthenticatedRouter := appHttp.SetupRouter(appHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            itemHandler,
		SettingsHandler:        settingsHandler,
		HealthHandler:          healthHandler,
		PlannedPurchaseHandler: plannedPurchaseHandler,
		GuestMigrationHandler:  guestMigrationHandler,
	})
	unauthenticatedRequest := httptest.NewRequest(
		http.MethodPost,
		"/api/guest-migrations",
		bytes.NewReader(payload),
	)
	unauthenticatedRequest.Header.Set("Content-Type", "application/json")
	unauthenticatedRecorder := httptest.NewRecorder()
	unauthenticatedRouter.ServeHTTP(unauthenticatedRecorder, unauthenticatedRequest)
	if unauthenticatedRecorder.Code != http.StatusUnauthorized {
		t.Fatalf(
			"expected unauthenticated migration to be rejected, got %d: %s",
			unauthenticatedRecorder.Code,
			unauthenticatedRecorder.Body.String(),
		)
	}
}

func TestGuestMigrationValidationFailureDoesNotPersistPartialData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx := context.Background()
	databaseConnection, databaseError := sqliterepository.Open(
		ctx,
		filepath.Join(t.TempDir(), "guest-migration-validation.db"),
	)
	if databaseError != nil {
		t.Fatalf("open guest migration validation database: %v", databaseError)
	}
	t.Cleanup(func() { _ = databaseConnection.Close() })

	gormDB, gormError := sqliterepository.NewGORM(databaseConnection)
	if gormError != nil {
		t.Fatalf("initialize GORM: %v", gormError)
	}

	userRepository := sqliterepository.NewUserRepository(gormDB)
	user, userError := userRepository.FindOrCreateGoogleUser(ctx, domain.User{
		ID:          "guest-validation-user",
		GoogleSub:   "guest-validation-google-sub",
		Email:       "validation@example.com",
		DisplayName: "Validation User",
	})
	if userError != nil {
		t.Fatalf("create test user: %v", userError)
	}

	itemRepository := sqliterepository.NewItemRepository(gormDB)
	plannedPurchaseRepository := sqliterepository.NewPlannedPurchaseRepository(gormDB)
	settingsRepository := sqliterepository.NewSettingsRepository(gormDB)
	guestMigrationRepository := sqliterepository.NewGuestMigrationRepository(gormDB)

	router := appHttp.SetupRouter(appHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            handler.NewItemHandler(service.NewItemService(itemRepository)),
		SettingsHandler:        handler.NewSettingsHandler(service.NewSettingsService(settingsRepository)),
		HealthHandler:          handler.NewHealthHandler(),
		PlannedPurchaseHandler: handler.NewPlannedPurchaseHandler(service.NewPlannedPurchaseService(plannedPurchaseRepository)),
		GuestMigrationHandler:  handler.NewGuestMigrationHandler(service.NewGuestMigrationService(guestMigrationRepository)),
		UserIdentityMiddleware: middleware.StaticUserIdentity(user.ID),
	})

	invalidPayload := map[string]any{
		"migrationId": "invalid-dataset",
		"items": []map[string]any{
			{
				"name":         "Valid first item",
				"price":        100,
				"purchaseDate": "2026-09-20",
				"status":       "active",
			},
			{
				"name":         "",
				"price":        200,
				"purchaseDate": "2026-09-20",
				"status":       "active",
			},
		},
		"plannedPurchases": []any{},
	}
	requestBody, _ := json.Marshal(invalidPayload)
	request := httptest.NewRequest(http.MethodPost, "/api/guest-migrations", bytes.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid migration to return 400, got %d: %s", recorder.Code, recorder.Body.String())
	}

	itemsRequest := httptest.NewRequest(http.MethodGet, "/api/items", nil)
	itemsRecorder := httptest.NewRecorder()
	router.ServeHTTP(itemsRecorder, itemsRequest)
	itemsData := parseResponseBody(t, itemsRecorder).Data.([]any)
	if len(itemsData) != 0 {
		t.Fatalf("expected validation failure to persist zero items, got %d", len(itemsData))
	}
}
