package repository

import (
	"context"
	"time"

	"cost-per-day/backend/internal/domain"
)

// ItemRepository defines the persistence contract for user-owned item operations.
type ItemRepository interface {
	List(ctx context.Context, userID string) ([]domain.Item, error)
	GetByID(ctx context.Context, userID string, itemID string) (domain.Item, error)
	Create(ctx context.Context, userID string, item domain.Item) (domain.Item, error)
	Update(ctx context.Context, userID string, item domain.Item) (domain.Item, error)
	Delete(ctx context.Context, userID string, itemID string) error
	ReplaceAll(ctx context.Context, userID string, items []domain.Item) ([]domain.Item, error)
}

// SettingsRepository defines the persistence contract for user-owned application preferences.
type SettingsRepository interface {
	GetAll(ctx context.Context, userID string) (map[string]string, error)
	GetByKey(ctx context.Context, userID string, key string) (string, error)
	Set(ctx context.Context, userID string, key string, value string) error
}

// UserRepository maps Google identities to application-owned local users.
type UserRepository interface {
	GetByID(ctx context.Context, userID string) (domain.User, error)
	FindOrCreateGoogleUser(ctx context.Context, candidate domain.User) (domain.User, error)
	BindGoogleIdentity(ctx context.Context, userID string, candidate domain.User) (domain.User, error)
}

// SessionRepository stores opaque application sessions by token hash.
type SessionRepository interface {
	Create(ctx context.Context, session domain.Session) error
	GetUserIDByTokenHash(ctx context.Context, tokenHash string, now time.Time) (string, error)
	DeleteByTokenHash(ctx context.Context, tokenHash string) error
}
