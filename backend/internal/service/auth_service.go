package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strings"
	"time"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/repository"
)

const applicationSessionLifetime = 30 * 24 * time.Hour

// GoogleIdentity contains the verified profile claims needed to map a Google identity to a local user.
type GoogleIdentity struct {
	Subject     string
	Email       string
	DisplayName string
	AvatarURL   string
}

// GoogleIdentityProvider is the application port implemented by the Google OIDC adapter.
type GoogleIdentityProvider interface {
	AuthorizationURL(state string, nonce string) string
	ExchangeAndVerify(ctx context.Context, code string, expectedNonce string) (GoogleIdentity, error)
}

// AuthService owns local user mapping and application session lifecycle.
type AuthService struct {
	userRepository    repository.UserRepository
	sessionRepository repository.SessionRepository
	googleProvider        GoogleIdentityProvider
	legacyOwnerGoogleSub string
	now                   func() time.Time
}

// NewAuthService creates the authentication application service.
func NewAuthService(
	userRepository repository.UserRepository,
	sessionRepository repository.SessionRepository,
	googleProvider GoogleIdentityProvider,
	legacyOwnerGoogleSub string,
) *AuthService {
	return &AuthService{
		userRepository:       userRepository,
		sessionRepository:    sessionRepository,
		googleProvider:       googleProvider,
		legacyOwnerGoogleSub: strings.TrimSpace(legacyOwnerGoogleSub),
		now:                  func() time.Time { return time.Now().UTC() },
	}
}

// GoogleAuthorizationURL builds the provider redirect without exposing provider tokens to domain code.
func (serviceInstance *AuthService) GoogleAuthorizationURL(state string, nonce string) string {
	return serviceInstance.googleProvider.AuthorizationURL(state, nonce)
}

// CompleteGoogleLogin validates Google identity, finds or creates the local user, and creates an app-owned session.
func (serviceInstance *AuthService) CompleteGoogleLogin(
	ctx context.Context,
	code string,
	expectedNonce string,
) (domain.User, string, time.Time, error) {
	identity, providerError := serviceInstance.googleProvider.ExchangeAndVerify(ctx, strings.TrimSpace(code), strings.TrimSpace(expectedNonce))
	if providerError != nil {
		return domain.User{}, "", time.Time{}, providerError
	}

	identity.Subject = strings.TrimSpace(identity.Subject)
	if identity.Subject == "" {
		return domain.User{}, "", time.Time{}, domain.ErrInvalidExternalIdentity
	}

	candidate := domain.User{
		GoogleSub:   identity.Subject,
		Email:       strings.TrimSpace(identity.Email),
		DisplayName: strings.TrimSpace(identity.DisplayName),
		AvatarURL:   strings.TrimSpace(identity.AvatarURL),
	}

	var (
		user      domain.User
		userError error
	)
	if serviceInstance.legacyOwnerGoogleSub != "" && identity.Subject == serviceInstance.legacyOwnerGoogleSub {
		user, userError = serviceInstance.userRepository.BindGoogleIdentity(ctx, domain.LegacyUserID, candidate)
	} else {
		userID, identifierError := randomToken(18)
		if identifierError != nil {
			return domain.User{}, "", time.Time{}, identifierError
		}
		candidate.ID = "usr_" + userID
		user, userError = serviceInstance.userRepository.FindOrCreateGoogleUser(ctx, candidate)
	}
	if userError != nil {
		return domain.User{}, "", time.Time{}, userError
	}

	sessionToken, tokenError := randomToken(32)
	if tokenError != nil {
		return domain.User{}, "", time.Time{}, tokenError
	}

	now := serviceInstance.now().UTC()
	expiresAt := now.Add(applicationSessionLifetime)
	if sessionError := serviceInstance.sessionRepository.Create(ctx, domain.Session{
		TokenHash: hashSessionToken(sessionToken),
		UserID:    user.ID,
		CreatedAt: now,
		ExpiresAt: expiresAt,
	}); sessionError != nil {
		return domain.User{}, "", time.Time{}, sessionError
	}

	return user, sessionToken, expiresAt, nil
}

// AuthenticateSession resolves an opaque browser token to the current local user.
func (serviceInstance *AuthService) AuthenticateSession(ctx context.Context, sessionToken string) (domain.User, error) {
	normalizedToken := strings.TrimSpace(sessionToken)
	if normalizedToken == "" {
		return domain.User{}, domain.ErrSessionNotFound
	}

	userID, sessionError := serviceInstance.sessionRepository.GetUserIDByTokenHash(
		ctx,
		hashSessionToken(normalizedToken),
		serviceInstance.now().UTC(),
	)
	if sessionError != nil {
		return domain.User{}, sessionError
	}
	return serviceInstance.userRepository.GetByID(ctx, userID)
}

// GetUser retrieves the local profile after the transport boundary has already authenticated the request.
func (serviceInstance *AuthService) GetUser(ctx context.Context, userID string) (domain.User, error) {
	return serviceInstance.userRepository.GetByID(ctx, strings.TrimSpace(userID))
}

// Logout invalidates the current application session.
func (serviceInstance *AuthService) Logout(ctx context.Context, sessionToken string) error {
	normalizedToken := strings.TrimSpace(sessionToken)
	if normalizedToken == "" {
		return nil
	}
	return serviceInstance.sessionRepository.DeleteByTokenHash(ctx, hashSessionToken(normalizedToken))
}

func randomToken(byteCount int) (string, error) {
	randomBytes := make([]byte, byteCount)
	if _, readError := rand.Read(randomBytes); readError != nil {
		return "", readError
	}
	return base64.RawURLEncoding.EncodeToString(randomBytes), nil
}

func hashSessionToken(sessionToken string) string {
	tokenHash := sha256.Sum256([]byte(sessionToken))
	return hex.EncodeToString(tokenHash[:])
}
