package orders

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/audit"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/shared/credentialstate"
)

const (
	verificationCodeLifetime          = 24 * time.Hour
	verificationRequestWindow         = 24 * time.Hour
	verificationCleanupInterval       = time.Minute
	verificationAdvisoryLockKey int64 = 8_904_221_732
)

var (
	ErrVerificationItemNotFound      = errors.New("VERIFICATION_ITEM_NOT_FOUND")
	ErrVerificationIneligible        = errors.New("VERIFICATION_INELIGIBLE")
	ErrVerificationPending           = errors.New("VERIFICATION_PENDING")
	ErrVerificationActive            = errors.New("VERIFICATION_ACTIVE")
	ErrVerificationRequestNotFound   = errors.New("VERIFICATION_REQUEST_NOT_FOUND")
	ErrVerificationRequestNotPending = errors.New("VERIFICATION_REQUEST_NOT_PENDING")
	ErrVerificationCodeInvalid       = errors.New("VERIFICATION_CODE_INVALID")
)

type verificationCooldownError struct {
	RetryAt time.Time
}

func (e *verificationCooldownError) Error() string { return "VERIFICATION_COOLDOWN" }

type VerificationRequestView struct {
	ID          string     `json:"id"`
	Status      string     `json:"status"`
	Code        *string    `json:"code"`
	RequestedAt time.Time  `json:"requested_at"`
	DeliveredAt *time.Time `json:"delivered_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

type VerificationSupportView struct {
	Eligible      bool                     `json:"eligible"`
	CanRequest    bool                     `json:"can_request"`
	BlockedReason string                   `json:"blocked_reason,omitempty"`
	NextRequestAt *time.Time               `json:"next_request_at"`
	Request       *VerificationRequestView `json:"request"`
}

type AdminVerificationRequest struct {
	ID          string     `json:"id"`
	Status      string     `json:"status"`
	Code        *string    `json:"code"`
	RequestedAt time.Time  `json:"requested_at"`
	DeliveredAt *time.Time `json:"delivered_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	OrderItemID string     `json:"order_item_id"`
	OrderID     string     `json:"order_id"`
	OrderNumber int64      `json:"order_number"`
	GameName    string     `json:"game_name"`
	Platform    string     `json:"platform"`
	Capacity    string     `json:"capacity"`
	UserID      string     `json:"user_id"`
	UserName    string     `json:"user_name"`
	UserPhone   string     `json:"user_phone"`
}

type VerificationCodeMatch struct {
	RequestID   string `json:"request_id"`
	OrderID     string `json:"order_id"`
	OrderNumber int64  `json:"order_number"`
	GameName    string `json:"game_name"`
	UserName    string `json:"user_name"`
	UserPhone   string `json:"user_phone"`
}

type verificationFilter struct {
	status string
	search string
	limit  int
	offset int
}

type verificationExecer interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}

// startVerificationCodeCleanup ensures expired secrets are actually erased even
// when nobody opens the queue. Reads and writes also call the same idempotent
// cleanup so the API never exposes a code after its expiry time.
func startVerificationCodeCleanup(db *pgxpool.Pool) {
	go func() {
		if n, err := purgeExpiredVerificationCodes(context.Background(), db); err != nil {
			log.Printf("orders: initial verification-code cleanup failed: %v", err)
		} else if n > 0 {
			log.Printf("orders: erased %d expired verification code(s)", n)
		}
		ticker := time.NewTicker(verificationCleanupInterval)
		defer ticker.Stop()
		for range ticker.C {
			n, err := purgeExpiredVerificationCodes(context.Background(), db)
			if err != nil {
				log.Printf("orders: verification-code cleanup failed: %v", err)
			} else if n > 0 {
				log.Printf("orders: erased %d expired verification code(s)", n)
			}
		}
	}()
}

func purgeExpiredVerificationCodes(ctx context.Context, db verificationExecer) (int64, error) {
	tag, err := db.Exec(ctx, `
		UPDATE verification_code_requests
		SET status = 'expired', code = NULL, updated_at = NOW()
		WHERE status = 'delivered' AND expires_at <= NOW()
	`)
	if err != nil {
		return 0, fmt.Errorf("purgeExpiredVerificationCodes: %w", err)
	}
	return tag.RowsAffected(), nil
}

// requestVerificationCode creates one support request for a delivered account.
// The global transaction lock makes the rolling limit and single-active-request
// checks race-free across all accounts owned by the same customer.
func requestVerificationCode(ctx context.Context, db *pgxpool.Pool, userID, itemID string) (*VerificationRequestView, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("requestVerificationCode begin: %w", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", verificationAdvisoryLockKey); err != nil {
		return nil, fmt.Errorf("requestVerificationCode lock: %w", err)
	}
	if _, err := purgeExpiredVerificationCodes(ctx, tx); err != nil {
		return nil, err
	}

	var platform, capacity string
	err = tx.QueryRow(ctx, `
		SELECT oi.platform, oi.zarfiat
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		LEFT JOIN game_returns gr ON gr.order_item_id = oi.id
		WHERE oi.id = $1 AND o.user_id = $2 AND o.status = 'fulfilled'
		  AND oi.email IS NOT NULL AND oi.password IS NOT NULL AND oi.passcode IS NOT NULL
		  AND (gr.id IS NULL OR gr.status NOT IN ('approved', 'refused'))
		FOR UPDATE OF oi
	`, itemID, userID).Scan(&platform, &capacity)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrVerificationItemNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("requestVerificationCode item: %w", err)
	}
	if !verificationCodeEligible(platform, capacity) {
		return nil, ErrVerificationIneligible
	}

	var latestStatus string
	var latestRequested time.Time
	var latestExpires *time.Time
	err = tx.QueryRow(ctx, `
		SELECT status, requested_at, expires_at
		FROM verification_code_requests
		WHERE user_id = $1
		ORDER BY requested_at DESC
		LIMIT 1
	`, userID).Scan(&latestStatus, &latestRequested, &latestExpires)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("requestVerificationCode latest: %w", err)
	}
	if err == nil {
		if latestStatus == "pending" {
			return nil, ErrVerificationPending
		}
		if latestStatus == "delivered" && latestExpires != nil && latestExpires.After(time.Now()) {
			return nil, ErrVerificationActive
		}
		retryAt := latestRequested.Add(verificationRequestWindow)
		if retryAt.After(time.Now()) {
			return nil, &verificationCooldownError{RetryAt: retryAt}
		}
	}

	var v VerificationRequestView
	err = tx.QueryRow(ctx, `
		INSERT INTO verification_code_requests (order_item_id, user_id)
		VALUES ($1, $2)
		RETURNING id, status, requested_at
	`, itemID, userID).Scan(&v.ID, &v.Status, &v.RequestedAt)
	if err != nil {
		return nil, fmt.Errorf("requestVerificationCode insert: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("requestVerificationCode commit: %w", err)
	}
	return &v, nil
}

func verificationCodeEligible(platform, capacity string) bool {
	return !(credentialstate.PlatformFamily(platform) == "playstation" && strings.EqualFold(strings.TrimSpace(capacity), "z1"))
}

func attachVerificationSupport(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, userID string, orderStatus string, items []OrderItemView) error {
	if _, err := purgeExpiredVerificationCodes(ctx, db); err != nil {
		return err
	}
	itemIDs := make([]string, 0, len(items))
	for i := range items {
		itemIDs = append(itemIDs, items[i].ID)
		eligible := orderStatus == "fulfilled" && !items[i].CredentialsReturned &&
			items[i].Email != nil && items[i].Password != nil && items[i].Passcode != nil &&
			verificationCodeEligible(items[i].Platform, items[i].Zarfiat)
		items[i].VerificationCode = &VerificationSupportView{Eligible: eligible}
	}
	if len(itemIDs) == 0 {
		return nil
	}

	rows, err := db.Query(ctx, `
		SELECT DISTINCT ON (order_item_id) order_item_id, id, status, code, requested_at, delivered_at, expires_at
		FROM verification_code_requests
		WHERE user_id=$1 AND order_item_id=ANY($2)
		ORDER BY order_item_id, requested_at DESC
	`, userID, itemIDs)
	if err != nil {
		return fmt.Errorf("attachVerificationSupport requests: %w", err)
	}
	byItem := make(map[string]*VerificationRequestView)
	for rows.Next() {
		var itemID string
		var v VerificationRequestView
		var encrypted *string
		if err := rows.Scan(&itemID, &v.ID, &v.Status, &encrypted, &v.RequestedAt, &v.DeliveredAt, &v.ExpiresAt); err != nil {
			rows.Close()
			return fmt.Errorf("attachVerificationSupport scan: %w", err)
		}
		if v.Code, err = cred.DecryptPtr(encrypted); err != nil {
			rows.Close()
			return fmt.Errorf("attachVerificationSupport decrypt: %w", err)
		}
		byItem[itemID] = &v
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return fmt.Errorf("attachVerificationSupport rows: %w", err)
	}

	var globalStatus string
	var globalRequested time.Time
	var globalExpires *time.Time
	err = db.QueryRow(ctx, `
		SELECT status, requested_at, expires_at
		FROM verification_code_requests WHERE user_id=$1
		ORDER BY requested_at DESC LIMIT 1
	`, userID).Scan(&globalStatus, &globalRequested, &globalExpires)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("attachVerificationSupport latest: %w", err)
	}
	now := time.Now()
	for i := range items {
		support := items[i].VerificationCode
		support.Request = byItem[items[i].ID]
		if !support.Eligible {
			continue
		}
		if errors.Is(err, pgx.ErrNoRows) {
			support.CanRequest = true
			continue
		}
		if globalStatus == "pending" {
			support.BlockedReason = "pending"
			continue
		}
		if globalStatus == "delivered" && globalExpires != nil && globalExpires.After(now) {
			support.BlockedReason = "active"
			continue
		}
		retryAt := globalRequested.Add(verificationRequestWindow)
		if retryAt.After(now) {
			support.NextRequestAt = &retryAt
			support.BlockedReason = "cooldown"
			continue
		}
		support.CanRequest = true
	}
	return nil
}

func listAdminVerificationRequests(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, f verificationFilter) ([]AdminVerificationRequest, int, error) {
	if _, err := purgeExpiredVerificationCodes(ctx, db); err != nil {
		return nil, 0, err
	}
	conds := []string{"TRUE"}
	args := []any{}
	if f.status == "pending" || f.status == "delivered" || f.status == "expired" {
		args = append(args, f.status)
		conds = append(conds, fmt.Sprintf("v.status = $%d", len(args)))
	}
	if f.search != "" {
		args = append(args, "%"+f.search+"%")
		i := len(args)
		conds = append(conds, fmt.Sprintf(`(u.phone ILIKE $%d OR TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) ILIKE $%d OR oi.game_name ILIKE $%d OR CAST(o.order_number AS TEXT) ILIKE $%d)`, i, i, i, i))
	}
	where := "WHERE " + strings.Join(conds, " AND ")
	var total int
	if err := db.QueryRow(ctx, `SELECT COUNT(*) FROM verification_code_requests v JOIN users u ON u.id=v.user_id JOIN order_items oi ON oi.id=v.order_item_id JOIN orders o ON o.id=oi.order_id `+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listAdminVerificationRequests count: %w", err)
	}
	if total == 0 {
		return []AdminVerificationRequest{}, 0, nil
	}
	query := fmt.Sprintf(`
		SELECT v.id, v.status, v.code, v.requested_at, v.delivered_at, v.expires_at,
		       oi.id, o.id, o.order_number, oi.game_name, oi.platform, oi.zarfiat,
		       u.id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), u.phone
		FROM verification_code_requests v
		JOIN users u ON u.id = v.user_id
		JOIN order_items oi ON oi.id = v.order_item_id
		JOIN orders o ON o.id = oi.order_id
		%s
		ORDER BY CASE v.status WHEN 'pending' THEN 0 WHEN 'delivered' THEN 1 ELSE 2 END,
		         v.requested_at DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)+1, len(args)+2)
	rows, err := db.Query(ctx, query, append(args, f.limit, f.offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("listAdminVerificationRequests: %w", err)
	}
	defer rows.Close()
	out := make([]AdminVerificationRequest, 0, total)
	for rows.Next() {
		var v AdminVerificationRequest
		var encrypted *string
		if err := rows.Scan(&v.ID, &v.Status, &encrypted, &v.RequestedAt, &v.DeliveredAt, &v.ExpiresAt,
			&v.OrderItemID, &v.OrderID, &v.OrderNumber, &v.GameName, &v.Platform, &v.Capacity,
			&v.UserID, &v.UserName, &v.UserPhone); err != nil {
			return nil, 0, fmt.Errorf("listAdminVerificationRequests scan: %w", err)
		}
		if v.Code, err = cred.DecryptPtr(encrypted); err != nil {
			return nil, 0, fmt.Errorf("listAdminVerificationRequests decrypt: %w", err)
		}
		out = append(out, v)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("listAdminVerificationRequests rows: %w", err)
	}
	return out, total, nil
}

func sendVerificationCode(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, adminID, requestID, rawCode string, allowDuplicate bool) ([]VerificationCodeMatch, error) {
	code := strings.TrimSpace(rawCode)
	if code == "" || utf8.RuneCountInString(code) > 128 || strings.ContainsAny(code, "\r\n") {
		return nil, ErrVerificationCodeInvalid
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("sendVerificationCode begin: %w", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", verificationAdvisoryLockKey); err != nil {
		return nil, fmt.Errorf("sendVerificationCode lock: %w", err)
	}
	if _, err := purgeExpiredVerificationCodes(ctx, tx); err != nil {
		return nil, err
	}
	var status string
	if err := tx.QueryRow(ctx, "SELECT status FROM verification_code_requests WHERE id=$1 FOR UPDATE", requestID).Scan(&status); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrVerificationRequestNotFound
	} else if err != nil {
		return nil, fmt.Errorf("sendVerificationCode request: %w", err)
	}
	if status != "pending" {
		return nil, ErrVerificationRequestNotPending
	}
	matches, err := activeVerificationCodeMatches(ctx, tx, cred, requestID, code)
	if err != nil {
		return nil, err
	}
	if len(matches) > 0 && !allowDuplicate {
		return matches, nil
	}
	encrypted, err := cred.EncryptNullable(code)
	if err != nil {
		return nil, fmt.Errorf("sendVerificationCode encrypt: %w", err)
	}
	var expiresAt time.Time
	err = tx.QueryRow(ctx, `
		UPDATE verification_code_requests
		SET status='delivered', code=$1, delivered_at=NOW(), expires_at=NOW()+INTERVAL '24 hours',
		    delivered_by=$2, updated_at=NOW()
		WHERE id=$3 AND status='pending'
		RETURNING expires_at
	`, encrypted, adminID, requestID).Scan(&expiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrVerificationRequestNotPending
	}
	if err != nil {
		return nil, fmt.Errorf("sendVerificationCode update: %w", err)
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID: adminID, Action: audit.ActionVerificationCodeSend,
		TargetType: "verification_code_request", TargetID: requestID,
		Metadata: map[string]any{"expires_at": expiresAt, "duplicate_override": len(matches)},
	}); err != nil {
		return nil, fmt.Errorf("sendVerificationCode audit: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("sendVerificationCode commit: %w", err)
	}
	return nil, nil
}

func activeVerificationCodeMatches(ctx context.Context, tx pgx.Tx, cred *credentials.Cipher, excludedID, code string) ([]VerificationCodeMatch, error) {
	rows, err := tx.Query(ctx, `
		SELECT v.id, v.code, o.id, o.order_number, oi.game_name,
		       TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), u.phone
		FROM verification_code_requests v
		JOIN users u ON u.id=v.user_id
		JOIN order_items oi ON oi.id=v.order_item_id
		JOIN orders o ON o.id=oi.order_id
		WHERE v.status='delivered' AND v.expires_at > NOW() AND v.code IS NOT NULL AND v.id <> $1
	`, excludedID)
	if err != nil {
		return nil, fmt.Errorf("activeVerificationCodeMatches: %w", err)
	}
	defer rows.Close()
	var matches []VerificationCodeMatch
	for rows.Next() {
		var m VerificationCodeMatch
		var encrypted string
		if err := rows.Scan(&m.RequestID, &encrypted, &m.OrderID, &m.OrderNumber, &m.GameName, &m.UserName, &m.UserPhone); err != nil {
			return nil, fmt.Errorf("activeVerificationCodeMatches scan: %w", err)
		}
		plain, err := cred.Decrypt(encrypted)
		if err != nil {
			return nil, fmt.Errorf("activeVerificationCodeMatches decrypt: %w", err)
		}
		if plain == code {
			matches = append(matches, m)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("activeVerificationCodeMatches rows: %w", err)
	}
	return matches, nil
}
