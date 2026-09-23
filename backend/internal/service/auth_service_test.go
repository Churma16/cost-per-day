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
	byID                    map[string]domain.User
	bySub                   map[string]string
	legacyBootstrapRequired bool
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

func (repositoryInstance *fakeUserRepository) NeedsLegacyOwnerBootstrap(_ context.Context) (bool, error) {
	return repositoryInstance.legacyBootstrapRequired, nil
}

func (repositoryInstance *fakeUserRepository) BindGoogleIdentity(_ context.Context, userID string, candidate domain.User) (domain.User, error) {
	existing, exists := repositoryInstance.byID[userID]
	if !exists {
		return domain.User{}, domain.ErrUserNotFound
	}
	if existing.GoogleSub != "" && existing.GoogleSub != candidate.GoogleSub {
		return domain.User{}, domain.ErrInvalidExternalIdentity
	}
	if mappedUserID, exists := repositoryInstance.bySub[candidate.GoogleSub]; exists && mappedUserID != userID {
		return domain.User{}, domain.ErrInvalidExternalIdentity
	}
	existing.GoogleSub = candidate.GoogleSub
	existing.Email = candidate.Email
	existing.DisplayName = candidate.DisplayName
	existing.AvatarURL = candidate.AvatarURL
	repositoryInstance.byID[userID] = existing
	repositoryInstance.bySub[candidate.GoogleSub] = userID
	repositoryInstance.legacyBootstrapRequired = false
	return existing, nil
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
	authService := service.NewAuthService(userRepository, sessionRepository, provider, "")

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


func TestAuthServiceControlledLegacyOwnerBootstrapBindsVerifiedSubject(t *testing.T) {
	userRepository := newFakeUserRepository()
	userRepository.byID[domain.LegacyUserID] = domain.User{ID: domain.LegacyUserID}
	userRepository.legacyBootstrapRequired = true
	sessionRepository := newFakeSessionRepository()
	provider := &fakeGoogleIdentityProvider{
		identity: service.GoogleIdentity{
			Subject:     "configured-owner-sub",
			Email:       "owner@example.com",
			DisplayName: "Owner",
		},
	}

	authService := service.NewAuthService(
		userRepository,
		sessionRepository,
		provider,
		"configured-owner-sub",
	)

	user, _, _, loginError := authService.CompleteGoogleLogin(context.Background(), "code", "nonce")
	if loginError != nil {
		t.Fatalf("bootstrap login failed: %v", loginError)
	}
	if user.ID != domain.LegacyUserID {
		t.Fatalf("expected configured subject to adopt legacy user, got %q", user.ID)
	}
	if user.GoogleSub != "configured-owner-sub" {
		t.Fatalf("expected verified Google subject to be bound, got %q", user.GoogleSub)
	}

	provider.identity.Subject = "unconfigured-sub"
	otherUser, _, _, otherLoginError := authService.CompleteGoogleLogin(context.Background(), "code", "nonce")
	if otherLoginError != nil {
		t.Fatalf("normal login failed: %v", otherLoginError)
	}
	if otherUser.ID == domain.LegacyUserID {
		t.Fatal("unconfigured subject must not adopt legacy ownership")
	}
}


func TestAuthServiceRejectsUnsafeLoginAndConfigurationWhenLegacyDataIsUnclaimed(t *testing.T) {
	userRepository := newFakeUserRepository()
	userRepository.byID[domain.LegacyUserID] = domain.User{ID: domain.LegacyUserID}
	userRepository.legacyBootstrapRequired = true
	sessionRepository := newFakeSessionRepository()
	provider := &fakeGoogleIdentityProvider{
		identity: service.GoogleIdentity{
			Subject: "owner-sub",
			Email:   "owner@example.com",
		},
	}

	withoutBootstrap := service.NewAuthService(userRepository, sessionRepository, provider, "")
	if validationError := withoutBootstrap.ValidateConfiguration(context.Background()); !errors.Is(validationError, domain.ErrLegacyOwnerBootstrapRequired) {
		t.Fatalf("expected startup validation to require legacy bootstrap, got %v", validationError)
	}
	if _, _, _, loginError := withoutBootstrap.CompleteGoogleLogin(context.Background(), "code", "nonce"); !errors.Is(loginError, domain.ErrLegacyOwnerBootstrapRequired) {
		t.Fatalf("expected unsafe first login to be rejected, got %v", loginError)
	}
	if len(userRepository.bySub) != 0 {
		t.Fatalf("unsafe login must not create a competing Google user: %v", userRepository.bySub)
	}

	withWrongBootstrap := service.NewAuthService(userRepository, sessionRepository, provider, "different-owner-sub")
	if validationError := withWrongBootstrap.ValidateConfiguration(context.Background()); validationError != nil {
		t.Fatalf("configured bootstrap should allow startup validation, got %v", validationError)
	}
	if _, _, _, loginError := withWrongBootstrap.CompleteGoogleLogin(context.Background(), "code", "nonce"); !errors.Is(loginError, domain.ErrLegacyOwnerBootstrapRequired) {
		t.Fatalf("expected non-matching subject to be rejected while legacy data is unclaimed, got %v", loginError)
	}
	if len(userRepository.bySub) != 0 {
		t.Fatalf("mismatched bootstrap login must not create a competing user: %v", userRepository.bySub)
	}
}
