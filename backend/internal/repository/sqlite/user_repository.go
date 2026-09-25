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

// UserRepository implements local user persistence and Google subject mapping in SQLite through GORM.
type UserRepository struct {
	database *gorm.DB
}

// NewUserRepository creates a GORM-backed user repository.
func NewUserRepository(database *gorm.DB) repository.UserRepository {
	return &UserRepository{database: database}
}

// GetByID returns one local user by the application-owned identifier.
func (repositoryInstance *UserRepository) GetByID(ctx context.Context, userID string) (domain.User, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return domain.User{}, domain.ErrUserNotFound
	}

	user, scanError := scanUser(repositoryInstance.database.WithContext(ctx).Raw(`
		SELECT id, google_sub, email, display_name, avatar_url, created_at, updated_at
		FROM users
		WHERE id = ?
	`, normalizedUserID).Row())
	if errors.Is(scanError, sql.ErrNoRows) {
		return domain.User{}, domain.ErrUserNotFound
	}
	if scanError != nil {
		return domain.User{}, scanError
	}

	return user, nil
}

// FindOrCreateGoogleUser atomically reuses the local user mapped to a Google subject or creates it on first login.
func (repositoryInstance *UserRepository) FindOrCreateGoogleUser(ctx context.Context, candidate domain.User) (domain.User, error) {
	candidate.ID = strings.TrimSpace(candidate.ID)
	candidate.GoogleSub = strings.TrimSpace(candidate.GoogleSub)
	candidate.Email = strings.TrimSpace(candidate.Email)
	candidate.DisplayName = strings.TrimSpace(candidate.DisplayName)
	candidate.AvatarURL = strings.TrimSpace(candidate.AvatarURL)
	if candidate.ID == "" || candidate.GoogleSub == "" {
		return domain.User{}, domain.ErrInvalidExternalIdentity
	}

	now := time.Now().UTC()
	if candidate.CreatedAt.IsZero() {
		candidate.CreatedAt = now
	} else {
		candidate.CreatedAt = candidate.CreatedAt.UTC()
	}
	candidate.UpdatedAt = now

	transaction := repositoryInstance.database.WithContext(ctx).Begin()
	if transaction.Error != nil {
		return domain.User{}, fmt.Errorf("begin google user mapping: %w", transaction.Error)
	}
	defer transaction.Rollback()

	insertResult := transaction.Exec(`
		INSERT OR IGNORE INTO users (
			id, google_sub, email, display_name, avatar_url, created_at, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`,
		candidate.ID,
		candidate.GoogleSub,
		candidate.Email,
		candidate.DisplayName,
		candidate.AvatarURL,
		candidate.CreatedAt.Format(time.RFC3339Nano),
		candidate.UpdatedAt.Format(time.RFC3339Nano),
	)
	if insertResult.Error != nil {
		return domain.User{}, fmt.Errorf("create google user: %w", insertResult.Error)
	}

	updateResult := transaction.Exec(`
		UPDATE users
		SET email = ?, display_name = ?, avatar_url = ?, updated_at = ?
		WHERE google_sub = ?
	`,
		candidate.Email,
		candidate.DisplayName,
		candidate.AvatarURL,
		candidate.UpdatedAt.Format(time.RFC3339Nano),
		candidate.GoogleSub,
	)
	if updateResult.Error != nil {
		return domain.User{}, fmt.Errorf("refresh google user profile: %w", updateResult.Error)
	}

	user, scanError := scanUser(transaction.Raw(`
		SELECT id, google_sub, email, display_name, avatar_url, created_at, updated_at
		FROM users
		WHERE google_sub = ?
	`, candidate.GoogleSub).Row())
	if scanError != nil {
		return domain.User{}, fmt.Errorf("read google user mapping: %w", scanError)
	}

	if commitResult := transaction.Commit(); commitResult.Error != nil {
		return domain.User{}, fmt.Errorf("commit google user mapping: %w", commitResult.Error)
	}

	return user, nil
}

type userScanner interface {
	Scan(destinations ...any) error
}

func scanUser(scanner userScanner) (domain.User, error) {
	var (
		user          domain.User
		googleSub     sql.NullString
		createdAtText string
		updatedAtText string
	)

	if scanError := scanner.Scan(
		&user.ID,
		&googleSub,
		&user.Email,
		&user.DisplayName,
		&user.AvatarURL,
		&createdAtText,
		&updatedAtText,
	); scanError != nil {
		return domain.User{}, scanError
	}

	if googleSub.Valid {
		user.GoogleSub = googleSub.String
	}

	createdAt, createdAtError := time.Parse(time.RFC3339Nano, createdAtText)
	if createdAtError != nil {
		return domain.User{}, fmt.Errorf("parse user created timestamp: %w", createdAtError)
	}
	updatedAt, updatedAtError := time.Parse(time.RFC3339Nano, updatedAtText)
	if updatedAtError != nil {
		return domain.User{}, fmt.Errorf("parse user updated timestamp: %w", updatedAtError)
	}

	user.CreatedAt = createdAt.UTC()
	user.UpdatedAt = updatedAt.UTC()
	return user, nil
}
