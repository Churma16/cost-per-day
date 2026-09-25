package service_test

import (
	"context"
	"errors"
	"math"
	"testing"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository/memory"
	"cost-per-day/backend/internal/service"
)

func TestPlannedPurchaseServiceValidationAndCalculations(t *testing.T) {
	ctx := context.Background()

	t.Run("rejects empty or whitespace name", func(t *testing.T) {
		purchaseService := service.NewPlannedPurchaseService(memory.NewMemoryPlannedPurchaseRepository())

		_, createError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:         "   ",
			TargetPrice:  1000,
			CurrencyCode: "USD",
		})
		if !errors.Is(createError, domain.ErrEmptyPlannedPurchaseName) {
			t.Fatalf("expected ErrEmptyPlannedPurchaseName, got %v", createError)
		}
	})

	t.Run("rejects non-positive, NaN, and Inf target price", func(t *testing.T) {
		purchaseService := service.NewPlannedPurchaseService(memory.NewMemoryPlannedPurchaseRepository())

		testCases := []float64{0, -100, math.NaN(), math.Inf(1), math.Inf(-1)}
		for _, invalidPrice := range testCases {
			_, createError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
				Name:         "Laptop",
				TargetPrice:  invalidPrice,
				CurrencyCode: "USD",
			})
			if !errors.Is(createError, domain.ErrInvalidPlannedPurchasePrice) {
				t.Fatalf("price %v: expected ErrInvalidPlannedPurchasePrice, got %v", invalidPrice, createError)
			}
		}
	})

	t.Run("rejects invalid currency code", func(t *testing.T) {
		purchaseService := service.NewPlannedPurchaseService(memory.NewMemoryPlannedPurchaseRepository())

		for _, invalidCurrency := range []string{"", "XYZ", "GBP", "123"} {
			_, createError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
				Name:         "Laptop",
				TargetPrice:  1000,
				CurrencyCode: invalidCurrency,
			})
			if !errors.Is(createError, domain.ErrInvalidPlannedPurchaseCurrency) {
				t.Fatalf("currency %q: expected ErrInvalidPlannedPurchaseCurrency, got %v", invalidCurrency, createError)
			}
		}
	})

	t.Run("rejects past or today target date", func(t *testing.T) {
		purchaseService := service.NewPlannedPurchaseService(memory.NewMemoryPlannedPurchaseRepository())

		pastDate := "2020-01-01"
		_, createError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:         "Laptop",
			TargetPrice:  1000,
			CurrencyCode: "USD",
			TargetDate:   &pastDate,
		})
		if !errors.Is(createError, domain.ErrInvalidTargetDate) {
			t.Fatalf("expected ErrInvalidTargetDate for past date, got %v", createError)
		}

		todayDate := time.Now().UTC().Format("2006-01-02")
		_, todayError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:         "Laptop",
			TargetPrice:  1000,
			CurrencyCode: "USD",
			TargetDate:   &todayDate,
		})
		if !errors.Is(todayError, domain.ErrInvalidTargetDate) {
			t.Fatalf("expected ErrInvalidTargetDate for today date, got %v", todayError)
		}
	})

	t.Run("rejects invalid contribution configuration", func(t *testing.T) {
		purchaseService := service.NewPlannedPurchaseService(memory.NewMemoryPlannedPurchaseRepository())

		// Contribution amount with missing cadence
		amount := 25000.0
		_, missingCadenceError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:               "Laptop",
			TargetPrice:        18000000,
			CurrencyCode:       "IDR",
			ContributionAmount: &amount,
		})
		if !errors.Is(missingCadenceError, domain.ErrMissingContributionCadence) {
			t.Fatalf("expected ErrMissingContributionCadence, got %v", missingCadenceError)
		}

		// Cadence with missing amount
		cadence := domain.ContributionCadenceDaily
		_, missingAmountError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:                "Laptop",
			TargetPrice:         18000000,
			CurrencyCode:        "IDR",
			ContributionCadence: &cadence,
		})
		if !errors.Is(missingAmountError, domain.ErrMissingContributionAmount) {
			t.Fatalf("expected ErrMissingContributionAmount, got %v", missingAmountError)
		}

		// Zero contribution amount
		zeroAmount := 0.0
		dailyCadence := domain.ContributionCadenceDaily
		_, zeroAmountError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:                "Laptop",
			TargetPrice:         18000000,
			CurrencyCode:        "IDR",
			ContributionAmount:  &zeroAmount,
			ContributionCadence: &dailyCadence,
		})
		if !errors.Is(zeroAmountError, domain.ErrInvalidContributionAmount) {
			t.Fatalf("expected ErrInvalidContributionAmount, got %v", zeroAmountError)
		}

		// Invalid cadence string
		invalidCadence := domain.ContributionCadence("hourly")
		_, invalidCadenceError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:                "Laptop",
			TargetPrice:         18000000,
			CurrencyCode:        "IDR",
			ContributionAmount:  &amount,
			ContributionCadence: &invalidCadence,
		})
		if !errors.Is(invalidCadenceError, domain.ErrInvalidContributionCadence) {
			t.Fatalf("expected ErrInvalidContributionCadence, got %v", invalidCadenceError)
		}
	})

	t.Run("calculates contribution to duration accurately", func(t *testing.T) {
		purchaseService := service.NewPlannedPurchaseService(memory.NewMemoryPlannedPurchaseRepository())

		// Daily: MacBook Rp18.000.000, Rp25.000/day -> 720 days
		dailyAmount := 25000.0
		dailyCadence := domain.ContributionCadenceDaily
		dailyPurchase, dailyError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:                "MacBook",
			TargetPrice:         18000000,
			CurrencyCode:        "IDR",
			ContributionAmount:  &dailyAmount,
			ContributionCadence: &dailyCadence,
		})
		if dailyError != nil {
			t.Fatalf("unexpected daily error: %v", dailyError)
		}
		if dailyPurchase.EstimatedPeriods == nil || *dailyPurchase.EstimatedPeriods != 720 {
			t.Fatalf("expected estimated periods 720, got %v", dailyPurchase.EstimatedPeriods)
		}
		if dailyPurchase.EstimatedDays == nil || *dailyPurchase.EstimatedDays != 720 {
			t.Fatalf("expected estimated days 720, got %v", dailyPurchase.EstimatedDays)
		}

		// Weekly: Rp12.000.000, Rp100.000/week -> 120 weeks -> 840 days
		weeklyAmount := 100000.0
		weeklyCadence := domain.ContributionCadenceWeekly
		weeklyPurchase, weeklyError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:                "Laptop",
			TargetPrice:         12000000,
			CurrencyCode:        "IDR",
			ContributionAmount:  &weeklyAmount,
			ContributionCadence: &weeklyCadence,
		})
		if weeklyError != nil {
			t.Fatalf("unexpected weekly error: %v", weeklyError)
		}
		if weeklyPurchase.EstimatedPeriods == nil || *weeklyPurchase.EstimatedPeriods != 120 {
			t.Fatalf("expected estimated periods 120, got %v", weeklyPurchase.EstimatedPeriods)
		}
		if weeklyPurchase.EstimatedDays == nil || *weeklyPurchase.EstimatedDays != 840 {
			t.Fatalf("expected estimated days 840, got %v", weeklyPurchase.EstimatedDays)
		}

		// Monthly: Rp12.000.000, Rp1.000.000/month -> 12 months -> 365 days
		monthlyAmount := 1000000.0
		monthlyCadence := domain.ContributionCadenceMonthly
		monthlyPurchase, monthlyError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:                "Laptop",
			TargetPrice:         12000000,
			CurrencyCode:        "IDR",
			ContributionAmount:  &monthlyAmount,
			ContributionCadence: &monthlyCadence,
		})
		if monthlyError != nil {
			t.Fatalf("unexpected monthly error: %v", monthlyError)
		}
		if monthlyPurchase.EstimatedPeriods == nil || *monthlyPurchase.EstimatedPeriods != 12 {
			t.Fatalf("expected estimated periods 12, got %v", monthlyPurchase.EstimatedPeriods)
		}
		if monthlyPurchase.EstimatedDays == nil || *monthlyPurchase.EstimatedDays != 365 {
			t.Fatalf("expected estimated days 365, got %v", monthlyPurchase.EstimatedDays)
		}
	})

	t.Run("calculates non-divisible recurring contributions using ceiled periods without decimal leakage", func(t *testing.T) {
		purchaseService := service.NewPlannedPurchaseService(memory.NewMemoryPlannedPurchaseRepository())

		// Case 1: Rp1.200.000 / Rp14.000 daily -> 85.714... periods -> ceiled to 86 periods (~86 days)
		dailyAmount := 14000.0
		dailyCadence := domain.ContributionCadenceDaily
		dailyPurchase, dailyError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:                "Jacket",
			TargetPrice:         1200000,
			CurrencyCode:        "IDR",
			ContributionAmount:  &dailyAmount,
			ContributionCadence: &dailyCadence,
		})
		if dailyError != nil {
			t.Fatalf("unexpected error: %v", dailyError)
		}
		if dailyPurchase.EstimatedPeriods == nil || *dailyPurchase.EstimatedPeriods != 86 {
			t.Fatalf("expected 86 periods (ceiled from 85.714...), got %v", dailyPurchase.EstimatedPeriods)
		}
		if dailyPurchase.EstimatedDays == nil || *dailyPurchase.EstimatedDays != 86 {
			t.Fatalf("expected 86 days, got %v", dailyPurchase.EstimatedDays)
		}

		// Case 2: $100 / $30 weekly -> 3.333... periods -> ceiled to 4 weeks -> 28 days
		weeklyAmount := 30.0
		weeklyCadence := domain.ContributionCadenceWeekly
		weeklyPurchase, weeklyError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:                "Book Set",
			TargetPrice:         100,
			CurrencyCode:        "USD",
			ContributionAmount:  &weeklyAmount,
			ContributionCadence: &weeklyCadence,
		})
		if weeklyError != nil {
			t.Fatalf("unexpected error: %v", weeklyError)
		}
		if weeklyPurchase.EstimatedPeriods == nil || *weeklyPurchase.EstimatedPeriods != 4 {
			t.Fatalf("expected 4 periods, got %v", weeklyPurchase.EstimatedPeriods)
		}
		if weeklyPurchase.EstimatedDays == nil || *weeklyPurchase.EstimatedDays != 28 {
			t.Fatalf("expected 28 days, got %v", weeklyPurchase.EstimatedDays)
		}

		// Case 3: $100 / $30 monthly -> 3.333... periods -> ceiled to 4 months -> 122 days
		monthlyAmount := 30.0
		monthlyCadence := domain.ContributionCadenceMonthly
		monthlyPurchase, monthlyError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:                "Tool",
			TargetPrice:         100,
			CurrencyCode:        "USD",
			ContributionAmount:  &monthlyAmount,
			ContributionCadence: &monthlyCadence,
		})
		if monthlyError != nil {
			t.Fatalf("unexpected error: %v", monthlyError)
		}
		if monthlyPurchase.EstimatedPeriods == nil || *monthlyPurchase.EstimatedPeriods != 4 {
			t.Fatalf("expected 4 periods, got %v", monthlyPurchase.EstimatedPeriods)
		}
		if monthlyPurchase.EstimatedDays == nil || *monthlyPurchase.EstimatedDays != 122 {
			t.Fatalf("expected 122 days, got %v", monthlyPurchase.EstimatedDays)
		}
	})

	t.Run("calculates target date to required contribution accurately including leap-year February", func(t *testing.T) {
		// Leap year test: 2028 is a leap year; February 2028 has 29 days.
		frozenLeapYearTime := time.Date(2028, 2, 1, 10, 0, 0, 0, time.UTC)
		leapYearService := service.NewPlannedPurchaseServiceWithClock(
			memory.NewMemoryPlannedPurchaseRepository(),
			func() time.Time { return frozenLeapYearTime },
		)

		leapTargetDate := "2028-03-01"
		leapPurchase, leapError := leapYearService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:         "Leap Camera",
			TargetPrice:  290,
			CurrencyCode: "USD",
			TargetDate:   &leapTargetDate,
		})
		if leapError != nil {
			t.Fatalf("unexpected leap year error: %v", leapError)
		}
		if leapPurchase.RequiredDailyContribution == nil {
			t.Fatal("expected RequiredDailyContribution to be present")
		}
		// 290 target price / 29 days in Feb 2028 = 10.0 per day
		if math.Abs(*leapPurchase.RequiredDailyContribution-10.0) > 0.001 {
			t.Fatalf("expected leap year daily contribution 10.0, got %v", *leapPurchase.RequiredDailyContribution)
		}

		// Non-leap year comparison: 2027 has 28 days in February
		frozenNonLeapTime := time.Date(2027, 2, 1, 10, 0, 0, 0, time.UTC)
		nonLeapService := service.NewPlannedPurchaseServiceWithClock(
			memory.NewMemoryPlannedPurchaseRepository(),
			func() time.Time { return frozenNonLeapTime },
		)

		nonLeapTargetDate := "2027-03-01"
		nonLeapPurchase, nonLeapError := nonLeapService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:         "Non-Leap Camera",
			TargetPrice:  280,
			CurrencyCode: "USD",
			TargetDate:   &nonLeapTargetDate,
		})
		if nonLeapError != nil {
			t.Fatalf("unexpected non-leap year error: %v", nonLeapError)
		}
		// 280 target price / 28 days in Feb 2027 = 10.0 per day
		if math.Abs(*nonLeapPurchase.RequiredDailyContribution-10.0) > 0.001 {
			t.Fatalf("expected non-leap year daily contribution 10.0, got %v", *nonLeapPurchase.RequiredDailyContribution)
		}
	})

	t.Run("uses one day minimum and derives weekly and monthly target-date contributions", func(t *testing.T) {
		frozenTime := time.Date(2028, 3, 1, 18, 0, 0, 0, time.UTC)
		purchaseService := service.NewPlannedPurchaseServiceWithClock(
			memory.NewMemoryPlannedPurchaseRepository(),
			func() time.Time { return frozenTime },
		)

		targetDate := "2028-03-02"
		purchase, createError := purchaseService.CreatePlannedPurchase(ctx, "user-1", domain.PlannedPurchase{
			Name:         "Camera",
			TargetPrice:  120,
			CurrencyCode: "USD",
			TargetDate:   &targetDate,
		})
		if createError != nil {
			t.Fatalf("unexpected target-date error: %v", createError)
		}

		if purchase.RequiredDailyContribution == nil || math.Abs(*purchase.RequiredDailyContribution-120.0) > 0.001 {
			t.Fatalf("expected daily contribution 120.0, got %v", purchase.RequiredDailyContribution)
		}
		if purchase.RequiredWeeklyContribution == nil || math.Abs(*purchase.RequiredWeeklyContribution-840.0) > 0.001 {
			t.Fatalf("expected weekly contribution 840.0, got %v", purchase.RequiredWeeklyContribution)
		}
		if purchase.RequiredMonthlyContribution == nil || math.Abs(*purchase.RequiredMonthlyContribution-3650.0) > 0.001 {
			t.Fatalf("expected monthly contribution 3650.0, got %v", purchase.RequiredMonthlyContribution)
		}
	})

	t.Run("enforces user isolation and CRUD integrity", func(t *testing.T) {
		purchaseService := service.NewPlannedPurchaseService(memory.NewMemoryPlannedPurchaseRepository())

		created, createError := purchaseService.CreatePlannedPurchase(ctx, "user-alpha", domain.PlannedPurchase{
			Name:         "iPad",
			TargetPrice:  800,
			CurrencyCode: "USD",
		})
		if createError != nil {
			t.Fatalf("failed to create planned purchase: %v", createError)
		}

		// user-beta cannot see user-alpha's planned purchase
		_, betaGetError := purchaseService.GetPlannedPurchaseByID(ctx, "user-beta", created.ID)
		if !errors.Is(betaGetError, domain.ErrPlannedPurchaseNotFound) {
			t.Fatalf("expected ErrPlannedPurchaseNotFound for user-beta, got %v", betaGetError)
		}

		// user-alpha can update
		amount := 50.0
		cadence := domain.ContributionCadenceWeekly
		created.ContributionAmount = &amount
		created.ContributionCadence = &cadence
		created.Name = "iPad Pro"
		updated, updateError := purchaseService.UpdatePlannedPurchase(ctx, "user-alpha", created)
		if updateError != nil {
			t.Fatalf("failed to update planned purchase: %v", updateError)
		}
		if updated.Name != "iPad Pro" || updated.EstimatedPeriods == nil {
			t.Fatalf("unexpected updated planned purchase: %+v", updated)
		}

		// user-alpha can delete
		deleteError := purchaseService.DeletePlannedPurchase(ctx, "user-alpha", created.ID)
		if deleteError != nil {
			t.Fatalf("failed to delete planned purchase: %v", deleteError)
		}

		// Verify deletion
		_, deletedGetError := purchaseService.GetPlannedPurchaseByID(ctx, "user-alpha", created.ID)
		if !errors.Is(deletedGetError, domain.ErrPlannedPurchaseNotFound) {
			t.Fatalf("expected ErrPlannedPurchaseNotFound after deletion, got %v", deletedGetError)
		}
	})
}
