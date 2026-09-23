package response

import (
	"github.com/gin-gonic/gin"
)

// Meta represents the metadata section of every standard JSON API response.
type Meta struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// Envelope represents the canonical top-level JSON response structure.
type Envelope struct {
	Meta Meta `json:"meta"`
	Data any  `json:"data"`
}

// Success sends a standardized JSON success response with a payload.
func Success(ginContext *gin.Context, httpStatusCode int, statusMessage string, responseData any) {
	ginContext.JSON(httpStatusCode, Envelope{
		Meta: Meta{
			Code:    httpStatusCode,
			Message: statusMessage,
		},
		Data: responseData,
	})
}

// SuccessWithoutData sends a standardized JSON success response with null data payload.
func SuccessWithoutData(ginContext *gin.Context, httpStatusCode int, statusMessage string) {
	ginContext.JSON(httpStatusCode, Envelope{
		Meta: Meta{
			Code:    httpStatusCode,
			Message: statusMessage,
		},
		Data: nil,
	})
}

// Error sends a standardized JSON error response with null data payload.
func Error(ginContext *gin.Context, httpStatusCode int, errorMessage string) {
	ginContext.JSON(httpStatusCode, Envelope{
		Meta: Meta{
			Code:    httpStatusCode,
			Message: errorMessage,
		},
		Data: nil,
	})
}
