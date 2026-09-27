package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// GuestMigrationRepository imports one local guest payload atomically and records its retry key.
type GuestMigrationRepository struct {
	database *gorm.DB
}

// NewGuestMigrationRepository creates a SQLite-backed guest migration repository.
func NewGuestMigrationRepository(database *gorm.DB) repository.GuestMigrationRepository {
	return &GuestMigrationRepository{database: database}
}

// ImportGuestData creates all records and the idempotency ledger row in one transaction.
func (repositoryInstance *GuestMigrationRepository) ImportGuestData(
	ctx context.Context,
	userID string,
	migrationID string,
	items []domain.Item,
	plannedPurchases []domain.PlannedPurchase,
	valueEquivalents []domain.ValueEquivalent,
) (domain.GuestMigrationResult, error) {
	normalizedUserID, identityError := requireSQLiteUserID(userID)
	if identityError != nil {
		return domain.GuestMigrationResult{}, identityError
	}
	normalizedMigrationID := strings.TrimSpace(migrationID)
	if normalizedMigrationID == "" {
		return domain.GuestMigrationResult{}, domain.ErrInvalidGuestMigrationID
	}

	var result domain.GuestMigrationResult
	transactionError := repositoryInstance.database.WithContext(ctx).Transaction(func(transaction *gorm.DB) error {
		var importedItems int
		var importedPlannedPurchases int
		var importedValueEquivalents int
		existingError := transaction.Raw(`
			SELECT imported_items, imported_planned_purchases, imported_value_equivalents
			FROM guest_migrations
			WHERE user_id = ? AND migration_id = ?
		`, normalizedUserID, normalizedMigrationID).Row().Scan(
			&importedItems,
			&importedPlannedPurchases,
			&importedValueEquivalents,
		)
		if existingError == nil {
			result = domain.GuestMigrationResult{
				ImportedItems:            importedItems,
				ImportedPlannedPurchases: importedPlannedPurchases,
				ImportedValueEquivalents: importedValueEquivalents,
				AlreadyImported:          true,
			}
			return nil
		}
		if !errors.Is(existingError, sql.ErrNoRows) {
			return fmt.Errorf("read guest migration ledger: %w", existingError)
		}

		itemRepository := &ItemRepository{database: transaction}
		plannedPurchaseRepository := &PlannedPurchaseRepository{database: transaction}
		valueEquivalentRepository := &ValueEquivalentRepository{database: transaction}
		categoryRepository := &CategoryRepository{database: transaction}
		brandRepository := &BrandRepository{database: transaction}

		for _, item := range items {
			item.UserID = normalizedUserID

			if item.Category != nil && strings.TrimSpace(*item.Category) != "" {
				category, categoryError := categoryRepository.FindOrCreate(ctx, normalizedUserID, *item.Category)
				if categoryError != nil {
					return fmt.Errorf("resolve guest item category: %w", categoryError)
				}
				item.CategoryID = &category.ID
				item.Category = &category.Name
			}
			if item.Brand != nil && strings.TrimSpace(*item.Brand) != "" {
				brand, brandError := brandRepository.FindOrCreate(ctx, normalizedUserID, *item.Brand)
				if brandError != nil {
					return fmt.Errorf("resolve guest item brand: %w", brandError)
				}
				item.BrandID = &brand.ID
				item.Brand = &brand.Name
			}

			if _, createError := itemRepository.Create(ctx, normalizedUserID, item); createError != nil {
				return fmt.Errorf("import guest item: %w", createError)
			}
		}

		for _, plannedPurchase := range plannedPurchases {
			if _, createError := plannedPurchaseRepository.Create(ctx, normalizedUserID, plannedPurchase); createError != nil {
				return fmt.Errorf("import guest planned purchase: %w", createError)
			}
		}

		for _, equivalent := range valueEquivalents {
			if _, createError := valueEquivalentRepository.Create(ctx, normalizedUserID, equivalent); createError != nil {
				return fmt.Errorf("import guest value equivalent: %w", createError)
			}
		}

		result = domain.GuestMigrationResult{
			ImportedItems:            len(items),
			ImportedPlannedPurchases: len(plannedPurchases),
			ImportedValueEquivalents: len(valueEquivalents),
		}
		ledgerResult := transaction.Exec(`
			INSERT INTO guest_migrations (
				user_id,
				migration_id,
				imported_items,
				imported_planned_purchases,
				imported_value_equivalents,
				created_at
			)
			VALUES (?, ?, ?, ?, ?, ?)
		`,
			normalizedUserID,
			normalizedMigrationID,
			result.ImportedItems,
			result.ImportedPlannedPurchases,
			result.ImportedValueEquivalents,
			time.Now().UTC().Format(time.RFC3339Nano),
		)
		if ledgerResult.Error != nil {
			return fmt.Errorf("record guest migration ledger: %w", ledgerResult.Error)
		}

		return nil
	})
	if transactionError != nil {
		return domain.GuestMigrationResult{}, transactionError
	}

	return result, nil
}
