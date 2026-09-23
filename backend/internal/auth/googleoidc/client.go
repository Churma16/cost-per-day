package googleoidc

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"time"

	"cost-per-day/backend/internal/service"
)

const (
	defaultAuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth"
	defaultTokenEndpoint         = "https://oauth2.googleapis.com/token"
	defaultJWKSURL               = "https://www.googleapis.com/oauth2/v3/certs"
	googleIssuerHTTPS            = "https://accounts.google.com"
	googleIssuerLegacy           = "accounts.google.com"
)

// Config contains the Google OIDC client configuration. Endpoint overrides exist for isolated tests only.
type Config struct {
	ClientID              string
	ClientSecret          string
	RedirectURI           string
	HTTPClient            *http.Client
	AuthorizationEndpoint string
	TokenEndpoint         string
	JWKSURL               string
	Now                   func() time.Time
}

// Client implements the Google OIDC application port without introducing provider tokens into domain code.
type Client struct {
	clientID              string
	clientSecret          string
	redirectURI           string
	httpClient            *http.Client
	authorizationEndpoint string
	tokenEndpoint         string
	jwksURL               string
	now                   func() time.Time
}

// NewClient validates and creates a Google-only OIDC client.
func NewClient(config Config) (*Client, error) {
	clientID := strings.TrimSpace(config.ClientID)
	clientSecret := strings.TrimSpace(config.ClientSecret)
	redirectURI := strings.TrimSpace(config.RedirectURI)
	if clientID == "" || clientSecret == "" || redirectURI == "" {
		return nil, fmt.Errorf("google client id, client secret, and redirect URI are required")
	}

	httpClient := config.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}

	authorizationEndpoint := strings.TrimSpace(config.AuthorizationEndpoint)
	if authorizationEndpoint == "" {
		authorizationEndpoint = defaultAuthorizationEndpoint
	}
	tokenEndpoint := strings.TrimSpace(config.TokenEndpoint)
	if tokenEndpoint == "" {
		tokenEndpoint = defaultTokenEndpoint
	}
	jwksURL := strings.TrimSpace(config.JWKSURL)
	if jwksURL == "" {
		jwksURL = defaultJWKSURL
	}
	now := config.Now
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}

	return &Client{
		clientID:              clientID,
		clientSecret:          clientSecret,
		redirectURI:           redirectURI,
		httpClient:            httpClient,
		authorizationEndpoint: authorizationEndpoint,
		tokenEndpoint:         tokenEndpoint,
		jwksURL:               jwksURL,
		now:                   now,
	}, nil
}

// AuthorizationURL builds the Google authorization redirect with state and nonce protection.
func (client *Client) AuthorizationURL(state string, nonce string) string {
	query := url.Values{}
	query.Set("client_id", client.clientID)
	query.Set("redirect_uri", client.redirectURI)
	query.Set("response_type", "code")
	query.Set("scope", "openid email profile")
	query.Set("state", state)
	query.Set("nonce", nonce)
	query.Set("include_granted_scopes", "true")
	return client.authorizationEndpoint + "?" + query.Encode()
}

// ExchangeAndVerify exchanges an authorization code and validates the returned Google ID token.
func (client *Client) ExchangeAndVerify(
	ctx context.Context,
	code string,
	expectedNonce string,
) (service.GoogleIdentity, error) {
	if strings.TrimSpace(code) == "" || strings.TrimSpace(expectedNonce) == "" {
		return service.GoogleIdentity{}, fmt.Errorf("authorization code and nonce are required")
	}

	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", client.clientID)
	form.Set("client_secret", client.clientSecret)
	form.Set("redirect_uri", client.redirectURI)
	form.Set("grant_type", "authorization_code")

	request, requestError := http.NewRequestWithContext(ctx, http.MethodPost, client.tokenEndpoint, strings.NewReader(form.Encode()))
	if requestError != nil {
		return service.GoogleIdentity{}, fmt.Errorf("create google token request: %w", requestError)
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.Header.Set("Accept", "application/json")

	response, responseError := client.httpClient.Do(request)
	if responseError != nil {
		return service.GoogleIdentity{}, fmt.Errorf("exchange google authorization code: %w", responseError)
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		_, _ = io.Copy(io.Discard, response.Body)
		return service.GoogleIdentity{}, fmt.Errorf("google token exchange failed with status %d", response.StatusCode)
	}

	var tokenPayload struct {
		IDToken string `json:"id_token"`
	}
	if decodeError := json.NewDecoder(response.Body).Decode(&tokenPayload); decodeError != nil {
		return service.GoogleIdentity{}, fmt.Errorf("decode google token response: %w", decodeError)
	}
	if strings.TrimSpace(tokenPayload.IDToken) == "" {
		return service.GoogleIdentity{}, fmt.Errorf("google token response did not include an id token")
	}

	return client.verifyIDToken(ctx, tokenPayload.IDToken, expectedNonce)
}

type idTokenHeader struct {
	Algorithm string `json:"alg"`
	KeyID     string `json:"kid"`
}

type idTokenClaims struct {
	Issuer        string          `json:"iss"`
	Audience      json.RawMessage `json:"aud"`
	AuthorizedParty string        `json:"azp"`
	Subject       string          `json:"sub"`
	ExpiresAt     int64           `json:"exp"`
	IssuedAt      int64           `json:"iat"`
	Nonce         string          `json:"nonce"`
	Email         string          `json:"email"`
	DisplayName   string          `json:"name"`
	AvatarURL     string          `json:"picture"`
}

func (client *Client) verifyIDToken(
	ctx context.Context,
	rawToken string,
	expectedNonce string,
) (service.GoogleIdentity, error) {
	parts := strings.Split(rawToken, ".")
	if len(parts) != 3 {
		return service.GoogleIdentity{}, fmt.Errorf("invalid google id token")
	}

	headerBytes, headerError := base64.RawURLEncoding.DecodeString(parts[0])
	if headerError != nil {
		return service.GoogleIdentity{}, fmt.Errorf("decode google id token header: %w", headerError)
	}
	var header idTokenHeader
	if unmarshalError := json.Unmarshal(headerBytes, &header); unmarshalError != nil {
		return service.GoogleIdentity{}, fmt.Errorf("parse google id token header: %w", unmarshalError)
	}
	if header.Algorithm != "RS256" || strings.TrimSpace(header.KeyID) == "" {
		return service.GoogleIdentity{}, fmt.Errorf("unsupported google id token signature")
	}

	publicKey, keyError := client.fetchSigningKey(ctx, header.KeyID)
	if keyError != nil {
		return service.GoogleIdentity{}, keyError
	}

	signature, signatureError := base64.RawURLEncoding.DecodeString(parts[2])
	if signatureError != nil {
		return service.GoogleIdentity{}, fmt.Errorf("decode google id token signature: %w", signatureError)
	}
	signedContent := parts[0] + "." + parts[1]
	digest := sha256.Sum256([]byte(signedContent))
	if verificationError := rsa.VerifyPKCS1v15(publicKey, crypto.SHA256, digest[:], signature); verificationError != nil {
		return service.GoogleIdentity{}, fmt.Errorf("verify google id token signature: %w", verificationError)
	}

	claimBytes, claimError := base64.RawURLEncoding.DecodeString(parts[1])
	if claimError != nil {
		return service.GoogleIdentity{}, fmt.Errorf("decode google id token claims: %w", claimError)
	}
	var claims idTokenClaims
	if unmarshalError := json.Unmarshal(claimBytes, &claims); unmarshalError != nil {
		return service.GoogleIdentity{}, fmt.Errorf("parse google id token claims: %w", unmarshalError)
	}

	if claims.Issuer != googleIssuerHTTPS && claims.Issuer != googleIssuerLegacy {
		return service.GoogleIdentity{}, fmt.Errorf("invalid google id token issuer")
	}
	audiences, audienceError := parseAudience(claims.Audience)
	if audienceError != nil || !containsAudience(audiences, client.clientID) {
		return service.GoogleIdentity{}, fmt.Errorf("invalid google id token audience")
	}
	if claims.AuthorizedParty != "" && claims.AuthorizedParty != client.clientID {
		return service.GoogleIdentity{}, fmt.Errorf("invalid google id token authorized party")
	}
	if len(audiences) > 1 && claims.AuthorizedParty == "" {
		return service.GoogleIdentity{}, fmt.Errorf("google id token authorized party is required for multiple audiences")
	}

	now := client.now().UTC()
	if claims.ExpiresAt <= now.Unix() {
		return service.GoogleIdentity{}, fmt.Errorf("google id token is expired")
	}
	if claims.IssuedAt > now.Add(5*time.Minute).Unix() {
		return service.GoogleIdentity{}, fmt.Errorf("google id token issued-at is invalid")
	}
	if claims.Nonce != expectedNonce {
		return service.GoogleIdentity{}, fmt.Errorf("google id token nonce mismatch")
	}
	if strings.TrimSpace(claims.Subject) == "" {
		return service.GoogleIdentity{}, fmt.Errorf("google id token subject is missing")
	}

	return service.GoogleIdentity{
		Subject:     claims.Subject,
		Email:       claims.Email,
		DisplayName: claims.DisplayName,
		AvatarURL:   claims.AvatarURL,
	}, nil
}

type jwksDocument struct {
	Keys []jwk `json:"keys"`
}

type jwk struct {
	KeyType   string `json:"kty"`
	KeyID     string `json:"kid"`
	Algorithm string `json:"alg"`
	Modulus   string `json:"n"`
	Exponent  string `json:"e"`
}

func (client *Client) fetchSigningKey(ctx context.Context, keyID string) (*rsa.PublicKey, error) {
	request, requestError := http.NewRequestWithContext(ctx, http.MethodGet, client.jwksURL, nil)
	if requestError != nil {
		return nil, fmt.Errorf("create google jwks request: %w", requestError)
	}
	request.Header.Set("Accept", "application/json")

	response, responseError := client.httpClient.Do(request)
	if responseError != nil {
		return nil, fmt.Errorf("fetch google jwks: %w", responseError)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("google jwks request failed with status %d", response.StatusCode)
	}

	var document jwksDocument
	if decodeError := json.NewDecoder(response.Body).Decode(&document); decodeError != nil {
		return nil, fmt.Errorf("decode google jwks: %w", decodeError)
	}

	for _, candidate := range document.Keys {
		if candidate.KeyID != keyID || candidate.KeyType != "RSA" {
			continue
		}
		if candidate.Algorithm != "" && candidate.Algorithm != "RS256" {
			continue
		}

		modulusBytes, modulusError := base64.RawURLEncoding.DecodeString(candidate.Modulus)
		if modulusError != nil {
			return nil, fmt.Errorf("decode google jwk modulus: %w", modulusError)
		}
		exponentBytes, exponentError := base64.RawURLEncoding.DecodeString(candidate.Exponent)
		if exponentError != nil {
			return nil, fmt.Errorf("decode google jwk exponent: %w", exponentError)
		}
		exponent := 0
		for _, exponentByte := range exponentBytes {
			exponent = exponent<<8 + int(exponentByte)
		}
		if exponent <= 0 {
			return nil, fmt.Errorf("invalid google jwk exponent")
		}

		return &rsa.PublicKey{
			N: new(big.Int).SetBytes(modulusBytes),
			E: exponent,
		}, nil
	}

	return nil, fmt.Errorf("google signing key %q not found", keyID)
}

func parseAudience(rawAudience json.RawMessage) ([]string, error) {
	if len(rawAudience) == 0 {
		return nil, fmt.Errorf("missing audience")
	}

	var singleAudience string
	if unmarshalError := json.Unmarshal(rawAudience, &singleAudience); unmarshalError == nil {
		return []string{singleAudience}, nil
	}

	var multipleAudiences []string
	if unmarshalError := json.Unmarshal(rawAudience, &multipleAudiences); unmarshalError != nil {
		return nil, unmarshalError
	}
	return multipleAudiences, nil
}

func containsAudience(audiences []string, expectedAudience string) bool {
	for _, audience := range audiences {
		if audience == expectedAudience {
			return true
		}
	}
	return false
}

