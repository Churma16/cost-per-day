package http_test

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
	"cost-per-day/backend/internal/service"
	transportHttp "cost-per-day/backend/internal/transport/http"
	"cost-per-day/backend/internal/transport/http/handler"
	"cost-per-day/backend/internal/transport/http/middleware"
)

type routerGoogleProvider struct {
	nonce string
}

func (provider *routerGoogleProvider) AuthorizationURL(state string, nonce string) string {
	provider.nonce = nonce
	query := url.Values{}
	query.Set("state", state)
	query.Set("nonce", nonce)
	return "https://accounts.example/authorize?" + query.Encode()
}

func (provider *routerGoogleProvider) ExchangeAndVerify(
	_ context.Context,
	code string,
	expectedNonce string,
) (service.GoogleIdentity, error) {
	if code != "valid-code" {
		return service.GoogleIdentity{}, fmt.Errorf("invalid test code")
	}
	if expectedNonce == "" || expectedNonce != provider.nonce {
		return service.GoogleIdentity{}, fmt.Errorf("invalid test nonce")
	}
	return service.GoogleIdentity{
		Subject:     "google-subject-http-test",
		Email:       "user@example.com",
		DisplayName: "HTTP Test User",
		AvatarURL:   "https://example.com/avatar.png",
	}, nil
}

func setupAuthenticatedTestRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	databaseConnection, databaseError := sqliterepository.Open(
		context.Background(),
		filepath.Join(t.TempDir(), "auth-router.db"),
	)
	if databaseError != nil {
		t.Fatalf("open auth router database: %v", databaseError)
	}
	t.Cleanup(func() { _ = databaseConnection.Close() })

	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	settingsRepository := sqliterepository.NewSettingsRepository(databaseConnection)
	userRepository := sqliterepository.NewUserRepository(databaseConnection)
	sessionRepository := sqliterepository.NewSessionRepository(databaseConnection)

	authService := service.NewAuthService(
		userRepository,
		sessionRepository,
		&routerGoogleProvider{},
		"",
	)
	authHandler, authHandlerError := handler.NewAuthHandler(handler.AuthHandlerConfig{
		AuthService:   authService,
		SessionSecret: "test-session-secret-that-is-long-enough-for-hmac",
		AppBaseURL:    "http://app.test",
		SecureCookies: false,
	})
	if authHandlerError != nil {
		t.Fatalf("create auth handler: %v", authHandlerError)
	}

	return transportHttp.SetupRouter(transportHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            handler.NewItemHandler(service.NewItemService(itemRepository)),
		SettingsHandler:        handler.NewSettingsHandler(service.NewSettingsService(settingsRepository)),
		HealthHandler:          handler.NewHealthHandler(),
		AuthHandler:            authHandler,
		UserIdentityMiddleware: middleware.SessionIdentity(authService, middleware.DefaultSessionCookieName),
	})
}

func TestGoogleLoginSessionProtectedAPIAndLogoutFlow(t *testing.T) {
	router := setupAuthenticatedTestRouter(t)

	unauthenticated := httptest.NewRecorder()
	router.ServeHTTP(unauthenticated, httptest.NewRequest(http.MethodGet, "/api/items", nil))
	if unauthenticated.Code != http.StatusUnauthorized {
		t.Fatalf("expected protected route to reject unauthenticated request, got %d body %s", unauthenticated.Code, unauthenticated.Body.String())
	}
	if parseResponseBody(t, unauthenticated).Meta.Code != http.StatusUnauthorized {
		t.Fatalf("expected canonical 401 response, got %s", unauthenticated.Body.String())
	}

	login := httptest.NewRecorder()
	router.ServeHTTP(login, httptest.NewRequest(http.MethodGet, "/auth/google/login", nil))
	if login.Code != http.StatusFound {
		t.Fatalf("expected Google login redirect, got %d body %s", login.Code, login.Body.String())
	}

	authorizationURL, authorizationURLError := url.Parse(login.Header().Get("Location"))
	if authorizationURLError != nil {
		t.Fatalf("parse authorization redirect: %v", authorizationURLError)
	}
	state := authorizationURL.Query().Get("state")
	if state == "" || authorizationURL.Query().Get("nonce") == "" {
		t.Fatalf("authorization redirect must contain state and nonce: %s", authorizationURL.String())
	}

	var oidcStateCookie *http.Cookie
	for _, cookie := range login.Result().Cookies() {
		if cookie.Name == "cost_per_day_oidc_state" {
			oidcStateCookie = cookie
			break
		}
	}
	if oidcStateCookie == nil || !oidcStateCookie.HttpOnly || oidcStateCookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("expected protected OIDC state cookie, got %+v", oidcStateCookie)
	}

	callbackRequest := httptest.NewRequest(
		http.MethodGet,
		"/auth/google/callback?code=valid-code&state="+url.QueryEscape(state),
		nil,
	)
	callbackRequest.AddCookie(oidcStateCookie)
	callback := httptest.NewRecorder()
	router.ServeHTTP(callback, callbackRequest)
	if callback.Code != http.StatusFound || callback.Header().Get("Location") != "http://app.test" {
		t.Fatalf("expected successful callback redirect, got %d location %q body %s", callback.Code, callback.Header().Get("Location"), callback.Body.String())
	}

	var sessionCookie *http.Cookie
	for _, cookie := range callback.Result().Cookies() {
		if cookie.Name == middleware.DefaultSessionCookieName {
			sessionCookie = cookie
			break
		}
	}
	if sessionCookie == nil {
		t.Fatal("expected application session cookie after login")
	}
	if !sessionCookie.HttpOnly || sessionCookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("expected HttpOnly SameSite session cookie, got %+v", sessionCookie)
	}

	meRequest := httptest.NewRequest(http.MethodGet, "/api/me", nil)
	meRequest.AddCookie(sessionCookie)
	me := httptest.NewRecorder()
	router.ServeHTTP(me, meRequest)
	if me.Code != http.StatusOK {
		t.Fatalf("expected authenticated /api/me, got %d body %s", me.Code, me.Body.String())
	}
	meData := parseResponseBody(t, me).Data.(map[string]any)
	if meData["email"] != "user@example.com" || meData["displayName"] != "HTTP Test User" {
		t.Fatalf("unexpected current-user profile: %v", meData)
	}
	if _, providerSubjectLeaked := meData["googleSub"]; providerSubjectLeaked {
		t.Fatalf("provider subject must not be exposed by /api/me: %v", meData)
	}

	createRequest := httptest.NewRequest(
		http.MethodPost,
		"/api/items",
		bytes.NewBufferString(`{"name":"Authenticated item","price":250,"purchaseDate":"2026-09-20T00:00:00Z"}`),
	)
	createRequest.Header.Set("Content-Type", "application/json")
	createRequest.AddCookie(sessionCookie)
	createResponse := httptest.NewRecorder()
	router.ServeHTTP(createResponse, createRequest)
	if createResponse.Code != http.StatusCreated {
		t.Fatalf("expected authenticated item creation, got %d body %s", createResponse.Code, createResponse.Body.String())
	}

	logoutRequest := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	logoutRequest.AddCookie(sessionCookie)
	logout := httptest.NewRecorder()
	router.ServeHTTP(logout, logoutRequest)
	if logout.Code != http.StatusOK {
		t.Fatalf("expected logout success, got %d body %s", logout.Code, logout.Body.String())
	}

	oldSessionRequest := httptest.NewRequest(http.MethodGet, "/api/me", nil)
	oldSessionRequest.AddCookie(sessionCookie)
	oldSession := httptest.NewRecorder()
	router.ServeHTTP(oldSession, oldSessionRequest)
	if oldSession.Code != http.StatusUnauthorized {
		t.Fatalf("expected logged-out session to be rejected, got %d body %s", oldSession.Code, oldSession.Body.String())
	}
}


func TestConfiguredGoogleOwnerCanAdoptLegacyV3DataAfterUpgrade(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx := context.Background()
	databasePath := filepath.Join(t.TempDir(), "legacy-v3-auth.db")

	legacyDatabase, openError := sql.Open("sqlite", databasePath)
	if openError != nil {
		t.Fatalf("open legacy v3 database: %v", openError)
	}
	legacySchema := `
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		INSERT INTO users (id, created_at, updated_at)
		VALUES ('legacy', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');

		CREATE TABLE items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT NOT NULL,
			name TEXT NOT NULL,
			price_micros INTEGER NOT NULL,
			purchase_date TEXT NOT NULL,
			status TEXT NOT NULL,
			ended_at TEXT,
			sale_price_micros INTEGER,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		INSERT INTO items (
			id, user_id, name, price_micros, purchase_date, status,
			ended_at, sale_price_micros, created_at, updated_at
		)
		VALUES (
			7, 'legacy', 'Pre-auth laptop', 1200000000, '2026-09-01T00:00:00Z',
			'active', NULL, NULL, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'
		);

		CREATE TABLE settings (
			user_id TEXT NOT NULL,
			key TEXT NOT NULL,
			value TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			PRIMARY KEY (user_id, key)
		);
		INSERT INTO settings (user_id, key, value, updated_at)
		VALUES ('legacy', 'language', 'id', '2026-09-01T00:00:00Z');

		PRAGMA user_version = 3;
	`
	if _, schemaError := legacyDatabase.ExecContext(ctx, legacySchema); schemaError != nil {
		_ = legacyDatabase.Close()
		t.Fatalf("seed legacy v3 schema: %v", schemaError)
	}
	if closeError := legacyDatabase.Close(); closeError != nil {
		t.Fatalf("close legacy v3 database: %v", closeError)
	}

	databaseConnection, migrationError := sqliterepository.Open(ctx, databasePath)
	if migrationError != nil {
		t.Fatalf("upgrade legacy v3 database: %v", migrationError)
	}
	defer databaseConnection.Close()

	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	settingsRepository := sqliterepository.NewSettingsRepository(databaseConnection)
	userRepository := sqliterepository.NewUserRepository(databaseConnection)
	sessionRepository := sqliterepository.NewSessionRepository(databaseConnection)
	provider := &routerGoogleProvider{}
	authService := service.NewAuthService(
		userRepository,
		sessionRepository,
		provider,
		"google-subject-http-test",
	)
	authHandler, authHandlerError := handler.NewAuthHandler(handler.AuthHandlerConfig{
		AuthService:   authService,
		SessionSecret: "test-session-secret-that-is-long-enough-for-hmac",
		AppBaseURL:    "http://app.test",
		SecureCookies: false,
	})
	if authHandlerError != nil {
		t.Fatalf("create auth handler: %v", authHandlerError)
	}
	router := transportHttp.SetupRouter(transportHttp.RouterConfig{
		AllowedOrigins:         "http://app.test",
		ItemHandler:            handler.NewItemHandler(service.NewItemService(itemRepository)),
		SettingsHandler:        handler.NewSettingsHandler(service.NewSettingsService(settingsRepository)),
		HealthHandler:          handler.NewHealthHandler(),
		AuthHandler:            authHandler,
		UserIdentityMiddleware: middleware.SessionIdentity(authService, middleware.DefaultSessionCookieName),
	})

	sessionCookie := completeGoogleBrowserLogin(t, router)

	meRequest := httptest.NewRequest(http.MethodGet, "/api/me", nil)
	meRequest.AddCookie(sessionCookie)
	meResponse := httptest.NewRecorder()
	router.ServeHTTP(meResponse, meRequest)
	if meResponse.Code != http.StatusOK {
		t.Fatalf("expected authenticated /api/me, got %d body %s", meResponse.Code, meResponse.Body.String())
	}
	if meData := parseResponseBody(t, meResponse).Data.(map[string]any); meData["id"] != "legacy" {
		t.Fatalf("expected configured Google owner to bind legacy local user, got %v", meData)
	}

	itemsRequest := httptest.NewRequest(http.MethodGet, "/api/items", nil)
	itemsRequest.AddCookie(sessionCookie)
	itemsResponse := httptest.NewRecorder()
	router.ServeHTTP(itemsResponse, itemsRequest)
	if itemsResponse.Code != http.StatusOK || !strings.Contains(itemsResponse.Body.String(), "Pre-auth laptop") {
		t.Fatalf("expected pre-auth legacy item after login, got %d body %s", itemsResponse.Code, itemsResponse.Body.String())
	}

	settingsRequest := httptest.NewRequest(http.MethodGet, "/api/settings", nil)
	settingsRequest.AddCookie(sessionCookie)
	settingsResponse := httptest.NewRecorder()
	router.ServeHTTP(settingsResponse, settingsRequest)
	if settingsResponse.Code != http.StatusOK || !strings.Contains(settingsResponse.Body.String(), "\"language\":\"id\"") {
		t.Fatalf("expected pre-auth legacy settings after login, got %d body %s", settingsResponse.Code, settingsResponse.Body.String())
	}
}

func completeGoogleBrowserLogin(t *testing.T, router *gin.Engine) *http.Cookie {
	t.Helper()

	login := httptest.NewRecorder()
	router.ServeHTTP(login, httptest.NewRequest(http.MethodGet, "/auth/google/login", nil))
	if login.Code != http.StatusFound {
		t.Fatalf("expected login redirect, got %d body %s", login.Code, login.Body.String())
	}

	authorizationURL, parseError := url.Parse(login.Header().Get("Location"))
	if parseError != nil {
		t.Fatalf("parse login redirect: %v", parseError)
	}
	state := authorizationURL.Query().Get("state")
	var stateCookie *http.Cookie
	for _, cookie := range login.Result().Cookies() {
		if cookie.Name == "cost_per_day_oidc_state" {
			stateCookie = cookie
			break
		}
	}
	if state == "" || stateCookie == nil {
		t.Fatal("expected state query and OIDC state cookie")
	}

	callbackRequest := httptest.NewRequest(
		http.MethodGet,
		"/auth/google/callback?code=valid-code&state="+url.QueryEscape(state),
		nil,
	)
	callbackRequest.AddCookie(stateCookie)
	callback := httptest.NewRecorder()
	router.ServeHTTP(callback, callbackRequest)
	if callback.Code != http.StatusFound {
		t.Fatalf("expected callback redirect, got %d body %s", callback.Code, callback.Body.String())
	}
	for _, cookie := range callback.Result().Cookies() {
		if cookie.Name == middleware.DefaultSessionCookieName {
			return cookie
		}
	}
	t.Fatal("expected application session cookie")
	return nil
}
