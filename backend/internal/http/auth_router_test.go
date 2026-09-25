package http_test

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"

	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
	"cost-per-day/backend/internal/service"
	appHttp "cost-per-day/backend/internal/http"
	"cost-per-day/backend/internal/http/handler"
	"cost-per-day/backend/internal/http/middleware"
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

	gormDB, gormError := sqliterepository.NewGORM(databaseConnection)
	if gormError != nil {
		t.Fatalf("initialize auth router GORM database: %v", gormError)
	}

	itemRepository := sqliterepository.NewItemRepository(gormDB)
	settingsRepository := sqliterepository.NewSettingsRepository(gormDB)
	userRepository := sqliterepository.NewUserRepository(gormDB)
	sessionRepository := sqliterepository.NewSessionRepository(gormDB)

	authService := service.NewAuthService(
		userRepository,
		sessionRepository,
		&routerGoogleProvider{},
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

	return appHttp.SetupRouter(appHttp.RouterConfig{
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
