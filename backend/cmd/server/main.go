package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/auth/googleoidc"
	"cost-per-day/backend/internal/domain"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
	"cost-per-day/backend/internal/service"
	transportHttp "cost-per-day/backend/internal/transport/http"
	"cost-per-day/backend/internal/transport/http/handler"
	"cost-per-day/backend/internal/transport/http/middleware"
)

func main() {
	serverHost := strings.TrimSpace(os.Getenv("HOST"))
	if serverHost == "" {
		serverHost = "127.0.0.1"
	}

	serverPort := strings.TrimSpace(os.Getenv("PORT"))
	if serverPort == "" {
		serverPort = "8080"
	}

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = gin.ReleaseMode
	}
	gin.SetMode(ginMode)

	databasePath := os.Getenv("DATABASE_PATH")
	if databasePath == "" {
		databasePath = "./data/cost-per-day.db"
	}

	staticDirectory := os.Getenv("STATIC_DIR")

	appBaseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("APP_BASE_URL")), "/")
	if appBaseURL == "" {
		log.Fatal("[error] APP_BASE_URL is required")
	}
	parsedBaseURL, baseURLError := url.Parse(appBaseURL)
	if baseURLError != nil || parsedBaseURL.Host == "" || (parsedBaseURL.Scheme != "http" && parsedBaseURL.Scheme != "https") {
		log.Fatal("[error] APP_BASE_URL must be an absolute http or https URL")
	}

	allowedOrigins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if allowedOrigins == "" {
		allowedOrigins = parsedBaseURL.Scheme + "://" + parsedBaseURL.Host
	}
	for _, configuredOrigin := range strings.Split(allowedOrigins, ",") {
		if strings.TrimSpace(configuredOrigin) == "*" {
			log.Fatal("[error] ALLOWED_ORIGINS cannot contain wildcard origins when cookie authentication is enabled")
		}
	}

	googleClientID := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	googleClientSecret := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET"))
	sessionSecret := strings.TrimSpace(os.Getenv("SESSION_SECRET"))
	legacyOwnerGoogleSub := strings.TrimSpace(os.Getenv("LEGACY_OWNER_GOOGLE_SUB"))
	if googleClientID == "" || googleClientSecret == "" || sessionSecret == "" {
		log.Fatal("[error] GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and SESSION_SECRET are required")
	}

	googleRedirectURI := strings.TrimSpace(os.Getenv("GOOGLE_REDIRECT_URI"))
	if googleRedirectURI == "" {
		googleRedirectURI = appBaseURL + "/auth/google/callback"
	}

	startupContext, cancelStartupContext := context.WithTimeout(context.Background(), 10*time.Second)
	databaseConnection, databaseError := sqliterepository.Open(startupContext, databasePath)
	cancelStartupContext()
	if databaseError != nil {
		log.Fatalf("[error] Failed to initialize SQLite persistence: %v\n", databaseError)
	}
	defer func() {
		if closeError := databaseConnection.Close(); closeError != nil {
			log.Printf("[error] Failed to close SQLite database: %v\n", closeError)
		}
	}()

	// Explicit dependency wiring (composition root).
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	settingsRepository := sqliterepository.NewSettingsRepository(databaseConnection)
	userRepository := sqliterepository.NewUserRepository(databaseConnection)
	sessionRepository := sqliterepository.NewSessionRepository(databaseConnection)
	equivalentRepository := sqliterepository.NewValueEquivalentRepository(databaseConnection)

	itemService := service.NewItemService(itemRepository)
	settingsService := service.NewSettingsService(settingsRepository)
	equivalentService := service.NewValueEquivalentService(equivalentRepository)

	googleProvider, googleProviderError := googleoidc.NewClient(googleoidc.Config{
		ClientID:     googleClientID,
		ClientSecret: googleClientSecret,
		RedirectURI:  googleRedirectURI,
	})
	if googleProviderError != nil {
		log.Fatalf("[error] Failed to initialize Google OIDC client: %v\n", googleProviderError)
	}
	authService := service.NewAuthService(userRepository, sessionRepository, googleProvider, legacyOwnerGoogleSub)
	configurationContext, cancelConfigurationContext := context.WithTimeout(context.Background(), 5*time.Second)
	configurationError := authService.ValidateConfiguration(configurationContext)
	cancelConfigurationContext()
	if configurationError != nil {
		if errors.Is(configurationError, domain.ErrLegacyOwnerBootstrapRequired) {
			log.Fatal("[error] Existing pre-auth data requires LEGACY_OWNER_GOOGLE_SUB before authentication can be enabled")
		}
		log.Fatalf("[error] Failed to validate authentication configuration: %v\n", configurationError)
	}

	itemHandler := handler.NewItemHandler(itemService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	healthHandler := handler.NewHealthHandler()
	authHandler, authHandlerError := handler.NewAuthHandler(handler.AuthHandlerConfig{
		AuthService:   authService,
		SessionSecret: sessionSecret,
		AppBaseURL:    appBaseURL,
		SecureCookies: parsedBaseURL.Scheme == "https",
	})
	if authHandlerError != nil {
		log.Fatalf("[error] Failed to initialize authentication handler: %v\n", authHandlerError)
	}
	equivalentHandler := handler.NewValueEquivalentHandler(equivalentService)

	routerEngine := transportHttp.SetupRouter(transportHttp.RouterConfig{
		AllowedOrigins:         allowedOrigins,
		ItemHandler:            itemHandler,
		SettingsHandler:        settingsHandler,
		HealthHandler:          healthHandler,
		AuthHandler:            authHandler,
		ValueEquivalentHandler: equivalentHandler,
		StaticDir:              staticDirectory,
		UserIdentityMiddleware: middleware.SessionIdentity(authService, middleware.DefaultSessionCookieName),
	})

	serverAddress := serverHost + ":" + serverPort
	httpServer := &http.Server{
		Addr:              serverAddress,
		Handler:           routerEngine,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("[info] Server is running on http://%s (GIN_MODE=%s)\n", serverAddress, ginMode)
		if listenError := httpServer.ListenAndServe(); listenError != nil && !errors.Is(listenError, http.ErrServerClosed) {
			log.Fatalf("[error] Server failed to start: %v\n", listenError)
		}
	}()

	shutdownSignalChannel := make(chan os.Signal, 1)
	signal.Notify(shutdownSignalChannel, syscall.SIGINT, syscall.SIGTERM)
	<-shutdownSignalChannel

	log.Println("[info] Shutting down server gracefully...")
	shutdownContext, cancelShutdownContext := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdownContext()

	if shutdownError := httpServer.Shutdown(shutdownContext); shutdownError != nil {
		log.Printf("[error] Server forced to shutdown: %v\n", shutdownError)
	}

	log.Println("[info] Server exited cleanly.")
}
