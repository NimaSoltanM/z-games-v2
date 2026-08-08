package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
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
	otpCleanupInterval     = time.Minute
	otpRetention           = 24 * time.Hour
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

type issuedOTP struct {
	id   string
	code string
}

// cleanupOTPs removes secrets as soon as they are no longer usable and keeps
// only a short window of lifecycle metadata for abuse-rate accounting.
func cleanupOTPs(ctx context.Context, db *pgxpool.Pool) (scrubbed, deleted int64, err error) {
	tag, err := db.Exec(ctx, `
		UPDATE otp_codes
		SET used_at = COALESCE(used_at, expires_at), code = NULL
		WHERE code IS NOT NULL AND (used_at IS NOT NULL OR expires_at <= NOW())
	`)
	if err != nil {
		return 0, 0, fmt.Errorf("scrub expired otp secrets: %w", err)
	}
	scrubbed = tag.RowsAffected()

	tag, err = db.Exec(ctx, "DELETE FROM otp_codes WHERE created_at <= $1", time.Now().Add(-otpRetention))
	if err != nil {
		return scrubbed, 0, fmt.Errorf("delete retained otp rows: %w", err)
	}
	return scrubbed, tag.RowsAffected(), nil
}

func startOTPCleanup(db *pgxpool.Pool) {
	go func() {
		run := func() {
			scrubbed, deleted, err := cleanupOTPs(context.Background(), db)
			if err != nil {
				log.Printf("auth: OTP cleanup failed: %v", err)
				return
			}
			if scrubbed > 0 || deleted > 0 {
				log.Printf("auth: OTP cleanup scrubbed %d secret(s), deleted %d row(s)", scrubbed, deleted)
			}
		}

		run()
		ticker := time.NewTicker(otpCleanupInterval)
		defer ticker.Stop()
		for range ticker.C {
			run()
		}
	}()
}

func requestOTP(ctx context.Context, db *pgxpool.Pool, rawPhone string) (issuedOTP, error) {
	if _, _, err := cleanupOTPs(ctx, db); err != nil {
		return issuedOTP{}, err
	}

	phone := normalizePhone(rawPhone)
	code, err := generateOTPCode()
	if err != nil {
		return issuedOTP{}, fmt.Errorf("generate otp code: %w", err)
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return issuedOTP{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Advisory lock prevents race condition on rate limit count for same phone
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1))", phone); err != nil {
		return issuedOTP{}, fmt.Errorf("advisory lock: %w", err)
	}

	windowStart := time.Now().Add(-otpRateLimitWindowMins * time.Minute)
	var count int
	err = tx.QueryRow(ctx,
		"SELECT COUNT(*) FROM otp_codes WHERE phone = $1 AND created_at > $2",
		phone, windowStart,
	).Scan(&count)
	if err != nil {
		return issuedOTP{}, fmt.Errorf("rate limit check: %w", err)
	}
	if count >= otpRateLimit {
		return issuedOTP{}, ErrRateLimited
	}

	// A newly requested code supersedes every older unclaimed code for the same
	// phone. This also prevents an older code from becoming valid again if SMS
	// delivery of the new code fails and the new row is removed.
	if _, err := tx.Exec(ctx,
		"UPDATE otp_codes SET used_at = NOW(), code = NULL WHERE phone = $1 AND used_at IS NULL",
		phone,
	); err != nil {
		return issuedOTP{}, fmt.Errorf("invalidate previous otp codes: %w", err)
	}

	id := generateID()
	expiresAt := time.Now().Add(otpExpiryMinutes * time.Minute)
	_, err = tx.Exec(ctx,
		"INSERT INTO otp_codes (id, phone, code, expires_at) VALUES ($1, $2, $3, $4)",
		id, phone, code, expiresAt,
	)
	if err != nil {
		return issuedOTP{}, fmt.Errorf("insert otp: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return issuedOTP{}, fmt.Errorf("commit otp: %w", err)
	}
	return issuedOTP{id: id, code: code}, nil
}

func discardOTP(ctx context.Context, db *pgxpool.Pool, id string) error {
	result, err := db.Exec(ctx, "DELETE FROM otp_codes WHERE id = $1 AND used_at IS NULL", id)
	if err != nil {
		return fmt.Errorf("delete undelivered otp: %w", err)
	}
	if result.RowsAffected() != 1 {
		return errors.New("delete undelivered otp: issued code not found")
	}
	return nil
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
			query = "UPDATE otp_codes SET attempts = $1, used_at = NOW(), code = NULL WHERE id = $2"
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
		"UPDATE otp_codes SET used_at = NOW(), code = NULL WHERE id = $1 AND used_at IS NULL RETURNING id",
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
