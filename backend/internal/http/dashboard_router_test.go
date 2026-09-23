package http_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
	appHttp "cost-per-day/backend/internal/http"
	"cost-per-day/backend/internal/http/handler"
	"cost-per-day/backend/internal/http/middleware"
)

type dashboardTestRouterEnvironment struct {
	routerEngine         *gin.Engine
	itemRepository       repository.ItemRepository
	settingsRepository   repository.SettingsRepository
	equivalentRepository repository.ValueEquivalentRepository
}

func setupDashboardTestRouter(userID string) dashboardTestRouterEnvironment {
	gin.SetMode(gin.TestMode)

	itemRepository := memory.NewMemoryItemRepository()
	settingsRepository := memory.NewMemorySettingsRepository()
	equivalentRepository := memory.NewMemoryValueEquivalentRepository()

	itemService := service.NewItemService(itemRepository)
	settingsService := service.NewSettingsService(settingsRepository)
	equivalentService := service.NewValueEquivalentService(equivalentRepository)
	dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)

	itemHandler := handler.NewItemHandler(itemService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	healthHandler := handler.NewHealthHandler()
	equivalentHandler := handler.NewValueEquivalentHandler(equivalentService)
	dashboardHandler := handler.NewDashboardHandler(dashboardService)

	var identityMiddleware gin.HandlerFunc
	if userID != "" {
		identityMiddleware = middleware.StaticUserIdentity(userID)
	}

	routerEngine := appHttp.SetupRouter(appHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            itemHandler,
		SettingsHandler:        settingsHandler,
		HealthHandler:          healthHandler,
		ValueEquivalentHandler: equivalentHandler,
		DashboardHandler:       dashboardHandler,
		UserIdentityMiddleware: identityMiddleware,
	})

	return dashboardTestRouterEnvironment{
		routerEngine:         routerEngine,
		itemRepository:       itemRepository,
		settingsRepository:   settingsRepository,
		equivalentRepository: equivalentRepository,
	}
}

func TestDashboardEndpoints(t *testing.T) {
	testContext := context.Background()

	t.Run("rejects unauthenticated request with 401", func(subTest *testing.T) {
		environment := setupDashboardTestRouter("")

		request, _ := http.NewRequest(http.MethodGet, "/api/dashboard", nil)
		recorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusUnauthorized {
			subTest.Fatalf("expected 401 Unauthorized, got: %d", recorder.Code)
		}
	})

	t.Run("returns empty insights and 0 total cost when authenticated user has no items", func(subTest *testing.T) {
		environment := setupDashboardTestRouter("user-alpha")

		request, _ := http.NewRequest(http.MethodGet, "/api/dashboard", nil)
		recorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			subTest.Fatalf("expected 200 OK, got: %d", recorder.Code)
		}

		var responsePayload struct {
			Data domain.DashboardData `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &responsePayload); err != nil {
			subTest.Fatalf("failed to decode response JSON: %v", err)
		}

		if responsePayload.Data.TotalDailyCost != 0 {
			subTest.Errorf("expected 0 totalDailyCost, got: %f", responsePayload.Data.TotalDailyCost)
		}
		if len(responsePayload.Data.Insights) != 0 {
			subTest.Errorf("expected 0 insights, got: %d", len(responsePayload.Data.Insights))
		}
	})

	t.Run("returns ranked insights and aggregated cost for authenticated user", func(subTest *testing.T) {
		environment := setupDashboardTestRouter("user-alpha")

		// Create items for user-alpha
		_, _ = environment.itemRepository.Create(testContext, "user-alpha", domain.Item{
			Name:         "Coffee Maker",
			Price:        150.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -30).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})
		_, _ = environment.itemRepository.Create(testContext, "user-alpha", domain.Item{
			Name:         "Ergonomic Chair",
			Price:        350.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -100).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		request, _ := http.NewRequest(http.MethodGet, "/api/dashboard", nil)
		recorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			subTest.Fatalf("expected 200 OK, got: %d", recorder.Code)
		}

		var responsePayload struct {
			Data domain.DashboardData `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &responsePayload); err != nil {
			subTest.Fatalf("failed to decode response JSON: %v", err)
		}

		if responsePayload.Data.TotalDailyCost <= 0 {
			subTest.Errorf("expected positive total daily cost, got: %f", responsePayload.Data.TotalDailyCost)
		}
		if len(responsePayload.Data.Insights) == 0 {
			subTest.Fatalf("expected insights to be generated")
		}

		for _, insight := range responsePayload.Data.Insights {
			if insight.Kind == "" || insight.Eyebrow == "" || insight.Primary == "" {
				subTest.Errorf("insight contains empty required presentation field: %+v", insight)
			}
		}
	})

	t.Run("enforces user isolation between accounts", func(subTest *testing.T) {
		environment := setupDashboardTestRouter("user-alpha")

		// Populate items only for user-beta
		_, _ = environment.itemRepository.Create(testContext, "user-beta", domain.Item{
			Name:         "Secret Drone",
			Price:        999.0,
			PurchaseDate: time.Now().UTC().AddDate(0, 0, -10).Format(time.RFC3339),
			Status:       domain.ItemStatusActive,
		})

		request, _ := http.NewRequest(http.MethodGet, "/api/dashboard", nil)
		recorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			subTest.Fatalf("expected 200 OK, got: %d", recorder.Code)
		}

		var responsePayload struct {
			Data domain.DashboardData `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &responsePayload); err != nil {
			subTest.Fatalf("failed to decode response JSON: %v", err)
		}

		if responsePayload.Data.TotalDailyCost != 0 || len(responsePayload.Data.Insights) != 0 {
			subTest.Errorf("user-alpha should not see user-beta's items or insights")
		}
	})
}
