package main

import (
	"context"
	"testing"

	"cost-per-day/backend/internal/domain"
)

type developmentUserRepository struct {
	candidate domain.User
}

func (repositoryInstance *developmentUserRepository) GetByID(_ context.Context, userID string) (domain.User, error) {
	if repositoryInstance.candidate.ID != userID {
		return domain.User{}, domain.ErrUserNotFound
	}
	return repositoryInstance.candidate, nil
}

func (repositoryInstance *developmentUserRepository) FindOrCreateGoogleUser(_ context.Context, candidate domain.User) (domain.User, error) {
	repositoryInstance.candidate = candidate
	return candidate, nil
}

func TestEnsureDevelopmentUserUsesExplicitDevelopmentIdentity(t *testing.T) {
	userRepository := &developmentUserRepository{}

	user, userError := ensureDevelopmentUser(context.Background(), userRepository)
	if userError != nil {
		t.Fatalf("ensure development user: %v", userError)
	}
	if user.ID != developmentUserID {
		t.Fatalf("expected development user ID %q, got %q", developmentUserID, user.ID)
	}
	if user.ID == domain.LegacyUserID {
		t.Fatal("development auth must not reuse the historical legacy owner")
	}
	if user.GoogleSub != developmentIdentitySub {
		t.Fatalf("expected explicit development identity subject %q, got %q", developmentIdentitySub, user.GoogleSub)
	}
	if user.Email != developmentUserEmail || user.DisplayName != developmentUserName {
		t.Fatalf("unexpected development profile: %+v", user)
	}
}
