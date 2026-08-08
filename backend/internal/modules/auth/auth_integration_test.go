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

	issued, err := requestOTP(ctx, db, phone)
	if err != nil {
		t.Fatalf("requestOTP: %v", err)
	}
	code := issued.code
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

	issued, err := requestOTP(ctx, db, phone)
	if err != nil {
		t.Fatal(err)
	}
	code := issued.code
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

	issued2, _ := requestOTP(ctx, db, phone)
	res2, err := verifyOTP(ctx, db, phone, issued2.code)
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

func TestRequestOTPInvalidatesPreviousCode(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	phone := "09120000006"

	first, err := requestOTP(ctx, db, phone)
	if err != nil {
		t.Fatalf("first requestOTP: %v", err)
	}
	second, err := requestOTP(ctx, db, phone)
	if err != nil {
		t.Fatalf("second requestOTP: %v", err)
	}
	var firstWasUsed bool
	var firstSecretScrubbed bool
	if err := db.QueryRow(ctx, "SELECT used_at IS NOT NULL, code IS NULL FROM otp_codes WHERE id = $1", first.id).Scan(&firstWasUsed, &firstSecretScrubbed); err != nil {
		t.Fatalf("fetch first OTP state: %v", err)
	}
	if !firstWasUsed {
		t.Fatal("first OTP remained active after requesting a replacement")
	}
	if !firstSecretScrubbed {
		t.Fatal("first OTP secret remained stored after requesting a replacement")
	}
	if _, err := verifyOTP(ctx, db, phone, second.code); err != nil {
		t.Fatalf("latest code should verify: %v", err)
	}
}

func TestCleanupOTPs_ScrubsExpiredAndDeletesRetainedRows(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)

	expiredID := generateID()
	if _, err := db.Exec(ctx, `
		INSERT INTO otp_codes (id, phone, code, expires_at, created_at)
		VALUES ($1, '09120000007', '12345', NOW() - INTERVAL '1 minute', NOW() - INTERVAL '10 minutes')
	`, expiredID); err != nil {
		t.Fatal(err)
	}
	oldID := generateID()
	if _, err := db.Exec(ctx, `
		INSERT INTO otp_codes (id, phone, code, expires_at, used_at, created_at)
		VALUES ($1, '09120000008', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
	`, oldID); err != nil {
		t.Fatal(err)
	}

	scrubbed, deleted, err := cleanupOTPs(ctx, db)
	if err != nil {
		t.Fatal(err)
	}
	if scrubbed != 1 || deleted != 1 {
		t.Fatalf("cleanup counts = (%d scrubbed, %d deleted), want (1, 1)", scrubbed, deleted)
	}
	var secretScrubbed, markedUsed bool
	if err := db.QueryRow(ctx, "SELECT code IS NULL, used_at IS NOT NULL FROM otp_codes WHERE id=$1", expiredID).Scan(&secretScrubbed, &markedUsed); err != nil {
		t.Fatal(err)
	}
	if !secretScrubbed || !markedUsed {
		t.Fatal("expired OTP was not scrubbed and marked used")
	}
	var oldExists bool
	if err := db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM otp_codes WHERE id=$1)", oldID).Scan(&oldExists); err != nil {
		t.Fatal(err)
	}
	if oldExists {
		t.Fatal("retained OTP row older than 24 hours was not deleted")
	}
}

func TestDiscardOTPRemovesUndeliveredCode(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	phone := "09120000005"

	issued, err := requestOTP(ctx, db, phone)
	if err != nil {
		t.Fatalf("requestOTP: %v", err)
	}
	if err := discardOTP(ctx, db, issued.id); err != nil {
		t.Fatalf("discardOTP: %v", err)
	}
	if _, err := verifyOTP(ctx, db, phone, issued.code); !errors.Is(err, ErrOTPNotFound) {
		t.Fatalf("discarded code verification error = %v, want ErrOTPNotFound", err)
	}

	// A provider failure must not consume the per-phone request budget.
	for i := range otpRateLimit {
		if _, err := requestOTP(ctx, db, phone); err != nil {
			t.Fatalf("request %d after discard should succeed: %v", i+1, err)
		}
	}
}
