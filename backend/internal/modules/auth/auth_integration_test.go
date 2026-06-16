package auth

import (
	"context"
	"errors"
	"testing"

	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func TestVerifyOTP_WrongAttemptsThenBurn(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	phone := "09120000001"

	code, err := requestOTP(ctx, db, phone)
	if err != nil {
		t.Fatalf("requestOTP: %v", err)
	}
	const wrong = "00000" // real codes are 10000-99999, so this is always wrong
	if code == wrong {
		t.Fatal("generated code collided with the test's wrong code")
	}

	// otpMaxAttempts wrong tries: the last one burns the code.
	for i := 1; i < otpMaxAttempts; i++ {
		if _, err := verifyOTP(ctx, db, phone, wrong); !errors.Is(err, ErrOTPInvalid) {
			t.Fatalf("attempt %d: got %v, want ErrOTPInvalid", i, err)
		}
	}
	if _, err := verifyOTP(ctx, db, phone, wrong); !errors.Is(err, ErrOTPBurned) {
		t.Fatalf("final attempt should burn: got %v", err)
	}
	// Once burned, even the correct code no longer works.
	if _, err := verifyOTP(ctx, db, phone, code); !errors.Is(err, ErrOTPNotFound) {
		t.Fatalf("after burn the correct code must fail: got %v", err)
	}
}

func TestVerifyOTP_NewThenExisting(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	phone := "09120000002"

	code, err := requestOTP(ctx, db, phone)
	if err != nil {
		t.Fatal(err)
	}
	res, err := verifyOTP(ctx, db, phone, code)
	if err != nil {
		t.Fatal(err)
	}
	if res.status != "new" {
		t.Fatalf("unknown phone: status = %q, want new", res.status)
	}

	if _, err := registerUser(ctx, db, registerInput{phone: phone, firstName: "A", lastName: "B"}); err != nil {
		t.Fatalf("registerUser: %v", err)
	}

	code2, _ := requestOTP(ctx, db, phone)
	res2, err := verifyOTP(ctx, db, phone, code2)
	if err != nil {
		t.Fatal(err)
	}
	if res2.status != "existing" || res2.userID == "" {
		t.Fatalf("registered phone: res = %+v, want existing with a userID", res2)
	}
}

func TestVerifyOTP_Expired(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	phone := "09120000003"

	// An expired (but unused) code must be treated as not found.
	if _, err := db.Exec(ctx,
		"INSERT INTO otp_codes (id, phone, code, expires_at) VALUES ($1, $2, '12345', NOW() - INTERVAL '1 minute')",
		generateID(), phone); err != nil {
		t.Fatal(err)
	}
	if _, err := verifyOTP(ctx, db, phone, "12345"); !errors.Is(err, ErrOTPNotFound) {
		t.Fatalf("expired code: got %v, want ErrOTPNotFound", err)
	}
}

func TestRequestOTP_RateLimited(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	phone := "09120000004"

	for i := range otpRateLimit {
		if _, err := requestOTP(ctx, db, phone); err != nil {
			t.Fatalf("request %d should succeed: %v", i+1, err)
		}
	}
	if _, err := requestOTP(ctx, db, phone); !errors.Is(err, ErrRateLimited) {
		t.Fatalf("request %d should be rate limited: got %v", otpRateLimit+1, err)
	}
}
