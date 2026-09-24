package http_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	appHttp "cost-per-day/backend/internal/http"
	"cost-per-day/backend/internal/http/handler"
	"cost-per-day/backend/internal/http/middleware"
	"cost-per-day/backend/internal/repository"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

type durabilityTestRouterEnvironment struct {
	routerEngine       *gin.Engine
	itemRepository     repository.ItemRepository
	categoryRepository repository.CategoryRepository
	brandRepository    repository.BrandRepository
}

func setupDurabilityTestRouter(userID string) durabilityTestRouterEnvironment {
	gin.SetMode(gin.TestMode)

	itemRepository := memory.NewMemoryItemRepository()
	settingsRepository := memory.NewMemorySettingsRepository()
	equivalentRepository := memory.NewMemoryValueEquivalentRepository()
	categoryRepository := memory.NewMemoryCategoryRepository()
	brandRepository := memory.NewMemoryBrandRepository()

	itemService := service.NewItemService(itemRepository, categoryRepository, brandRepository)
	settingsService := service.NewSettingsService(settingsRepository)
	equivalentService := service.NewValueEquivalentService(equivalentRepository)
	dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)
	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	itemHandler := handler.NewItemHandler(itemService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	healthHandler := handler.NewHealthHandler()
	equivalentHandler := handler.NewValueEquivalentHandler(equivalentService)
	dashboardHandler := handler.NewDashboardHandler(dashboardService)
	durabilityHandler := handler.NewDurabilityHandler(durabilityService)

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
		DurabilityHandler:      durabilityHandler,
		UserIdentityMiddleware: identityMiddleware,
	})

	return durabilityTestRouterEnvironment{
		routerEngine:       routerEngine,
		itemRepository:     itemRepository,
		categoryRepository: categoryRepository,
		brandRepository:    brandRepository,
	}
}

func TestDurabilityEndpoints(t *testing.T) {
	testContext := context.Background()
	authenticatedUserID := "user-durability-test-123"

	t.Run("rejects unauthenticated request to /api/insights/durability with 401", func(subTest *testing.T) {
		environment := setupDurabilityTestRouter("")

		request, _ := http.NewRequest(http.MethodGet, "/api/insights/durability", nil)
		recorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusUnauthorized {
			subTest.Fatalf("expected status 401, got %d", recorder.Code)
		}
	})

	t.Run("rejects unauthenticated request to /api/categories with 401", func(subTest *testing.T) {
		environment := setupDurabilityTestRouter("")

		request, _ := http.NewRequest(http.MethodGet, "/api/categories", nil)
		recorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusUnauthorized {
			subTest.Fatalf("expected status 401, got %d", recorder.Code)
		}
	})

	t.Run("rejects unauthenticated request to /api/brands with 401", func(subTest *testing.T) {
		environment := setupDurabilityTestRouter("")

		request, _ := http.NewRequest(http.MethodGet, "/api/brands", nil)
		recorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusUnauthorized {
			subTest.Fatalf("expected status 401, got %d", recorder.Code)
		}
	})

	t.Run("returns empty durability analytics when user has no completed items", func(subTest *testing.T) {
		environment := setupDurabilityTestRouter(authenticatedUserID)

		request, _ := http.NewRequest(http.MethodGet, "/api/insights/durability", nil)
		recorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			subTest.Fatalf("expected status 200, got %d", recorder.Code)
		}

		var responsePayload struct {
			Success bool                      `json:"success"`
			Message string                    `json:"message"`
			Data    domain.DurabilityAnalytics `json:"data"`
		}
		if unmarshalError := json.Unmarshal(recorder.Body.Bytes(), &responsePayload); unmarshalError != nil {
			subTest.Fatalf("failed to decode response: %v", unmarshalError)
		}

		if responsePayload.Data.TotalCompletedItems != 0 {
			subTest.Errorf("expected 0 completed items, got %d", responsePayload.Data.TotalCompletedItems)
		}
		if len(responsePayload.Data.Categories) != 0 {
			subTest.Errorf("expected 0 categories, got %d", len(responsePayload.Data.Categories))
		}
	})

	t.Run("returns durability analytics with category and brand groupings and filter support", func(subTest *testing.T) {
		environment := setupDurabilityTestRouter(authenticatedUserID)

		categoryAudio, _ := environment.categoryRepository.FindOrCreate(testContext, authenticatedUserID, "Audio")
		categoryFootwear, _ := environment.categoryRepository.FindOrCreate(testContext, authenticatedUserID, "Footwear")
		brandSony, _ := environment.brandRepository.FindOrCreate(testContext, authenticatedUserID, "Sony")
		brandNike, _ := environment.brandRepository.FindOrCreate(testContext, authenticatedUserID, "Nike")

		endedAt1 := "2024-06-01"
		endedAt2 := "2024-12-01"
		endedAt3 := "2024-08-01"

		categoryAudioName := "Audio"
		categoryFootwearName := "Footwear"
		brandSonyName := "Sony"
		brandNikeName := "Nike"

		// Item 1: Audio / Sony, completed (retired)
		item1 := domain.Item{
			ID:           "item-audio-sony-1",
			UserID:       authenticatedUserID,
			Name:         "Sony XM4",
			Price:        300,
			PurchaseDate: "2023-01-01",
			Status:       domain.ItemStatusRetired,
			EndedAt:      &endedAt1,
			CategoryID:   &categoryAudio.ID,
			Category:     &categoryAudioName,
			BrandID:      &brandSony.ID,
			Brand:        &brandSonyName,
		}
		// Item 2: Audio / Sony, completed (retired) -> 2 items => isPattern = true
		item2 := domain.Item{
			ID:           "item-audio-sony-2",
			UserID:       authenticatedUserID,
			Name:         "Sony LinkBuds",
			Price:        150,
			PurchaseDate: "2024-01-01",
			Status:       domain.ItemStatusRetired,
			EndedAt:      &endedAt2,
			CategoryID:   &categoryAudio.ID,
			Category:     &categoryAudioName,
			BrandID:      &brandSony.ID,
			Brand:        &brandSonyName,
		}
		// Item 3: Footwear / Nike, completed (retired) -> 1 item => isPattern = false
		item3 := domain.Item{
			ID:           "item-footwear-nike-1",
			UserID:       authenticatedUserID,
			Name:         "Nike Pegasus",
			Price:        120,
			PurchaseDate: "2024-01-01",
			Status:       domain.ItemStatusRetired,
			EndedAt:      &endedAt3,
			CategoryID:   &categoryFootwear.ID,
			Category:     &categoryFootwearName,
			BrandID:      &brandNike.ID,
			Brand:        &brandNikeName,
		}
		// Item 4: Active item (should be excluded from durability)
		item4 := domain.Item{
			ID:           "item-active-1",
			UserID:       authenticatedUserID,
			Name:         "Active Item",
			Price:        50,
			PurchaseDate: "2024-01-01",
			Status:       domain.ItemStatusActive,
			CategoryID:   &categoryAudio.ID,
			Category:     &categoryAudioName,
		}

		_, _ = environment.itemRepository.Create(testContext, authenticatedUserID, item1)
		_, _ = environment.itemRepository.Create(testContext, authenticatedUserID, item2)
		_, _ = environment.itemRepository.Create(testContext, authenticatedUserID, item3)
		_, _ = environment.itemRepository.Create(testContext, authenticatedUserID, item4)

		// 1. Fetch full analytics
		request, _ := http.NewRequest(http.MethodGet, "/api/insights/durability", nil)
		recorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			subTest.Fatalf("expected status 200, got %d", recorder.Code)
		}

		var fullResponse struct {
			Success bool                      `json:"success"`
			Data    domain.DurabilityAnalytics `json:"data"`
		}
		if unmarshalError := json.Unmarshal(recorder.Body.Bytes(), &fullResponse); unmarshalError != nil {
			subTest.Fatalf("failed to decode response: %v", unmarshalError)
		}

		if fullResponse.Data.TotalCompletedItems != 3 {
			subTest.Errorf("expected 3 completed items, got %d", fullResponse.Data.TotalCompletedItems)
		}
		if len(fullResponse.Data.Categories) != 2 {
			subTest.Fatalf("expected 2 categories, got %d", len(fullResponse.Data.Categories))
		}

		// Find Audio category insight
		var audioCategory *domain.CategoryDurabilityInsight
		for _, cat := range fullResponse.Data.Categories {
			if cat.Category == "Audio" {
				catCopy := cat
				audioCategory = &catCopy
				break
			}
		}
		if audioCategory == nil {
			subTest.Fatalf("expected Audio category insight")
		}
		if len(audioCategory.Brands) != 1 {
			subTest.Fatalf("expected 1 brand under Audio, got %d", len(audioCategory.Brands))
		}
		sonyBrand := audioCategory.Brands[0]
		if !sonyBrand.IsPattern {
			subTest.Errorf("expected Sony sampleSize=2 to be flagged as isPattern=true")
		}
		if len(sonyBrand.Items) != 2 {
			subTest.Errorf("expected 2 item evidence items under Sony, got %d", len(sonyBrand.Items))
		}

		// 2. Fetch with category filter
		requestFilter, _ := http.NewRequest(http.MethodGet, "/api/insights/durability?category=Footwear", nil)
		recorderFilter := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(recorderFilter, requestFilter)

		var filteredResponse struct {
			Success bool                      `json:"success"`
			Data    domain.DurabilityAnalytics `json:"data"`
		}
		_ = json.Unmarshal(recorderFilter.Body.Bytes(), &filteredResponse)

		if len(filteredResponse.Data.Categories) != 1 {
			subTest.Fatalf("expected 1 category with Footwear filter, got %d", len(filteredResponse.Data.Categories))
		}
		if filteredResponse.Data.Categories[0].Category != "Footwear" {
			subTest.Errorf("expected category Footwear, got %s", filteredResponse.Data.Categories[0].Category)
		}

		// 3. Test /api/categories endpoint
		catRequest, _ := http.NewRequest(http.MethodGet, "/api/categories", nil)
		catRecorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(catRecorder, catRequest)

		if catRecorder.Code != http.StatusOK {
			subTest.Fatalf("expected status 200 for /api/categories, got %d", catRecorder.Code)
		}
		var categoriesResponse struct {
			Success bool              `json:"success"`
			Data    []domain.Category `json:"data"`
		}
		_ = json.Unmarshal(catRecorder.Body.Bytes(), &categoriesResponse)
		if len(categoriesResponse.Data) != 2 {
			subTest.Errorf("expected 2 categories, got %d", len(categoriesResponse.Data))
		}

		// 4. Test /api/brands endpoint
		brandRequest, _ := http.NewRequest(http.MethodGet, "/api/brands", nil)
		brandRecorder := httptest.NewRecorder()
		environment.routerEngine.ServeHTTP(brandRecorder, brandRequest)

		if brandRecorder.Code != http.StatusOK {
			subTest.Fatalf("expected status 200 for /api/brands, got %d", brandRecorder.Code)
		}
		var brandsResponse struct {
			Success bool           `json:"success"`
			Data    []domain.Brand `json:"data"`
		}
		_ = json.Unmarshal(brandRecorder.Body.Bytes(), &brandsResponse)
		if len(brandsResponse.Data) != 2 {
			subTest.Errorf("expected 2 brands, got %d", len(brandsResponse.Data))
		}
	})
}
