package repository

import (
	"context"

	"cost-per-day/backend/internal/domain"
)

// ItemRepository defines the persistence contract for item operations.
type ItemRepository interface {
	List(ctx context.Context) ([]domain.Item, error)
	GetByID(ctx context.Context, id string) (domain.Item, error)
	Create(ctx context.Context, item domain.Item) (domain.Item, error)
	Update(ctx context.Context, item domain.Item) (domain.Item, error)
	Delete(ctx context.Context, id string) error
}

// SettingsRepository defines the persistence contract for application preferences.
type SettingsRepository interface {
	GetAll(ctx context.Context) (map[string]string, error)
	GetByKey(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string) error
}
