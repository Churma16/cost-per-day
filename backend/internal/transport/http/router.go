package http

import (
	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/transport/http/handler"
	"cost-per-day/backend/internal/transport/http/middleware"
)

// RouterConfig contains dependencies and configuration needed to assemble the HTTP router.
type RouterConfig struct {
	AllowedOrigins  string
	ItemHandler     *handler.ItemHandler
	SettingsHandler *handler.SettingsHandler
	HealthHandler   *handler.HealthHandler
}

// SetupRouter initializes Gin middleware, registers API route definitions, and returns the engine.
func SetupRouter(config RouterConfig) *gin.Engine {
	routerEngine := gin.New()
	routerEngine.Use(gin.Logger())
	routerEngine.Use(gin.Recovery())
	routerEngine.Use(middleware.CORSMiddleware(config.AllowedOrigins))

	routerEngine.GET("/health", config.HealthHandler.Check)

	apiRouteGroup := routerEngine.Group("/api")
	{
		itemRouteGroup := apiRouteGroup.Group("/items")
		{
			itemRouteGroup.GET("", config.ItemHandler.List)
			itemRouteGroup.POST("", config.ItemHandler.Create)
			itemRouteGroup.PUT("/replace", config.ItemHandler.ReplaceAll)
			itemRouteGroup.PUT("/:id", config.ItemHandler.Update)
			itemRouteGroup.DELETE("/:id", config.ItemHandler.Delete)
		}

		settingsRouteGroup := apiRouteGroup.Group("/settings")
		{
			settingsRouteGroup.GET("", config.SettingsHandler.GetAll)
			settingsRouteGroup.PUT("/:key", config.SettingsHandler.Update)
		}
	}

	return routerEngine
}
