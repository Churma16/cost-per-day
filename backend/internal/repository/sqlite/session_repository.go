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

// SessionRepository implements application session persistence in SQLite through GORM.
type SessionRepository struct {
	database *gorm.DB
}

// NewSessionRepository creates a GORM-backed session repository.
func NewSessionRepository(database *gorm.DB) repository.SessionRepository {
	return &SessionRepository{database: database}
}

// Create stores a new opaque session token hash and removes already-expired sessions.
func (repositoryInstance *SessionRepository) Create(ctx context.Context, session domain.Session) error {
	session.TokenHash = strings.TrimSpace(session.TokenHash)
	session.UserID = strings.TrimSpace(session.UserID)
	if session.TokenHash == "" || session.UserID == "" || session.ExpiresAt.IsZero() {
		return domain.ErrSessionNotFound
	}
	if session.CreatedAt.IsZero() {
		session.CreatedAt = time.Now().UTC()
	}

	transaction := repositoryInstance.database.WithContext(ctx).Begin()
	if transaction.Error != nil {
		return fmt.Errorf("begin session creation: %w", transaction.Error)
	}
	defer transaction.Rollback()

	cleanupResult := transaction.Exec(
		"DELETE FROM auth_sessions WHERE expires_at <= ?",
		session.CreatedAt.UTC().Format(time.RFC3339Nano),
	)
	if cleanupResult.Error != nil {
		return fmt.Errorf("delete expired sessions: %w", cleanupResult.Error)
	}

	insertResult := transaction.Exec(`
		INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at)
		VALUES (?, ?, ?, ?)
	`,
		session.TokenHash,
		session.UserID,
		session.CreatedAt.UTC().Format(time.RFC3339Nano),
		session.ExpiresAt.UTC().Format(time.RFC3339Nano),
	)
	if insertResult.Error != nil {
		return fmt.Errorf("create session: %w", insertResult.Error)
	}

	if commitResult := transaction.Commit(); commitResult.Error != nil {
		return fmt.Errorf("commit session creation: %w", commitResult.Error)
	}
	return nil
}

// GetUserIDByTokenHash resolves a non-expired session to its local user ID.
func (repositoryInstance *SessionRepository) GetUserIDByTokenHash(ctx context.Context, tokenHash string, now time.Time) (string, error) {
	normalizedHash := strings.TrimSpace(tokenHash)
	if normalizedHash == "" {
		return "", domain.ErrSessionNotFound
	}

	var userID string
	scanError := repositoryInstance.database.WithContext(ctx).Raw(`
		SELECT user_id
		FROM auth_sessions
		WHERE token_hash = ? AND expires_at > ?
	`, normalizedHash, now.UTC().Format(time.RFC3339Nano)).Row().Scan(&userID)
	if errors.Is(scanError, sql.ErrNoRows) {
		return "", domain.ErrSessionNotFound
	}
	if scanError != nil {
		return "", fmt.Errorf("resolve session: %w", scanError)
	}
	return userID, nil
}

// DeleteByTokenHash invalidates a session. Missing sessions are intentionally idempotent.
func (repositoryInstance *SessionRepository) DeleteByTokenHash(ctx context.Context, tokenHash string) error {
	normalizedHash := strings.TrimSpace(tokenHash)
	if normalizedHash == "" {
		return nil
	}
	deleteResult := repositoryInstance.database.WithContext(ctx).Exec(
		"DELETE FROM auth_sessions WHERE token_hash = ?",
		normalizedHash,
	)
	if deleteResult.Error != nil {
		return fmt.Errorf("delete session: %w", deleteResult.Error)
	}
	return nil
}
