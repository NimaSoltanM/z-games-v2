package middleware

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestMain(m *testing.M) {
	os.Setenv("JWT_SECRET", "test-secret-test-secret-test-secret-1234")
	os.Exit(m.Run())
}

func TestAuthToken_RoundTrip(t *testing.T) {
	tok, err := SignAuthToken("user-1", "09120000000")
	if err != nil {
		t.Fatal(err)
	}
	uid, err := verifyAuthToken(tok)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if uid != "user-1" {
		t.Fatalf("userID = %q, want user-1", uid)
	}
}

func TestRegistrationToken_RoundTrip(t *testing.T) {
	reg, err := SignRegistrationToken("09121112222")
	if err != nil {
		t.Fatal(err)
	}
	phone, err := VerifyRegistrationToken(reg)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if phone != "09121112222" {
		t.Fatalf("phone = %q", phone)
	}
}

func TestTokenTypesAreNotInterchangeable(t *testing.T) {
	auth, _ := SignAuthToken("u", "09120000000")
	reg, _ := SignRegistrationToken("09120000000")

	if _, err := verifyAuthToken(reg); err == nil {
		t.Error("auth verify must reject a registration token")
	}
	if _, err := VerifyRegistrationToken(auth); err == nil {
		t.Error("registration verify must reject an auth token")
	}
}

func TestAuthToken_RejectsTampered(t *testing.T) {
	tok, _ := SignAuthToken("user-1", "09120000000")
	if _, err := verifyAuthToken(tok + "tampered"); err == nil {
		t.Fatal("tampered token must be rejected")
	}
}

func TestAuthToken_RejectsWrongSecret(t *testing.T) {
	tok, _ := SignAuthToken("user-1", "09120000000")
	os.Setenv("JWT_SECRET", "a-totally-different-secret-key-000000000")
	defer os.Setenv("JWT_SECRET", "test-secret-test-secret-test-secret-1234")
	if _, err := verifyAuthToken(tok); err == nil {
		t.Fatal("token must fail to verify under a different secret")
	}
}

func TestAuthToken_RejectsExpired(t *testing.T) {
	claims := jwt.MapClaims{"userId": "u", "type": "auth", "exp": time.Now().Add(-time.Hour).Unix()}
	tok, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret())
	if _, err := verifyAuthToken(tok); err == nil {
		t.Fatal("expired token must be rejected")
	}
}

func TestAuthToken_RejectsAlgNone(t *testing.T) {
	// The classic "alg=none" downgrade attack must not be accepted.
	claims := jwt.MapClaims{"userId": "u", "type": "auth", "exp": time.Now().Add(time.Hour).Unix()}
	tok, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := verifyAuthToken(tok); err == nil {
		t.Fatal("alg=none token must be rejected")
	}
}

func TestAuthToken_RejectsMissingUserID(t *testing.T) {
	claims := jwt.MapClaims{"type": "auth", "exp": time.Now().Add(time.Hour).Unix()}
	tok, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret())
	if _, err := verifyAuthToken(tok); err == nil {
		t.Fatal("token without a userId must be rejected")
	}
}
