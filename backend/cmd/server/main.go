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
	"cost-per-day/backend/internal/repository"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
	"cost-per-day/backend/internal/service"
	appHttp "cost-per-day/backend/internal/http"
	"cost-per-day/backend/internal/http/handler"
	"cost-per-day/backend/internal/http/middleware"
)

const (
	developmentUserID      = "dev-local"
	developmentIdentitySub = "development-auth-bypass"
	developmentUserEmail   = "dev@local"
	developmentUserName    = "Local Developer"
)

func ensureDevelopmentUser(ctx context.Context, userRepository repository.UserRepository) (domain.User, error) {
	return userRepository.FindOrCreateGoogleUser(ctx, domain.User{
		ID:          developmentUserID,
		GoogleSub:   developmentIdentitySub,
		Email:       developmentUserEmail,
		DisplayName: developmentUserName,
	})
}

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
		if ginMode != gin.ReleaseMode {
			appBaseURL = "http://localhost:3000"
		} else {
			log.Fatal("[error] APP_BASE_URL is required")
		}
	}
	parsedBaseURL, baseURLError := url.Parse(appBaseURL)
	if baseURLError != nil || parsedBaseURL.Host == "" || (parsedBaseURL.Scheme != "http" && parsedBaseURL.Scheme != "https") {
		log.Fatal("[error] APP_BASE_URL must be an absolute http or https URL")
	}

	allowedOrigins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if allowedOrigins == "" {
		if ginMode != gin.ReleaseMode {
			allowedOrigins = "http://localhost:3000,http://127.0.0.1:3000"
		} else {
			allowedOrigins = parsedBaseURL.Scheme + "://" + parsedBaseURL.Host
		}
	}
	for _, configuredOrigin := range strings.Split(allowedOrigins, ",") {
		if strings.TrimSpace(configuredOrigin) == "*" {
			log.Fatal("[error] ALLOWED_ORIGINS cannot contain wildcard origins when cookie authentication is enabled")
		}
	}

	googleClientID := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	googleClientSecret := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET"))
	sessionSecret := strings.TrimSpace(os.Getenv("SESSION_SECRET"))
	authDisabled := strings.EqualFold(os.Getenv("AUTH_DISABLED"), "true")
	if !authDisabled && (googleClientID == "" || googleClientSecret == "" || sessionSecret == "") {
		if ginMode != gin.ReleaseMode {
			log.Println("[info] Development mode without Google OIDC credentials. Enabling development auth bypass.")
			authDisabled = true
		} else {
			log.Fatal("[error] GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and SESSION_SECRET are required")
		}
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

	gormDB, gormError := sqliterepository.NewGORM(databaseConnection)
	if gormError != nil {
		log.Fatalf("[error] Failed to initialize GORM persistence: %v\n", gormError)
	}

	// Explicit dependency wiring (composition root).
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	settingsRepository := sqliterepository.NewSettingsRepository(gormDB)
	userRepository := sqliterepository.NewUserRepository(databaseConnection)
	sessionRepository := sqliterepository.NewSessionRepository(databaseConnection)
	equivalentRepository := sqliterepository.NewValueEquivalentRepository(gormDB)
	plannedPurchaseRepository := sqliterepository.NewPlannedPurchaseRepository(databaseConnection)
	categoryRepository := sqliterepository.NewCategoryRepository(gormDB)
	brandRepository := sqliterepository.NewBrandRepository(gormDB)

	itemService := service.NewItemService(itemRepository, categoryRepository, brandRepository)
	settingsService := service.NewSettingsService(settingsRepository)
	equivalentService := service.NewValueEquivalentService(equivalentRepository)
	dashboardService := service.NewDashboardService(itemRepository, settingsRepository, equivalentRepository)
	plannedPurchaseService := service.NewPlannedPurchaseService(plannedPurchaseRepository)
	durabilityService := service.NewDurabilityAnalyticsService(itemRepository, categoryRepository, brandRepository)

	var authHandler *handler.AuthHandler
	var identityMiddleware gin.HandlerFunc

	if authDisabled {
		log.Println("[info] Authentication is bypassed for local development. Requests use the explicit development user.")
		developmentContext, cancelDevelopmentContext := context.WithTimeout(context.Background(), 5*time.Second)
		developmentUser, developmentUserError := ensureDevelopmentUser(developmentContext, userRepository)
		cancelDevelopmentContext()
		if developmentUserError != nil {
			log.Fatalf("[error] Failed to initialize development auth user: %v\n", developmentUserError)
		}
		identityMiddleware = middleware.StaticUserIdentity(developmentUser.ID)
	} else {
		googleRedirectURI := strings.TrimSpace(os.Getenv("GOOGLE_REDIRECT_URI"))
		if googleRedirectURI == "" {
			googleRedirectURI = appBaseURL + "/auth/google/callback"
		}

		googleProvider, googleProviderError := googleoidc.NewClient(googleoidc.Config{
			ClientID:     googleClientID,
			ClientSecret: googleClientSecret,
			RedirectURI:  googleRedirectURI,
		})
		if googleProviderError != nil {
			log.Fatalf("[error] Failed to initialize Google OIDC client: %v\n", googleProviderError)
		}
		authService := service.NewAuthService(userRepository, sessionRepository, googleProvider)

		createdAuthHandler, authHandlerError := handler.NewAuthHandler(handler.AuthHandlerConfig{
			AuthService:   authService,
			SessionSecret: sessionSecret,
			AppBaseURL:    appBaseURL,
			SecureCookies: parsedBaseURL.Scheme == "https",
		})
		if authHandlerError != nil {
			log.Fatalf("[error] Failed to initialize authentication handler: %v\n", authHandlerError)
		}
		authHandler = createdAuthHandler
		identityMiddleware = middleware.SessionIdentity(authService, middleware.DefaultSessionCookieName)
	}

	itemHandler := handler.NewItemHandler(itemService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	healthHandler := handler.NewHealthHandler()
	equivalentHandler := handler.NewValueEquivalentHandler(equivalentService)
	dashboardHandler := handler.NewDashboardHandler(dashboardService)
	plannedPurchaseHandler := handler.NewPlannedPurchaseHandler(plannedPurchaseService)
	durabilityHandler := handler.NewDurabilityHandler(durabilityService)

	routerEngine := appHttp.SetupRouter(appHttp.RouterConfig{
		AllowedOrigins:         allowedOrigins,
		ItemHandler:            itemHandler,
		SettingsHandler:        settingsHandler,
		HealthHandler:          healthHandler,
		AuthHandler:            authHandler,
		ValueEquivalentHandler: equivalentHandler,
		DashboardHandler:       dashboardHandler,
		PlannedPurchaseHandler: plannedPurchaseHandler,
		DurabilityHandler:      durabilityHandler,
		StaticDir:              staticDirectory,
		UserIdentityMiddleware: identityMiddleware,
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
