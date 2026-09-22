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

// SessionRepository implements application session persistence in SQLite.
type SessionRepository struct {
	databaseConnection *sql.DB
}

// NewSessionRepository creates a SQLite-backed session repository.
func NewSessionRepository(databaseConnection *sql.DB) repository.SessionRepository {
	return &SessionRepository{databaseConnection: databaseConnection}
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

	transaction, beginError := repositoryInstance.databaseConnection.BeginTx(ctx, nil)
	if beginError != nil {
		return fmt.Errorf("begin session creation: %w", beginError)
	}
	defer transaction.Rollback()

	if _, cleanupError := transaction.ExecContext(ctx,
		"DELETE FROM auth_sessions WHERE expires_at <= ?",
		session.CreatedAt.UTC().Format(time.RFC3339Nano),
	); cleanupError != nil {
		return fmt.Errorf("delete expired sessions: %w", cleanupError)
	}

	if _, insertError := transaction.ExecContext(ctx, `
		INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at)
		VALUES (?, ?, ?, ?)
	`,
		session.TokenHash,
		session.UserID,
		session.CreatedAt.UTC().Format(time.RFC3339Nano),
		session.ExpiresAt.UTC().Format(time.RFC3339Nano),
	); insertError != nil {
		return fmt.Errorf("create session: %w", insertError)
	}

	if commitError := transaction.Commit(); commitError != nil {
		return fmt.Errorf("commit session creation: %w", commitError)
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
	scanError := repositoryInstance.databaseConnection.QueryRowContext(ctx, `
		SELECT user_id
		FROM auth_sessions
		WHERE token_hash = ? AND expires_at > ?
	`, normalizedHash, now.UTC().Format(time.RFC3339Nano)).Scan(&userID)
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
	if _, deleteError := repositoryInstance.databaseConnection.ExecContext(
		ctx,
		"DELETE FROM auth_sessions WHERE token_hash = ?",
		normalizedHash,
	); deleteError != nil {
		return fmt.Errorf("delete session: %w", deleteError)
	}
	return nil
}
