package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
	"cost-per-day/backend/internal/service"
	transportHttp "cost-per-day/backend/internal/transport/http"
	"cost-per-day/backend/internal/transport/http/handler"
)

func main() {
	serverPort := os.Getenv("PORT")
	if serverPort == "" {
		serverPort = "8080"
	}

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = gin.ReleaseMode
	}
	gin.SetMode(ginMode)

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}

	databasePath := os.Getenv("DATABASE_PATH")
	if databasePath == "" {
		databasePath = "./data/cost-per-day.db"
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

	// Explicit dependency wiring (composition root)
	itemRepository := sqliterepository.NewItemRepository(databaseConnection)
	settingsRepository := sqliterepository.NewSettingsRepository(databaseConnection)

	itemService := service.NewItemService(itemRepository)
	settingsService := service.NewSettingsService(settingsRepository)

	itemHandler := handler.NewItemHandler(itemService)
	settingsHandler := handler.NewSettingsHandler(settingsService)
	healthHandler := handler.NewHealthHandler()

	routerEngine := transportHttp.SetupRouter(transportHttp.RouterConfig{
		AllowedOrigins:  allowedOrigins,
		ItemHandler:     itemHandler,
		SettingsHandler: settingsHandler,
		HealthHandler:   healthHandler,
	})

	serverAddress := ":" + serverPort
	httpServer := &http.Server{
		Addr:              serverAddress,
		Handler:           routerEngine,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("[info] Server is running on port %s (GIN_MODE=%s)\n", serverPort, ginMode)
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
