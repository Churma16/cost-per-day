package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/service"
)

type fakeUserRepository struct {
	byID  map[string]domain.User
	bySub map[string]string
}

func newFakeUserRepository() *fakeUserRepository {
	return &fakeUserRepository{
		byID:  make(map[string]domain.User),
		bySub: make(map[string]string),
	}
}

func (repositoryInstance *fakeUserRepository) GetByID(_ context.Context, userID string) (domain.User, error) {
	user, exists := repositoryInstance.byID[userID]
	if !exists {
		return domain.User{}, domain.ErrUserNotFound
	}
	return user, nil
}

func (repositoryInstance *fakeUserRepository) FindOrCreateGoogleUser(_ context.Context, candidate domain.User) (domain.User, error) {
	if existingID, exists := repositoryInstance.bySub[candidate.GoogleSub]; exists {
		existing := repositoryInstance.byID[existingID]
		existing.Email = candidate.Email
		existing.DisplayName = candidate.DisplayName
		existing.AvatarURL = candidate.AvatarURL
		repositoryInstance.byID[existingID] = existing
		return existing, nil
	}

	repositoryInstance.bySub[candidate.GoogleSub] = candidate.ID
	repositoryInstance.byID[candidate.ID] = candidate
	return candidate, nil
}

type fakeSessionRepository struct {
	sessions map[string]domain.Session
}

func newFakeSessionRepository() *fakeSessionRepository {
	return &fakeSessionRepository{sessions: make(map[string]domain.Session)}
}

func (repositoryInstance *fakeSessionRepository) Create(_ context.Context, session domain.Session) error {
	repositoryInstance.sessions[session.TokenHash] = session
	return nil
}

func (repositoryInstance *fakeSessionRepository) GetUserIDByTokenHash(
	_ context.Context,
	tokenHash string,
	now time.Time,
) (string, error) {
	session, exists := repositoryInstance.sessions[tokenHash]
	if !exists || !session.ExpiresAt.After(now) {
		return "", domain.ErrSessionNotFound
	}
	return session.UserID, nil
}

func (repositoryInstance *fakeSessionRepository) DeleteByTokenHash(_ context.Context, tokenHash string) error {
	delete(repositoryInstance.sessions, tokenHash)
	return nil
}

type fakeGoogleIdentityProvider struct {
	identity service.GoogleIdentity
}

func (provider *fakeGoogleIdentityProvider) AuthorizationURL(state string, nonce string) string {
	return "https://accounts.example/authorize?state=" + state + "&nonce=" + nonce
}

func (provider *fakeGoogleIdentityProvider) ExchangeAndVerify(
	_ context.Context,
	_ string,
	_ string,
) (service.GoogleIdentity, error) {
	return provider.identity, nil
}

func TestAuthServiceMapsGoogleSubjectToOneLocalUserAndOwnsSessions(t *testing.T) {
	userRepository := newFakeUserRepository()
	sessionRepository := newFakeSessionRepository()
	provider := &fakeGoogleIdentityProvider{
		identity: service.GoogleIdentity{
			Subject:     "google-subject-123",
			Email:       "first@example.com",
			DisplayName: "First Profile",
			AvatarURL:   "https://example.com/avatar.png",
		},
	}
	authService := service.NewAuthService(userRepository, sessionRepository, provider)

	firstUser, firstToken, _, firstLoginError := authService.CompleteGoogleLogin(
		context.Background(),
		"first-code",
		"first-nonce",
	)
	if firstLoginError != nil {
		t.Fatalf("first login failed: %v", firstLoginError)
	}
	if firstUser.ID == "" || firstUser.GoogleSub != provider.identity.Subject {
		t.Fatalf("unexpected first user: %+v", firstUser)
	}
	if firstToken == "" {
		t.Fatal("expected an application session token")
	}

	provider.identity.Email = "updated@example.com"
	provider.identity.DisplayName = "Updated Profile"
	secondUser, secondToken, _, secondLoginError := authService.CompleteGoogleLogin(
		context.Background(),
		"second-code",
		"second-nonce",
	)
	if secondLoginError != nil {
		t.Fatalf("second login failed: %v", secondLoginError)
	}

	if secondUser.ID != firstUser.ID {
		t.Fatalf("same Google subject created a second local user: %q != %q", secondUser.ID, firstUser.ID)
	}
	if len(userRepository.byID) != 1 {
		t.Fatalf("expected exactly one local user, got %d", len(userRepository.byID))
	}
	if secondUser.Email != "updated@example.com" {
		t.Fatalf("expected provider profile refresh, got %q", secondUser.Email)
	}
	if secondToken == firstToken {
		t.Fatal("separate logins must create separate opaque application sessions")
	}
	if _, rawTokenWasPersisted := sessionRepository.sessions[firstToken]; rawTokenWasPersisted {
		t.Fatal("raw application session token must not be persisted")
	}

	authenticatedUser, authenticationError := authService.AuthenticateSession(context.Background(), firstToken)
	if authenticationError != nil {
		t.Fatalf("authenticate session: %v", authenticationError)
	}
	if authenticatedUser.ID != firstUser.ID {
		t.Fatalf("session resolved to wrong user: %q", authenticatedUser.ID)
	}

	if logoutError := authService.Logout(context.Background(), firstToken); logoutError != nil {
		t.Fatalf("logout failed: %v", logoutError)
	}
	if _, authenticationError = authService.AuthenticateSession(context.Background(), firstToken); !errors.Is(authenticationError, domain.ErrSessionNotFound) {
		t.Fatalf("expected logged-out session to be invalid, got %v", authenticationError)
	}
}

func TestAuthServiceReturningAdoptedHistoricalUserKeepsLocalID(t *testing.T) {
	userRepository := newFakeUserRepository()
	historicalUserID := "legacy"
	providerSubject := "already-adopted-google-sub"
	userRepository.byID[historicalUserID] = domain.User{
		ID:        historicalUserID,
		GoogleSub: providerSubject,
		Email:     "old@example.com",
	}
	userRepository.bySub[providerSubject] = historicalUserID

	sessionRepository := newFakeSessionRepository()
	provider := &fakeGoogleIdentityProvider{
		identity: service.GoogleIdentity{
			Subject:     providerSubject,
			Email:       "current@example.com",
			DisplayName: "Returning User",
		},
	}
	authService := service.NewAuthService(userRepository, sessionRepository, provider)

	user, sessionToken, _, loginError := authService.CompleteGoogleLogin(
		context.Background(),
		"returning-code",
		"returning-nonce",
	)
	if loginError != nil {
		t.Fatalf("returning login failed: %v", loginError)
	}
	if user.ID != historicalUserID {
		t.Fatalf("expected existing local ID %q to remain unchanged, got %q", historicalUserID, user.ID)
	}
	if user.Email != "current@example.com" || user.DisplayName != "Returning User" {
		t.Fatalf("expected returning profile to refresh, got %+v", user)
	}
	if len(userRepository.byID) != 1 {
		t.Fatalf("expected returning identity to reuse one local user, got %d", len(userRepository.byID))
	}
	if sessionToken == "" {
		t.Fatal("expected returning login to create an application session")
	}
}
