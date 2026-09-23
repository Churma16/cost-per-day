package service_test

import (
	"context"
	"errors"
	"math"
	"testing"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestValueEquivalentServiceValidationAndOperations(t *testing.T) {
	ctx := context.Background()

	t.Run("rejects empty or whitespace name", func(t *testing.T) {
		equivalentService := service.NewValueEquivalentService(memory.NewMemoryValueEquivalentRepository())

		_, createError := equivalentService.CreateValueEquivalent(ctx, "user-1", "   ", 10.0, "USD")
		if !errors.Is(createError, domain.ErrEmptyValueEquivalentName) {
			t.Fatalf("expected ErrEmptyValueEquivalentName, got %v", createError)
		}
	})

	t.Run("rejects non-positive, NaN, and Inf amount", func(t *testing.T) {
		equivalentService := service.NewValueEquivalentService(memory.NewMemoryValueEquivalentRepository())

		testCases := []float64{0, -5.0, math.NaN(), math.Inf(1), math.Inf(-1)}
		for _, invalidAmount := range testCases {
			_, createError := equivalentService.CreateValueEquivalent(ctx, "user-1", "Coffee", invalidAmount, "USD")
			if !errors.Is(createError, domain.ErrInvalidValueEquivalentAmount) {
				t.Fatalf("amount %v: expected ErrInvalidValueEquivalentAmount, got %v", invalidAmount, createError)
			}
		}
	})

	t.Run("rejects invalid or unsupported currency code", func(t *testing.T) {
		equivalentService := service.NewValueEquivalentService(memory.NewMemoryValueEquivalentRepository())

		invalidCurrencies := []string{"", "   ", "XYZ", "GBP", "123"}
		for _, invalidCurrency := range invalidCurrencies {
			_, createError := equivalentService.CreateValueEquivalent(ctx, "user-1", "Coffee", 5.0, invalidCurrency)
			if !errors.Is(createError, domain.ErrInvalidValueEquivalentCurrency) {
				t.Fatalf("currency %q: expected ErrInvalidValueEquivalentCurrency, got %v", invalidCurrency, createError)
			}
		}
	})

	t.Run("accepts supported currencies with case normalization", func(t *testing.T) {
		equivalentService := service.NewValueEquivalentService(memory.NewMemoryValueEquivalentRepository())

		validCurrencies := []string{"USD", "eur", "Cny", "idr"}
		for _, validCurrency := range validCurrencies {
			created, createError := equivalentService.CreateValueEquivalent(ctx, "user-1", "Item "+validCurrency, 1000, validCurrency)
			if createError != nil {
				t.Fatalf("currency %q: unexpected error: %v", validCurrency, createError)
			}
			if created.CurrencyCode == "" {
				t.Fatalf("currency %q: expected normalized currency code", validCurrency)
			}
		}
	})

	t.Run("requires authenticated user identity", func(t *testing.T) {
		equivalentService := service.NewValueEquivalentService(memory.NewMemoryValueEquivalentRepository())

		_, listError := equivalentService.ListValueEquivalents(ctx, "   ")
		if !errors.Is(listError, domain.ErrUserIdentityRequired) {
			t.Fatalf("expected ErrUserIdentityRequired, got %v", listError)
		}
	})

	t.Run("performs CRUD and enforces user isolation", func(t *testing.T) {
		equivalentService := service.NewValueEquivalentService(memory.NewMemoryValueEquivalentRepository())

		created, createError := equivalentService.CreateValueEquivalent(ctx, "user-a", "Coffee", 15000, "IDR")
		if createError != nil {
			t.Fatalf("failed to create equivalent: %v", createError)
		}
		if created.ID == "" || created.Name != "Coffee" || created.Amount != 15000 || created.CurrencyCode != "IDR" {
			t.Fatalf("unexpected created equivalent: %+v", created)
		}

		// user-b cannot see user-a's equivalent
		_, getError := equivalentService.GetValueEquivalentByID(ctx, "user-b", created.ID)
		if !errors.Is(getError, domain.ErrValueEquivalentNotFound) {
			t.Fatalf("expected ErrValueEquivalentNotFound for other user, got: %v", getError)
		}

		// user-a can get and update
		updated, updateError := equivalentService.UpdateValueEquivalent(ctx, "user-a", created.ID, "Special Coffee", 18000, "IDR")
		if updateError != nil {
			t.Fatalf("failed to update equivalent: %v", updateError)
		}
		if updated.Name != "Special Coffee" || updated.Amount != 18000 {
			t.Fatalf("unexpected updated equivalent: %+v", updated)
		}

		// user-a can delete
		deleteError := equivalentService.DeleteValueEquivalent(ctx, "user-a", created.ID)
		if deleteError != nil {
			t.Fatalf("failed to delete equivalent: %v", deleteError)
		}

		_, afterDeleteError := equivalentService.GetValueEquivalentByID(ctx, "user-a", created.ID)
		if !errors.Is(afterDeleteError, domain.ErrValueEquivalentNotFound) {
			t.Fatalf("expected ErrValueEquivalentNotFound after delete, got: %v", afterDeleteError)
		}
	})
}
