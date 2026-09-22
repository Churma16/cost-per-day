package http

import (
	"fmt"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

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
	StaticDir       string
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

	registerStaticFrontend(routerEngine, config.StaticDir)

	return routerEngine
}

func registerStaticFrontend(routerEngine *gin.Engine, staticDirectory string) {
	trimmedStaticDirectory := strings.TrimSpace(staticDirectory)
	if trimmedStaticDirectory == "" {
		return
	}

	absoluteStaticDirectory, absolutePathError := filepath.Abs(trimmedStaticDirectory)
	if absolutePathError != nil {
		panic(fmt.Sprintf("resolve static frontend directory: %v", absolutePathError))
	}

	indexPath := filepath.Join(absoluteStaticDirectory, "index.html")
	indexInfo, indexStatError := os.Stat(indexPath)
	if indexStatError != nil {
		panic(fmt.Sprintf("stat static frontend index: %v", indexStatError))
	}
	if indexInfo.IsDir() {
		panic("static frontend index path is a directory")
	}

	routerEngine.NoRoute(func(context *gin.Context) {
		if context.Request.Method != http.MethodGet && context.Request.Method != http.MethodHead {
			context.Status(http.StatusNotFound)
			return
		}

		requestPath := context.Request.URL.Path
		if requestPath == "/api" || strings.HasPrefix(requestPath, "/api/") || requestPath == "/health" {
			context.Status(http.StatusNotFound)
			return
		}

		cleanURLPath := path.Clean("/" + requestPath)
		relativeURLPath := strings.TrimPrefix(cleanURLPath, "/")
		if relativeURLPath != "" && relativeURLPath != "." {
			candidatePath := filepath.Join(absoluteStaticDirectory, filepath.FromSlash(relativeURLPath))
			if pathIsWithinDirectory(absoluteStaticDirectory, candidatePath) {
				if candidateInfo, candidateStatError := os.Stat(candidatePath); candidateStatError == nil && !candidateInfo.IsDir() {
					context.File(candidatePath)
					return
				}
			}
		}

		context.File(indexPath)
	})
}

func pathIsWithinDirectory(baseDirectory, candidatePath string) bool {
	relativePath, relativePathError := filepath.Rel(baseDirectory, candidatePath)
	if relativePathError != nil {
		return false
	}

	return relativePath != ".." &&
		!strings.HasPrefix(relativePath, ".."+string(os.PathSeparator))
}
