package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

type failingPlannedPurchaseConversionRepository struct {
	err error
}

func (repositoryInstance failingPlannedPurchaseConversionRepository) Convert(
	_ context.Context,
	_ string,
	_ string,
	_ domain.Item,
) (domain.Item, error) {
	return domain.Item{}, repositoryInstance.err
}

var _ repository.PlannedPurchaseConversionRepository = failingPlannedPurchaseConversionRepository{}

func TestPlannedPurchaseConversionService(t *testing.T) {
	ctx := context.Background()
	fixedNow := time.Date(2026, 9, 24, 12, 0, 0, 0, time.UTC)

	newPlan := func(t *testing.T, plannedRepository repository.PlannedPurchaseRepository, userID string) domain.PlannedPurchase {
		t.Helper()
		created, createError := plannedRepository.Create(ctx, userID, domain.PlannedPurchase{
			Name:         "Laptop",
			TargetPrice:  12000000,
			CurrencyCode: "IDR",
		})
		if createError != nil {
			t.Fatalf("create planned purchase: %v", createError)
		}
		return created
	}

	t.Run("converts plan into normal owned item and removes the plan", func(t *testing.T) {
		plannedRepository := memory.NewMemoryPlannedPurchaseRepository()
		itemRepository := memory.NewMemoryItemRepository()
		conversionRepository := memory.NewMemoryPlannedPurchaseConversionRepository(itemRepository, plannedRepository)
		conversionService := service.NewPlannedPurchaseConversionServiceWithClock(
			plannedRepository,
			conversionRepository,
			func() time.Time { return fixedNow },
		)
		plan := newPlan(t, plannedRepository, "user-1")

		item, conversionError := conversionService.ConvertPlannedPurchase(
			ctx,
			"user-1",
			plan.ID,
			11500000,
			"IDR",
			"2026-09-24",
		)
		if conversionError != nil {
			t.Fatalf("convert planned purchase: %v", conversionError)
		}
		if item.Name != "Laptop" || item.Price != 11500000 {
			t.Fatalf("unexpected converted item: %+v", item)
		}
		if item.Status != domain.ItemStatusActive {
			t.Fatalf("expected active item, got %q", item.Status)
		}
		if item.OwnershipDays != 1 {
			t.Fatalf("expected converted item to use normal ownership calculations, got %d days", item.OwnershipDays)
		}

		if _, getError := plannedRepository.GetByID(ctx, "user-1", plan.ID); !errors.Is(getError, domain.ErrPlannedPurchaseNotFound) {
			t.Fatalf("expected converted plan to be removed, got %v", getError)
		}
		items, listError := itemRepository.List(ctx, "user-1")
		if listError != nil || len(items) != 1 {
			t.Fatalf("expected one owned item, got %d, err=%v", len(items), listError)
		}
	})

	t.Run("validation failure leaves the plan intact", func(t *testing.T) {
		plannedRepository := memory.NewMemoryPlannedPurchaseRepository()
		itemRepository := memory.NewMemoryItemRepository()
		conversionRepository := memory.NewMemoryPlannedPurchaseConversionRepository(itemRepository, plannedRepository)
		conversionService := service.NewPlannedPurchaseConversionService(plannedRepository, conversionRepository)
		plan := newPlan(t, plannedRepository, "user-1")

		_, conversionError := conversionService.ConvertPlannedPurchase(
			ctx,
			"user-1",
			plan.ID,
			0,
			"IDR",
			"2026-09-24",
		)
		if !errors.Is(conversionError, domain.ErrInvalidItemPrice) {
			t.Fatalf("expected ErrInvalidItemPrice, got %v", conversionError)
		}
		if _, getError := plannedRepository.GetByID(ctx, "user-1", plan.ID); getError != nil {
			t.Fatalf("expected plan to remain after validation failure, got %v", getError)
		}
		items, _ := itemRepository.List(ctx, "user-1")
		if len(items) != 0 {
			t.Fatalf("expected no owned item after validation failure, got %d", len(items))
		}
	})

	t.Run("cross-user conversion returns not found and does not reveal ownership", func(t *testing.T) {
		plannedRepository := memory.NewMemoryPlannedPurchaseRepository()
		itemRepository := memory.NewMemoryItemRepository()
		conversionRepository := memory.NewMemoryPlannedPurchaseConversionRepository(itemRepository, plannedRepository)
		conversionService := service.NewPlannedPurchaseConversionService(plannedRepository, conversionRepository)
		plan := newPlan(t, plannedRepository, "user-alpha")

		_, conversionError := conversionService.ConvertPlannedPurchase(
			ctx,
			"user-beta",
			plan.ID,
			11500000,
			"IDR",
			"2026-09-24",
		)
		if !errors.Is(conversionError, domain.ErrPlannedPurchaseNotFound) {
			t.Fatalf("expected ErrPlannedPurchaseNotFound, got %v", conversionError)
		}
		if _, getError := plannedRepository.GetByID(ctx, "user-alpha", plan.ID); getError != nil {
			t.Fatalf("expected original user's plan to remain, got %v", getError)
		}
	})

	t.Run("repository conversion failure leaves the plan intact", func(t *testing.T) {
		plannedRepository := memory.NewMemoryPlannedPurchaseRepository()
		plan := newPlan(t, plannedRepository, "user-1")
		conversionService := service.NewPlannedPurchaseConversionService(
			plannedRepository,
			failingPlannedPurchaseConversionRepository{err: errors.New("item insert failed")},
		)

		_, conversionError := conversionService.ConvertPlannedPurchase(
			ctx,
			"user-1",
			plan.ID,
			11500000,
			"IDR",
			"2026-09-24",
		)
		if conversionError == nil {
			t.Fatal("expected repository conversion failure")
		}
		if _, getError := plannedRepository.GetByID(ctx, "user-1", plan.ID); getError != nil {
			t.Fatalf("expected plan to remain after repository failure, got %v", getError)
		}
	})

	t.Run("currency must match source plan", func(t *testing.T) {
		plannedRepository := memory.NewMemoryPlannedPurchaseRepository()
		itemRepository := memory.NewMemoryItemRepository()
		conversionRepository := memory.NewMemoryPlannedPurchaseConversionRepository(itemRepository, plannedRepository)
		conversionService := service.NewPlannedPurchaseConversionService(plannedRepository, conversionRepository)
		plan := newPlan(t, plannedRepository, "user-1")

		_, conversionError := conversionService.ConvertPlannedPurchase(
			ctx,
			"user-1",
			plan.ID,
			11500000,
			"USD",
			"2026-09-24",
		)
		if !errors.Is(conversionError, domain.ErrPlannedPurchaseCurrencyMismatch) {
			t.Fatalf("expected currency mismatch, got %v", conversionError)
		}
	})
}
