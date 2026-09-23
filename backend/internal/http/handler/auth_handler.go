package handler

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"cost-per-day/backend/internal/domain"
	"cost-per-day/backend/internal/service"
	"cost-per-day/backend/internal/http/middleware"
	"cost-per-day/backend/internal/http/response"
)

const (
	oidcStateCookieName = "cost_per_day_oidc_state"
	oidcStateLifetime   = 10 * time.Minute
)

// AuthHandlerConfig contains HTTP cookie and redirect settings.
type AuthHandlerConfig struct {
	AuthService    *service.AuthService
	SessionSecret  string
	AppBaseURL     string
	SecureCookies  bool
}

// AuthHandler owns Google browser redirects and app-session cookies at the Gin boundary.
type AuthHandler struct {
	authService   *service.AuthService
	sessionSecret []byte
	appBaseURL    string
	secureCookies bool
}

// NewAuthHandler validates and creates the authentication HTTP handler.
func NewAuthHandler(config AuthHandlerConfig) (*AuthHandler, error) {
	if config.AuthService == nil {
		return nil, fmt.Errorf("auth service is required")
	}
	sessionSecret := []byte(strings.TrimSpace(config.SessionSecret))
	if len(sessionSecret) < 32 {
		return nil, fmt.Errorf("session secret must contain at least 32 characters")
	}
	appBaseURL := strings.TrimRight(strings.TrimSpace(config.AppBaseURL), "/")
	if appBaseURL == "" {
		return nil, fmt.Errorf("app base URL is required")
	}
	if _, parseError := url.ParseRequestURI(appBaseURL); parseError != nil {
		return nil, fmt.Errorf("invalid app base URL: %w", parseError)
	}

	return &AuthHandler{
		authService:   config.AuthService,
		sessionSecret: sessionSecret,
		appBaseURL:    appBaseURL,
		secureCookies: config.SecureCookies,
	}, nil
}

// Login handles GET /auth/google/login.
func (handlerInstance *AuthHandler) Login(ginContext *gin.Context) {
	state, stateError := randomBrowserToken(24)
	if stateError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to start authentication")
		return
	}
	nonce, nonceError := randomBrowserToken(24)
	if nonceError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to start authentication")
		return
	}

	loginState := oauthLoginState{
		State: state,
		Nonce: nonce,
		Expiry: time.Now().UTC().Add(oidcStateLifetime).Unix(),
	}
	signedState, signError := handlerInstance.signLoginState(loginState)
	if signError != nil {
		response.Error(ginContext, http.StatusInternalServerError, "failed to start authentication")
		return
	}

	http.SetCookie(ginContext.Writer, &http.Cookie{
		Name:     oidcStateCookieName,
		Value:    signedState,
		Path:     "/auth/google/callback",
		MaxAge:   int(oidcStateLifetime.Seconds()),
		HttpOnly: true,
		Secure:   handlerInstance.secureCookies,
		SameSite: http.SameSiteLaxMode,
	})

	ginContext.Redirect(http.StatusFound, handlerInstance.authService.GoogleAuthorizationURL(state, nonce))
}

// Callback handles GET /auth/google/callback and always returns a browser redirect.
func (handlerInstance *AuthHandler) Callback(ginContext *gin.Context) {
	if ginContext.Query("error") != "" {
		handlerInstance.clearOIDCStateCookie(ginContext)
		handlerInstance.redirectAuthenticationFailure(ginContext)
		return
	}

	stateCookie, cookieError := ginContext.Cookie(oidcStateCookieName)
	if cookieError != nil {
		handlerInstance.redirectAuthenticationFailure(ginContext)
		return
	}

	loginState, stateError := handlerInstance.verifyLoginState(stateCookie)
	if stateError != nil || loginState.Expiry <= time.Now().UTC().Unix() {
		handlerInstance.clearOIDCStateCookie(ginContext)
		handlerInstance.redirectAuthenticationFailure(ginContext)
		return
	}

	returnedState := ginContext.Query("state")
	if returnedState == "" || !hmac.Equal([]byte(returnedState), []byte(loginState.State)) {
		handlerInstance.clearOIDCStateCookie(ginContext)
		handlerInstance.redirectAuthenticationFailure(ginContext)
		return
	}

	_, sessionToken, expiresAt, loginError := handlerInstance.authService.CompleteGoogleLogin(
		ginContext.Request.Context(),
		ginContext.Query("code"),
		loginState.Nonce,
	)
	if loginError != nil {
		handlerInstance.clearOIDCStateCookie(ginContext)
		handlerInstance.redirectAuthenticationFailure(ginContext)
		return
	}

	handlerInstance.clearOIDCStateCookie(ginContext)
	http.SetCookie(ginContext.Writer, &http.Cookie{
		Name:     middleware.DefaultSessionCookieName,
		Value:    sessionToken,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
		HttpOnly: true,
		Secure:   handlerInstance.secureCookies,
		SameSite: http.SameSiteLaxMode,
	})
	ginContext.Redirect(http.StatusFound, handlerInstance.appBaseURL)
}

// Logout handles POST /auth/logout and invalidates the app-owned session.
func (handlerInstance *AuthHandler) Logout(ginContext *gin.Context) {
	sessionToken, cookieError := ginContext.Cookie(middleware.DefaultSessionCookieName)
	if cookieError == nil {
		if logoutError := handlerInstance.authService.Logout(ginContext.Request.Context(), sessionToken); logoutError != nil {
			response.Error(ginContext, http.StatusInternalServerError, "failed to log out")
			return
		}
	}

	handlerInstance.clearSessionCookie(ginContext)
	response.SuccessWithoutData(ginContext, http.StatusOK, "logged out successfully")
}

// Me handles GET /api/me using the local user ID established by authentication middleware.
func (handlerInstance *AuthHandler) Me(ginContext *gin.Context) {
	userID, authenticated := authenticatedUserID(ginContext)
	if !authenticated {
		return
	}

	user, userError := handlerInstance.authService.GetUser(ginContext.Request.Context(), userID)
	if userError != nil {
		if errors.Is(userError, domain.ErrUserNotFound) {
			response.Error(ginContext, http.StatusUnauthorized, domain.ErrUserIdentityRequired.Error())
			return
		}
		response.Error(ginContext, http.StatusInternalServerError, "failed to retrieve current user")
		return
	}

	response.Success(ginContext, http.StatusOK, "current user retrieved successfully", gin.H{
		"id":          user.ID,
		"email":       user.Email,
		"displayName": user.DisplayName,
		"avatarUrl":   user.AvatarURL,
	})
}

type oauthLoginState struct {
	State  string `json:"state"`
	Nonce  string `json:"nonce"`
	Expiry int64  `json:"exp"`
}

func (handlerInstance *AuthHandler) signLoginState(state oauthLoginState) (string, error) {
	payload, marshalError := json.Marshal(state)
	if marshalError != nil {
		return "", marshalError
	}
	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, handlerInstance.sessionSecret)
	_, _ = mac.Write([]byte(encodedPayload))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return encodedPayload + "." + signature, nil
}

func (handlerInstance *AuthHandler) verifyLoginState(encodedState string) (oauthLoginState, error) {
	parts := strings.Split(encodedState, ".")
	if len(parts) != 2 {
		return oauthLoginState{}, fmt.Errorf("invalid oauth state cookie")
	}

	mac := hmac.New(sha256.New, handlerInstance.sessionSecret)
	_, _ = mac.Write([]byte(parts[0]))
	expectedSignature := mac.Sum(nil)
	providedSignature, decodeError := base64.RawURLEncoding.DecodeString(parts[1])
	if decodeError != nil || !hmac.Equal(expectedSignature, providedSignature) {
		return oauthLoginState{}, fmt.Errorf("invalid oauth state signature")
	}

	payload, payloadError := base64.RawURLEncoding.DecodeString(parts[0])
	if payloadError != nil {
		return oauthLoginState{}, payloadError
	}
	var state oauthLoginState
	if unmarshalError := json.Unmarshal(payload, &state); unmarshalError != nil {
		return oauthLoginState{}, unmarshalError
	}
	if strings.TrimSpace(state.State) == "" || strings.TrimSpace(state.Nonce) == "" {
		return oauthLoginState{}, fmt.Errorf("invalid oauth state payload")
	}
	return state, nil
}

func randomBrowserToken(byteCount int) (string, error) {
	buffer := make([]byte, byteCount)
	if _, readError := rand.Read(buffer); readError != nil {
		return "", readError
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func (handlerInstance *AuthHandler) clearOIDCStateCookie(ginContext *gin.Context) {
	http.SetCookie(ginContext.Writer, &http.Cookie{
		Name:     oidcStateCookieName,
		Value:    "",
		Path:     "/auth/google/callback",
		MaxAge:   -1,
		Expires:  time.Unix(1, 0),
		HttpOnly: true,
		Secure:   handlerInstance.secureCookies,
		SameSite: http.SameSiteLaxMode,
	})
}

func (handlerInstance *AuthHandler) clearSessionCookie(ginContext *gin.Context) {
	http.SetCookie(ginContext.Writer, &http.Cookie{
		Name:     middleware.DefaultSessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(1, 0),
		HttpOnly: true,
		Secure:   handlerInstance.secureCookies,
		SameSite: http.SameSiteLaxMode,
	})
}

func (handlerInstance *AuthHandler) redirectAuthenticationFailure(ginContext *gin.Context) {
	ginContext.Redirect(http.StatusFound, handlerInstance.appBaseURL+"/?auth=failed")
}
