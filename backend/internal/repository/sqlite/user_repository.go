package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

// UserRepository implements local user persistence and Google subject mapping in SQLite.
type UserRepository struct {
	databaseConnection *sql.DB
}

// NewUserRepository creates a SQLite-backed user repository.
func NewUserRepository(databaseConnection *sql.DB) repository.UserRepository {
	return &UserRepository{databaseConnection: databaseConnection}
}

// GetByID returns one local user by the application-owned identifier.
func (repositoryInstance *UserRepository) GetByID(ctx context.Context, userID string) (domain.User, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return domain.User{}, domain.ErrUserNotFound
	}

	user, scanError := scanUser(repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		SELECT id, google_sub, email, display_name, avatar_url, created_at, updated_at
		FROM users
		WHERE id = ?
	`, normalizedUserID))
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

	transaction, beginError := repositoryInstance.databaseConnection.BeginTx(ctx, nil)
	if beginError != nil {
		return domain.User{}, fmt.Errorf("begin google user mapping: %w", beginError)
	}
	defer transaction.Rollback()

	_, insertError := transaction.ExecContext(ctx, `
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
	if insertError != nil {
		return domain.User{}, fmt.Errorf("create google user: %w", insertError)
	}

	if _, updateError := transaction.ExecContext(ctx, `
		UPDATE users
		SET email = ?, display_name = ?, avatar_url = ?, updated_at = ?
		WHERE google_sub = ?
	`,
		candidate.Email,
		candidate.DisplayName,
		candidate.AvatarURL,
		candidate.UpdatedAt.Format(time.RFC3339Nano),
		candidate.GoogleSub,
	); updateError != nil {
		return domain.User{}, fmt.Errorf("refresh google user profile: %w", updateError)
	}

	user, scanError := scanUser(transaction.QueryRowContext(ctx, `
		SELECT id, google_sub, email, display_name, avatar_url, created_at, updated_at
		FROM users
		WHERE google_sub = ?
	`, candidate.GoogleSub))
	if scanError != nil {
		return domain.User{}, fmt.Errorf("read google user mapping: %w", scanError)
	}

	if commitError := transaction.Commit(); commitError != nil {
		return domain.User{}, fmt.Errorf("commit google user mapping: %w", commitError)
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
