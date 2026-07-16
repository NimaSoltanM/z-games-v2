package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	otpExpiryMinutes       = 5
	otpRateLimit           = 3
	otpRateLimitWindowMins = 10
	otpMaxAttempts         = 3
)

var (
	ErrRateLimited = errors.New("RATE_LIMITED")
	ErrOTPNotFound = errors.New("OTP_NOT_FOUND")
	ErrOTPInvalid  = errors.New("OTP_INVALID")
	ErrOTPBurned   = errors.New("OTP_BURNED")
)

var iranianMobilePattern = regexp.MustCompile(`^09\d{9}$`)

func generateID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand failing means the platform's RNG is broken — there is no
		// safe way to mint an ID, so fail loudly rather than risk a weak/empty one.
		panic(fmt.Sprintf("crypto/rand failed: %v", err))
	}
	return hex.EncodeToString(b)
}

func generateOTPCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(90000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%05d", n.Int64()+10000), nil
}

func normalizePhone(phone string) string {
	phone = strings.TrimSpace(phone)
	if strings.HasPrefix(phone, "+98") {
		return "0" + phone[3:]
	}
	return phone
}

func validIranianMobile(phone string) bool {
	return iranianMobilePattern.MatchString(normalizePhone(phone))
}

func requestOTP(ctx context.Context, db *pgxpool.Pool, rawPhone string) (string, error) {
	phone := normalizePhone(rawPhone)
	code, err := generateOTPCode()
	if err != nil {
		return "", fmt.Errorf("generate otp code: %w", err)
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Advisory lock prevents race condition on rate limit count for same phone
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1))", phone); err != nil {
		return "", fmt.Errorf("advisory lock: %w", err)
	}

	windowStart := time.Now().Add(-otpRateLimitWindowMins * time.Minute)
	var count int
	err = tx.QueryRow(ctx,
		"SELECT COUNT(*) FROM otp_codes WHERE phone = $1 AND created_at > $2",
		phone, windowStart,
	).Scan(&count)
	if err != nil {
		return "", fmt.Errorf("rate limit check: %w", err)
	}
	if count >= otpRateLimit {
		return "", ErrRateLimited
	}

	expiresAt := time.Now().Add(otpExpiryMinutes * time.Minute)
	_, err = tx.Exec(ctx,
		"INSERT INTO otp_codes (id, phone, code, expires_at) VALUES ($1, $2, $3, $4)",
		generateID(), phone, code, expiresAt,
	)
	if err != nil {
		return "", fmt.Errorf("insert otp: %w", err)
	}

	return code, tx.Commit(ctx)
}

type verifyResult struct {
	status string // "existing" | "new"
	userID string
}

func verifyOTP(ctx context.Context, db *pgxpool.Pool, rawPhone, code string) (verifyResult, error) {
	phone := normalizePhone(rawPhone)

	tx, err := db.Begin(ctx)
	if err != nil {
		return verifyResult{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var otpID string
	var otpCode string
	var attempts int
	err = tx.QueryRow(ctx,
		`SELECT id, code, attempts FROM otp_codes
		 WHERE phone = $1 AND used_at IS NULL AND expires_at > NOW()
		 ORDER BY created_at DESC LIMIT 1`,
		phone,
	).Scan(&otpID, &otpCode, &attempts)
	if errors.Is(err, pgx.ErrNoRows) {
		return verifyResult{}, ErrOTPNotFound
	}
	if err != nil {
		return verifyResult{}, fmt.Errorf("fetch otp: %w", err)
	}

	// Constant-time compare so a wrong code can't be narrowed down by timing.
	if subtle.ConstantTimeCompare([]byte(otpCode), []byte(code)) != 1 {
		newAttempts := attempts + 1
		burned := newAttempts >= otpMaxAttempts

		query := "UPDATE otp_codes SET attempts = $1 WHERE id = $2"
		if burned {
			// Burn the code after too many wrong tries so it can't be brute-forced.
			query = "UPDATE otp_codes SET attempts = $1, used_at = NOW() WHERE id = $2"
		}
		if _, err := tx.Exec(ctx, query, newAttempts, otpID); err != nil {
			return verifyResult{}, fmt.Errorf("record otp attempt: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return verifyResult{}, fmt.Errorf("commit otp attempt: %w", err)
		}
		if burned {
			return verifyResult{}, ErrOTPBurned
		}
		return verifyResult{}, ErrOTPInvalid
	}

	// Claim the OTP atomically
	var claimedID string
	err = tx.QueryRow(ctx,
		"UPDATE otp_codes SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING id",
		otpID,
	).Scan(&claimedID)
	if errors.Is(err, pgx.ErrNoRows) {
		return verifyResult{}, ErrOTPNotFound
	}
	if err != nil {
		return verifyResult{}, fmt.Errorf("claim otp: %w", err)
	}

	var userID string
	err = tx.QueryRow(ctx, "SELECT id FROM users WHERE phone = $1 LIMIT 1", phone).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		if err := tx.Commit(ctx); err != nil {
			return verifyResult{}, err
		}
		return verifyResult{status: "new"}, nil
	}
	if err != nil {
		return verifyResult{}, fmt.Errorf("fetch user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return verifyResult{}, err
	}
	return verifyResult{status: "existing", userID: userID}, nil
}

type registerInput struct {
	phone      string
	firstName  string
	lastName   string
	referredBy string // referral code captured before signup; stored once
}

type userRow struct {
	ID    string
	Phone string
	Role  string
}

func registerUser(ctx context.Context, db *pgxpool.Pool, input registerInput) (userRow, error) {
	phone := normalizePhone(input.phone)

	superAdminPhone := ""
	if raw := os.Getenv("SUPER_ADMIN_PHONE"); raw != "" {
		superAdminPhone = normalizePhone(raw)
	}
	role := "user"
	if superAdminPhone != "" && superAdminPhone == phone {
		role = "super_admin"
	}

	var referredBy any
	if input.referredBy != "" {
		referredBy = input.referredBy
	}

	var u userRow
	err := db.QueryRow(ctx,
		`INSERT INTO users (id, phone, first_name, last_name, role, referred_by)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, phone, role`,
		generateID(), phone, input.firstName, input.lastName, role, referredBy,
	).Scan(&u.ID, &u.Phone, &u.Role)
	if err != nil {
		return userRow{}, fmt.Errorf("insert user: %w", err)
	}
	return u, nil
}

func getMe(ctx context.Context, db *pgxpool.Pool, userID string) (*meRow, error) {
	var m meRow
	err := db.QueryRow(ctx,
		"SELECT id, phone, first_name, last_name, role FROM users WHERE id = $1 LIMIT 1",
		userID,
	).Scan(&m.ID, &m.Phone, &m.FirstName, &m.LastName, &m.Role)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("fetch me: %w", err)
	}
	return &m, nil
}

type meRow struct {
	ID        string
	Phone     string
	FirstName *string
	LastName  *string
	Role      string
}
