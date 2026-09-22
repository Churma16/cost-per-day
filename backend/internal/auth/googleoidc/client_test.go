package googleoidc

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestClientAuthorizationURLAndIDTokenVerificationWithoutGoogleNetwork(t *testing.T) {
	privateKey, keyError := rsa.GenerateKey(rand.Reader, 2048)
	if keyError != nil {
		t.Fatalf("generate test RSA key: %v", keyError)
	}

	fixedNow := time.Date(2026, time.September, 22, 16, 0, 0, 0, time.UTC)
	idToken := signTestIDToken(t, privateKey, "test-key", map[string]any{
		"iss":     googleIssuerHTTPS,
		"aud":     "test-client-id",
		"sub":     "google-subject-verified",
		"exp":     fixedNow.Add(time.Hour).Unix(),
		"iat":     fixedNow.Add(-time.Minute).Unix(),
		"nonce":   "expected-nonce",
		"email":   "verified@example.com",
		"name":    "Verified User",
		"picture": "https://example.com/avatar.png",
	})

	testServer := httptest.NewServer(http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/token":
			if request.Method != http.MethodPost {
				t.Errorf("expected token POST, got %s", request.Method)
			}
			if parseError := request.ParseForm(); parseError != nil {
				t.Errorf("parse token form: %v", parseError)
			}
			if request.Form.Get("code") != "valid-code" ||
				request.Form.Get("client_id") != "test-client-id" ||
				request.Form.Get("client_secret") != "test-client-secret" ||
				request.Form.Get("grant_type") != "authorization_code" {
				t.Errorf("unexpected token form: %v", request.Form)
			}
			responseWriter.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(responseWriter).Encode(map[string]string{"id_token": idToken})
		case "/jwks":
			responseWriter.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(responseWriter).Encode(map[string]any{
				"keys": []map[string]string{{
					"kty": "RSA",
					"kid": "test-key",
					"alg": "RS256",
					"n":   base64.RawURLEncoding.EncodeToString(privateKey.PublicKey.N.Bytes()),
					"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(privateKey.PublicKey.E)).Bytes()),
				}},
			})
		default:
			http.NotFound(responseWriter, request)
		}
	}))
	defer testServer.Close()

	client, clientError := NewClient(Config{
		ClientID:              "test-client-id",
		ClientSecret:          "test-client-secret",
		RedirectURI:           "http://localhost:8080/auth/google/callback",
		HTTPClient:            testServer.Client(),
		AuthorizationEndpoint: testServer.URL + "/authorize",
		TokenEndpoint:         testServer.URL + "/token",
		JWKSURL:               testServer.URL + "/jwks",
		Now:                   func() time.Time { return fixedNow },
	})
	if clientError != nil {
		t.Fatalf("create Google OIDC client: %v", clientError)
	}

	authorizationURL, authorizationURLError := url.Parse(client.AuthorizationURL("state-value", "expected-nonce"))
	if authorizationURLError != nil {
		t.Fatalf("parse authorization URL: %v", authorizationURLError)
	}
	if authorizationURL.Query().Get("state") != "state-value" ||
		authorizationURL.Query().Get("nonce") != "expected-nonce" ||
		authorizationURL.Query().Get("scope") != "openid email profile" {
		t.Fatalf("authorization URL is missing OIDC protections: %s", authorizationURL.String())
	}

	identity, verificationError := client.ExchangeAndVerify(context.Background(), "valid-code", "expected-nonce")
	if verificationError != nil {
		t.Fatalf("exchange and verify Google identity: %v", verificationError)
	}
	if identity.Subject != "google-subject-verified" ||
		identity.Email != "verified@example.com" ||
		identity.DisplayName != "Verified User" {
		t.Fatalf("unexpected verified identity: %+v", identity)
	}

	if _, nonceError := client.ExchangeAndVerify(context.Background(), "valid-code", "wrong-nonce"); nonceError == nil ||
		!strings.Contains(nonceError.Error(), "nonce mismatch") {
		t.Fatalf("expected nonce mismatch to be rejected, got %v", nonceError)
	}
}

func signTestIDToken(t *testing.T, privateKey *rsa.PrivateKey, keyID string, claims map[string]any) string {
	t.Helper()

	headerBytes, headerError := json.Marshal(map[string]string{
		"alg": "RS256",
		"kid": keyID,
		"typ": "JWT",
	})
	if headerError != nil {
		t.Fatalf("marshal test JWT header: %v", headerError)
	}
	claimBytes, claimError := json.Marshal(claims)
	if claimError != nil {
		t.Fatalf("marshal test JWT claims: %v", claimError)
	}

	header := base64.RawURLEncoding.EncodeToString(headerBytes)
	payload := base64.RawURLEncoding.EncodeToString(claimBytes)
	signingInput := header + "." + payload
	digest := sha256.Sum256([]byte(signingInput))
	signature, signatureError := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, digest[:])
	if signatureError != nil {
		t.Fatalf("sign test JWT: %v", signatureError)
	}

	return fmt.Sprintf("%s.%s", signingInput, base64.RawURLEncoding.EncodeToString(signature))
}
