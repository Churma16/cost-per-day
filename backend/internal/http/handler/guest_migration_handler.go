package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/http/dto"
	"cost-per-day/backend/internal/http/response"
	"cost-per-day/backend/internal/service"
)

// GuestMigrationHandler handles authenticated imports from local-only guest mode.
type GuestMigrationHandler struct {
	service service.GuestMigrationService
}

// NewGuestMigrationHandler creates an authenticated guest migration handler.
func NewGuestMigrationHandler(guestMigrationService service.GuestMigrationService) *GuestMigrationHandler {
	return &GuestMigrationHandler{service: guestMigrationService}
}

// Import handles POST /api/guest-migrations.
func (handlerInstance *GuestMigrationHandler) Import(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	var requestBody dto.GuestMigrationRequestDTO
	if bindError := ginContext.ShouldBindJSON(&requestBody); bindError != nil {
		response.Error(ginContext, http.StatusBadRequest, "invalid request body format")
		return
	}

	items := make([]domain.Item, 0, len(requestBody.Items))
	for _, candidate := range requestBody.Items {
		var targetType *domain.OwnershipTargetType
		if candidate.TargetType != nil {
			normalizedType := domain.OwnershipTargetType(*candidate.TargetType)
			targetType = &normalizedType
		}
		items = append(items, domain.Item{
			Name:         candidate.Name,
			Price:        candidate.Price,
			PurchaseDate: candidate.PurchaseDate,
			Status:       domain.ItemStatus(candidate.Status),
			EndedAt:      candidate.EndedAt,
			SalePrice:    candidate.SalePrice,
			Category:     candidate.Category,
			Brand:        candidate.Brand,
			TargetType:   targetType,
			TargetValue:  candidate.TargetValue,
		})
	}

	plannedPurchases := make([]domain.PlannedPurchase, 0, len(requestBody.PlannedPurchases))
	for _, candidate := range requestBody.PlannedPurchases {
		var cadence *domain.ContributionCadence
		if candidate.ContributionCadence != nil {
			normalizedCadence := domain.ContributionCadence(*candidate.ContributionCadence)
			cadence = &normalizedCadence
		}
		plannedPurchases = append(plannedPurchases, domain.PlannedPurchase{
			Name:                candidate.Name,
			TargetPrice:         candidate.TargetPrice,
			CurrencyCode:        candidate.CurrencyCode,
			TargetDate:          candidate.TargetDate,
			ContributionAmount:  candidate.ContributionAmount,
			ContributionCadence: cadence,
		})
	}

	migrationResult, migrationError := handlerInstance.service.ImportGuestData(
		ginContext.Request.Context(),
		userID,
		requestBody.MigrationID,
		items,
		plannedPurchases,
	)
	if migrationError != nil {
		if isGuestMigrationValidationError(migrationError) {
			response.Error(ginContext, http.StatusBadRequest, migrationError.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to import guest data")
		return
	}

	response.Success(ginContext, http.StatusOK, "guest data imported successfully", migrationResult)
}

func isGuestMigrationValidationError(candidate error) bool {
	return errors.Is(candidate, domain.ErrInvalidGuestMigrationID) ||
		isItemValidationError(candidate) ||
		isPlannedPurchaseValidationError(candidate)
}
