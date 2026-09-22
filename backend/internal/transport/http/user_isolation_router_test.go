package http_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
	transportHttp "cost-per-day/backend/internal/transport/http"
	"cost-per-day/backend/internal/transport/http/handler"
	"cost-per-day/backend/internal/transport/http/middleware"
)

const testUserHeader = "X-Test-User-ID"

func setupUserIsolationRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)

	itemRepository := memory.NewMemoryItemRepository()
	settingsRepository := memory.NewMemorySettingsRepository()

	testIdentityMiddleware := func(ginContext *gin.Context) {
		if userID := ginContext.GetHeader(testUserHeader); userID != "" {
			middleware.SetAuthenticatedUserID(ginContext, userID)
		}
		ginContext.Next()
	}

	return transportHttp.SetupRouter(transportHttp.RouterConfig{
		AllowedOrigins:         "*",
		ItemHandler:            handler.NewItemHandler(service.NewItemService(itemRepository)),
		SettingsHandler:        handler.NewSettingsHandler(service.NewSettingsService(settingsRepository)),
		HealthHandler:          handler.NewHealthHandler(),
		UserIdentityMiddleware: testIdentityMiddleware,
	})
}

func performUserRequest(router *gin.Engine, method string, path string, userID string, body string) *httptest.ResponseRecorder {
	var request *http.Request
	if body == "" {
		request = httptest.NewRequest(method, path, nil)
	} else {
		request = httptest.NewRequest(method, path, bytes.NewBufferString(body))
		request.Header.Set("Content-Type", "application/json")
	}
	if userID != "" {
		request.Header.Set(testUserHeader, userID)
	}

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	return recorder
}

func TestAPIUserIsolationWithInjectedIdentity(t *testing.T) {
	router := setupUserIsolationRouter()
	const userA = "user-a"
	const userB = "user-b"

	createA := performUserRequest(
		router,
		http.MethodPost,
		"/api/items",
		userA,
		`{"name":"User A Laptop","price":1200,"purchaseDate":"2026-09-01T12:00:00Z"}`,
	)
	if createA.Code != http.StatusCreated {
		t.Fatalf("create user A item: status %d body %s", createA.Code, createA.Body.String())
	}
	itemA := parseResponseBody(t, createA).Data.(map[string]any)
	itemAID := itemA["id"].(string)

	createB := performUserRequest(
		router,
		http.MethodPost,
		"/api/items",
		userB,
		`{"name":"User B Phone","price":600,"purchaseDate":"2026-09-02T12:00:00Z"}`,
	)
	if createB.Code != http.StatusCreated {
		t.Fatalf("create user B item: status %d body %s", createB.Code, createB.Body.String())
	}

	listA := performUserRequest(router, http.MethodGet, "/api/items", userA, "")
	if listA.Code != http.StatusOK {
		t.Fatalf("list user A items: status %d body %s", listA.Code, listA.Body.String())
	}
	itemsA := parseResponseBody(t, listA).Data.([]any)
	if len(itemsA) != 1 || itemsA[0].(map[string]any)["name"] != "User A Laptop" {
		t.Fatalf("user A list leaked or lost data: %v", itemsA)
	}

	listB := performUserRequest(router, http.MethodGet, "/api/items", userB, "")
	if listB.Code != http.StatusOK {
		t.Fatalf("list user B items: status %d body %s", listB.Code, listB.Body.String())
	}
	itemsB := parseResponseBody(t, listB).Data.([]any)
	if len(itemsB) != 1 || itemsB[0].(map[string]any)["name"] != "User B Phone" {
		t.Fatalf("user B list leaked or lost data: %v", itemsB)
	}

	crossUserGet := performUserRequest(router, http.MethodGet, "/api/items/"+itemAID, userB, "")
	if crossUserGet.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user detail to be indistinguishable from missing item, got %d body %s", crossUserGet.Code, crossUserGet.Body.String())
	}
	if parseResponseBody(t, crossUserGet).Meta.Message != "item not found" {
		t.Fatalf("cross-user detail leaked a distinct error: %s", crossUserGet.Body.String())
	}

	crossUserUpdate := performUserRequest(
		router,
		http.MethodPut,
		"/api/items/"+itemAID,
		userB,
		`{"name":"Tampered","price":1200,"purchaseDate":"2026-09-01T12:00:00Z","status":"active"}`,
	)
	if crossUserUpdate.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user update 404, got %d body %s", crossUserUpdate.Code, crossUserUpdate.Body.String())
	}

	crossUserDelete := performUserRequest(router, http.MethodDelete, "/api/items/"+itemAID, userB, "")
	if crossUserDelete.Code != http.StatusNotFound {
		t.Fatalf("expected cross-user delete 404, got %d body %s", crossUserDelete.Code, crossUserDelete.Body.String())
	}

	ownerGet := performUserRequest(router, http.MethodGet, "/api/items/"+itemAID, userA, "")
	if ownerGet.Code != http.StatusOK {
		t.Fatalf("user A should still own item after cross-user attempts: status %d body %s", ownerGet.Code, ownerGet.Body.String())
	}
	if parseResponseBody(t, ownerGet).Data.(map[string]any)["name"] != "User A Laptop" {
		t.Fatalf("user A item was modified across boundary: %s", ownerGet.Body.String())
	}

	updateASetting := performUserRequest(
		router,
		http.MethodPut,
		"/api/settings/language",
		userA,
		`{"value":"id"}`,
	)
	if updateASetting.Code != http.StatusOK {
		t.Fatalf("update user A settings: status %d body %s", updateASetting.Code, updateASetting.Body.String())
	}

	settingsB := performUserRequest(router, http.MethodGet, "/api/settings", userB, "")
	if settingsB.Code != http.StatusOK {
		t.Fatalf("read user B settings: status %d body %s", settingsB.Code, settingsB.Body.String())
	}
	userBSettings := parseResponseBody(t, settingsB).Data.(map[string]any)
	if userBSettings["language"] != "en" {
		t.Fatalf("user B settings were overwritten by user A: %v", userBSettings)
	}

	replaceB := performUserRequest(
		router,
		http.MethodPut,
		"/api/items/replace",
		userB,
		`[{"name":"User B Replacement","price":300,"purchaseDate":"2026-09-03T12:00:00Z"}]`,
	)
	if replaceB.Code != http.StatusOK {
		t.Fatalf("replace user B items: status %d body %s", replaceB.Code, replaceB.Body.String())
	}
	ownerGetAfterReplace := performUserRequest(router, http.MethodGet, "/api/items/"+itemAID, userA, "")
	if ownerGetAfterReplace.Code != http.StatusOK {
		t.Fatalf("user B replacement affected user A item: status %d body %s", ownerGetAfterReplace.Code, ownerGetAfterReplace.Body.String())
	}

	missingIdentity := performUserRequest(router, http.MethodGet, "/api/items", "", "")
	if missingIdentity.Code != http.StatusUnauthorized {
		t.Fatalf("expected missing authenticated identity to return 401, got %d body %s", missingIdentity.Code, missingIdentity.Body.String())
	}
}
