package sqlite_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"cost-per-day/backend/internal/domain"
	sqliterepository "cost-per-day/backend/internal/repository/sqlite"
)

func TestGoogleUserMappingUsesSubjectAndReusesLocalUser(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	ctx := context.Background()
	userRepository := sqliterepository.NewUserRepository(databaseConnection)

	first, firstError := userRepository.FindOrCreateGoogleUser(ctx, domain.User{
		ID:          "user-first",
		GoogleSub:   "google-sub-123",
		Email:       "first@example.com",
		DisplayName: "First",
	})
	if firstError != nil {
		t.Fatalf("create first Google user: %v", firstError)
	}

	second, secondError := userRepository.FindOrCreateGoogleUser(ctx, domain.User{
		ID:          "user-should-not-be-created",
		GoogleSub:   "google-sub-123",
		Email:       "renamed@example.com",
		DisplayName: "Renamed",
	})
	if secondError != nil {
		t.Fatalf("reuse Google user: %v", secondError)
	}

	if second.ID != first.ID {
		t.Fatalf("expected stable local user for Google subject, got %q and %q", first.ID, second.ID)
	}
	if second.Email != "renamed@example.com" || second.DisplayName != "Renamed" {
		t.Fatalf("expected current provider profile to be refreshed, got %+v", second)
	}

	var mappedUserCount int
	if queryError := databaseConnection.QueryRowContext(
		ctx,
		"SELECT COUNT(*) FROM users WHERE google_sub = ?",
		"google-sub-123",
	).Scan(&mappedUserCount); queryError != nil {
		t.Fatalf("count Google subject mappings: %v", queryError)
	}
	if mappedUserCount != 1 {
		t.Fatalf("expected exactly one local mapping, got %d", mappedUserCount)
	}
}

func TestSQLiteSessionRepositoryCreatesResolvesExpiresAndDeletesSessions(t *testing.T) {
	databaseConnection, _ := openTestDatabase(t)
	ctx := context.Background()
	userRepository := sqliterepository.NewUserRepository(databaseConnection)
	sessionRepository := sqliterepository.NewSessionRepository(databaseConnection)

	user, userError := userRepository.FindOrCreateGoogleUser(ctx, domain.User{
		ID:        "session-user",
		GoogleSub: "session-google-sub",
		Email:     "session@example.com",
	})
	if userError != nil {
		t.Fatalf("create session user: %v", userError)
	}

	now := time.Now().UTC()
	if createError := sessionRepository.Create(ctx, domain.Session{
		TokenHash: "hashed-session-token",
		UserID:    user.ID,
		CreatedAt: now,
		ExpiresAt: now.Add(time.Hour),
	}); createError != nil {
		t.Fatalf("create session: %v", createError)
	}

	resolvedUserID, resolveError := sessionRepository.GetUserIDByTokenHash(ctx, "hashed-session-token", now)
	if resolveError != nil {
		t.Fatalf("resolve session: %v", resolveError)
	}
	if resolvedUserID != user.ID {
		t.Fatalf("expected user %q, got %q", user.ID, resolvedUserID)
	}

	if _, expiredError := sessionRepository.GetUserIDByTokenHash(ctx, "hashed-session-token", now.Add(2*time.Hour)); !errors.Is(expiredError, domain.ErrSessionNotFound) {
		t.Fatalf("expected expired session to be rejected, got %v", expiredError)
	}

	if deleteError := sessionRepository.DeleteByTokenHash(ctx, "hashed-session-token"); deleteError != nil {
		t.Fatalf("delete session: %v", deleteError)
	}
	if _, deletedError := sessionRepository.GetUserIDByTokenHash(ctx, "hashed-session-token", now); !errors.Is(deletedError, domain.ErrSessionNotFound) {
		t.Fatalf("expected deleted session to be rejected, got %v", deletedError)
	}
}
