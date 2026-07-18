// Package returns implements the game buy-back flow: a customer returns a
// delivered game account (films logging out, uploads the clip), an admin reviews
// it, and on approval the customer's in-website wallet is credited with the game's
// current store price minus a fee (default 25%). See PROJECT.md "Account trade-in".
package returns

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/audit"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/shared/credentialstate"
	"github.com/soltanmohammdi/z-games/internal/shared/pricing"
)

var (
	ErrItemNotFound         = errors.New("RETURN_ITEM_NOT_FOUND")    // not owned / not delivered
	ErrNotReturnable        = errors.New("RETURN_NOT_RETURNABLE")    // admin disabled returns for the game
	ErrAlreadyRequested     = errors.New("RETURN_ALREADY_REQUESTED") // a return row already exists for the item
	ErrReturnNotFound       = errors.New("RETURN_NOT_FOUND")
	ErrNotResubmittable     = errors.New("RETURN_NOT_RESUBMITTABLE") // status != rejected
	ErrNotReviewable        = errors.New("RETURN_NOT_REVIEWABLE")    // status != pending
	ErrInvalidCredit        = errors.New("RETURN_INVALID_CREDIT")
	ErrCreditTooLarge       = errors.New("RETURN_CREDIT_TOO_LARGE")
	ErrReasonRequired       = errors.New("RETURN_REASON_REQUIRED")
	ErrInventoryUnavailable = errors.New("RETURN_INVENTORY_UNAVAILABLE")
	ErrInventoryReused      = errors.New("RETURN_INVENTORY_ALREADY_REUSED")
	ErrInventoryActive      = errors.New("RETURN_INVENTORY_ACCOUNT_ACTIVE")
)

const maxReasonLen = 1000

// MaxReturnCreditToman bounds the credit when the game/capacity is delisted (no
// current price to cap against) — a sanity ceiling against a fat-fingered amount.
// When the game is still priced, the cap is its current full price instead.
const MaxReturnCreditToman = 100_000_000

// creditEstimate is the money preview for a return. Available is false when the
// game/capacity is no longer priced in the store (delisted/inactive); then no
// numbers are shown and the admin types the credit by hand at approval. The
// estimate is based on the regular (pre-storefront-discount) price so a temporary
// sale never shrinks return credit.
type creditEstimate struct {
	Available    bool `json:"available"`
	CurrentPrice int  `json:"current_price"` // current store price (Toman), before fee
	FeePct       int  `json:"fee_pct"`       // fee applied right now (override window or default)
	NetCredit    int  `json:"net_credit"`    // CurrentPrice minus FeePct
	NormalFeePct int  `json:"normal_fee_pct"`
	NormalCredit int  `json:"normal_credit"` // CurrentPrice minus the default fee
	Promo        bool `json:"promo"`         // a reduced-fee window is live (NetCredit > NormalCredit)
}

// priceInputs carries the raw per-item price + return-fee fields read from a row,
// so estimate logic stays in one place.
type priceInputs struct {
	active    bool
	priceMode string
	priceTmn  *int
	baseUSD   *float64
	margin    *int
	feePct    *int
	feeStart  *time.Time
	feeEnd    *time.Time
}

// currentPrice resolves a game's CURRENT store price (Toman) for one
// console+capacity, the same way checkout does, but without any storefront
// discount. Returns false when the game is inactive or no longer priced for that
// slot — the delisted edge case.
func currentPrice(in priceInputs, console, capacity string, rate int, catalog pricing.Catalog) (int, bool) {
	if !in.active {
		return 0, false
	}
	if in.priceMode == "fixed" {
		if in.priceTmn == nil || *in.priceTmn <= 0 {
			return 0, false
		}
		return *in.priceTmn, true
	}
	if in.baseUSD == nil {
		return 0, false
	}
	return catalog.TierTomanFor(console, capacity, *in.baseUSD, in.margin, rate)
}

func estimateCredit(in priceInputs, console, capacity string, rate int, catalog pricing.Catalog, now time.Time) creditEstimate {
	price, ok := currentPrice(in, console, capacity, rate, catalog)
	if !ok {
		return creditEstimate{Available: false, NormalFeePct: pricing.DefaultReturnFeePct}
	}
	fee := pricing.EffectiveReturnFeePct(in.feePct, in.feeStart, in.feeEnd, now)
	return creditEstimate{
		Available:    true,
		CurrentPrice: price,
		FeePct:       fee,
		NetCredit:    pricing.ApplyDiscount(price, fee),
		NormalFeePct: pricing.DefaultReturnFeePct,
		NormalCredit: pricing.ApplyDiscount(price, pricing.DefaultReturnFeePct),
		Promo:        fee < pricing.DefaultReturnFeePct,
	}
}

// loadPricing reads the exchange rate + console/capacity catalog used to derive
// dynamic prices.
func loadPricing(ctx context.Context, db *pgxpool.Pool) (int, pricing.Catalog, error) {
	rate, err := pricing.LoadRate(ctx, db)
	if err != nil {
		return 0, pricing.Catalog{}, fmt.Errorf("loadPricing rate: %w", err)
	}
	catalog, err := pricing.LoadCatalog(ctx, db)
	if err != nil {
		return 0, pricing.Catalog{}, fmt.Errorf("loadPricing catalog: %w", err)
	}
	return rate, catalog, nil
}

// --- user: owned accounts ----------------------------------------------------

// OwnedItem is one delivered game account a user holds, with whether it can be
// returned and the credit they'd get. Returned/refused accounts stay in the list
// (badged) for history; their credentials are not exposed here.
type OwnedItem struct {
	ItemID       string         `json:"item_id"`
	GameID       string         `json:"game_id"`
	GameName     string         `json:"game_name"`
	Console      string         `json:"console"`
	Capacity     string         `json:"capacity"`
	OrderNumber  int64          `json:"order_number"`
	PurchasedAt  time.Time      `json:"purchased_at"`
	PreOrder     bool           `json:"pre_order"`
	Returnable   bool           `json:"returnable"` // game allows returns (admin flag)
	ReturnID     *string        `json:"return_id"`
	ReturnStatus *string        `json:"return_status"` // nil | pending | approved | rejected | refused
	ReturnReason *string        `json:"return_reason"`
	CreditAmount *int           `json:"credit_amount"` // set once approved
	Estimate     creditEstimate `json:"estimate"`
}

// listOwned returns a page of the user's delivered accounts (a paid/fulfilled
// order_item with all three credentials), newest first, each with its return
// state and credit estimate. Returns the page and the total match count.
func listOwned(ctx context.Context, db *pgxpool.Pool, userID string, limit, offset int) ([]OwnedItem, int, error) {
	const fromWhere = `
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.user_id = $1
		  AND o.status IN ('paid', 'fulfilled')
		  AND oi.email IS NOT NULL AND oi.password IS NOT NULL AND oi.passcode IS NOT NULL
	`

	var total int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) "+fromWhere, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listOwned count: %w", err)
	}
	if total == 0 {
		return []OwnedItem{}, 0, nil
	}

	rate, catalog, err := loadPricing(ctx, db)
	if err != nil {
		return nil, 0, err
	}

	rows, err := db.Query(ctx, `
		SELECT oi.id, oi.game_id, oi.game_name, oi.platform, oi.zarfiat, oi.pre_order,
		       o.order_number, o.created_at,
		       g.returnable, g.active, g.price_mode::text, g.profit_margin_pct,
		       g.return_fee_pct, g.return_fee_starts_at, g.return_fee_ends_at,
		       gp.price_toman, gbp.base_usd::float8,
		       gr.id, gr.status, gr.reason, gr.credit_amount
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		JOIN games g ON g.id = oi.game_id
		LEFT JOIN game_prices gp
		  ON gp.game_id = oi.game_id AND gp.platform = oi.platform AND gp.zarfiat = oi.zarfiat
		LEFT JOIN game_base_prices gbp
		  ON gbp.game_id = oi.game_id AND gbp.platform = oi.platform
		  AND (cardinality(gbp.capacities) = 0 OR oi.zarfiat = ANY(gbp.capacities))
		LEFT JOIN game_returns gr ON gr.order_item_id = oi.id
		WHERE o.user_id = $1
		  AND o.status IN ('paid', 'fulfilled')
		  AND oi.email IS NOT NULL AND oi.password IS NOT NULL AND oi.passcode IS NOT NULL
		ORDER BY o.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("listOwned: %w", err)
	}
	defer rows.Close()

	now := time.Now().UTC()
	items := make([]OwnedItem, 0)
	for rows.Next() {
		var (
			it OwnedItem
			pi priceInputs
		)
		if err := rows.Scan(&it.ItemID, &it.GameID, &it.GameName, &it.Console, &it.Capacity, &it.PreOrder,
			&it.OrderNumber, &it.PurchasedAt,
			&it.Returnable, &pi.active, &pi.priceMode, &pi.margin,
			&pi.feePct, &pi.feeStart, &pi.feeEnd,
			&pi.priceTmn, &pi.baseUSD,
			&it.ReturnID, &it.ReturnStatus, &it.ReturnReason, &it.CreditAmount); err != nil {
			return nil, 0, fmt.Errorf("listOwned scan: %w", err)
		}
		it.Estimate = estimateCredit(pi, it.Console, it.Capacity, rate, catalog, now)
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("listOwned rows: %w", err)
	}
	return items, total, nil
}

// getOwnedItem returns a single delivered account the user holds (with its return
// state + credit estimate), or nil if it isn't theirs / isn't delivered. Powers the
// return flow page so it survives a direct link or refresh.
func getOwnedItem(ctx context.Context, db *pgxpool.Pool, userID, itemID string) (*OwnedItem, error) {
	rate, catalog, err := loadPricing(ctx, db)
	if err != nil {
		return nil, err
	}

	var (
		it OwnedItem
		pi priceInputs
	)
	err = db.QueryRow(ctx, `
		SELECT oi.id, oi.game_id, oi.game_name, oi.platform, oi.zarfiat, oi.pre_order,
		       o.order_number, o.created_at,
		       g.returnable, g.active, g.price_mode::text, g.profit_margin_pct,
		       g.return_fee_pct, g.return_fee_starts_at, g.return_fee_ends_at,
		       gp.price_toman, gbp.base_usd::float8,
		       gr.id, gr.status, gr.reason, gr.credit_amount
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		JOIN games g ON g.id = oi.game_id
		LEFT JOIN game_prices gp
		  ON gp.game_id = oi.game_id AND gp.platform = oi.platform AND gp.zarfiat = oi.zarfiat
		LEFT JOIN game_base_prices gbp
		  ON gbp.game_id = oi.game_id AND gbp.platform = oi.platform
		  AND (cardinality(gbp.capacities) = 0 OR oi.zarfiat = ANY(gbp.capacities))
		LEFT JOIN game_returns gr ON gr.order_item_id = oi.id
		WHERE oi.id = $1 AND o.user_id = $2
		  AND o.status IN ('paid', 'fulfilled')
		  AND oi.email IS NOT NULL AND oi.password IS NOT NULL AND oi.passcode IS NOT NULL
	`, itemID, userID).Scan(&it.ItemID, &it.GameID, &it.GameName, &it.Console, &it.Capacity, &it.PreOrder,
		&it.OrderNumber, &it.PurchasedAt,
		&it.Returnable, &pi.active, &pi.priceMode, &pi.margin,
		&pi.feePct, &pi.feeStart, &pi.feeEnd,
		&pi.priceTmn, &pi.baseUSD,
		&it.ReturnID, &it.ReturnStatus, &it.ReturnReason, &it.CreditAmount)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getOwnedItem: %w", err)
	}
	it.Estimate = estimateCredit(pi, it.Console, it.Capacity, rate, catalog, time.Now().UTC())
	return &it, nil
}

// --- user: create / resubmit -------------------------------------------------

// canCreateReturn checks that itemID is a delivered account owned by userID, that
// its game still allows returns, and that no return row exists for it yet. The
// UNIQUE(order_item_id) index is the authoritative guard against a race; this is
// the friendly pre-check.
func canCreateReturn(ctx context.Context, db *pgxpool.Pool, userID, itemID string) error {
	var (
		returnable bool
		existing   int
	)
	err := db.QueryRow(ctx, `
		SELECT g.returnable,
		       (SELECT COUNT(*) FROM game_returns gr WHERE gr.order_item_id = oi.id)
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		JOIN games g ON g.id = oi.game_id
		WHERE oi.id = $1 AND o.user_id = $2
		  AND o.status IN ('paid', 'fulfilled')
		  AND oi.email IS NOT NULL AND oi.password IS NOT NULL AND oi.passcode IS NOT NULL
	`, itemID, userID).Scan(&returnable, &existing)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrItemNotFound
	}
	if err != nil {
		return fmt.Errorf("canCreateReturn: %w", err)
	}
	if !returnable {
		return ErrNotReturnable
	}
	if existing > 0 {
		return ErrAlreadyRequested
	}
	return nil
}

// insertReturn opens a pending return for a delivered account. A UNIQUE violation
// on order_item_id (a concurrent create) maps to ErrAlreadyRequested so the caller
// can clean up the just-saved video.
func insertReturn(ctx context.Context, db *pgxpool.Pool, userID, itemID, videoFilename string) (string, error) {
	var id string
	err := db.QueryRow(ctx, `
		INSERT INTO game_returns (order_item_id, user_id, status, video_filename, agreed_terms)
		VALUES ($1, $2, 'pending', $3, true)
		RETURNING id
	`, itemID, userID, videoFilename).Scan(&id)
	if isUniqueViolation(err) {
		return "", ErrAlreadyRequested
	}
	if err != nil {
		return "", fmt.Errorf("insertReturn: %w", err)
	}
	return id, nil
}

// getResubmittable confirms a return is the user's and is in the rejected state
// (the only state a customer can act on), returning the current video filename so
// the caller can delete it after the new one is stored.
func getResubmittable(ctx context.Context, db *pgxpool.Pool, userID, returnID string) (string, error) {
	var (
		status   string
		oldVideo *string
	)
	err := db.QueryRow(ctx,
		"SELECT status, video_filename FROM game_returns WHERE id = $1 AND user_id = $2",
		returnID, userID).Scan(&status, &oldVideo)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrReturnNotFound
	}
	if err != nil {
		return "", fmt.Errorf("getResubmittable: %w", err)
	}
	if status != "rejected" {
		return "", ErrNotResubmittable
	}
	if oldVideo == nil {
		return "", nil
	}
	return *oldVideo, nil
}

// resubmitReturn replaces a rejected return's video and reopens it for review,
// clearing the prior rejection reason. Guarded on status so a state change between
// the pre-check and here can't reopen a terminal request.
func resubmitReturn(ctx context.Context, db *pgxpool.Pool, userID, returnID, videoFilename string) error {
	tag, err := db.Exec(ctx, `
		UPDATE game_returns
		SET status = 'pending', video_filename = $1, reason = NULL, agreed_terms = true, updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND status = 'rejected'
	`, videoFilename, returnID, userID)
	if err != nil {
		return fmt.Errorf("resubmitReturn: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotResubmittable
	}
	return nil
}

// --- user: my requests -------------------------------------------------------

type MyReturn struct {
	ID           string    `json:"id"`
	ItemID       string    `json:"item_id"`
	GameName     string    `json:"game_name"`
	Console      string    `json:"console"`
	Capacity     string    `json:"capacity"`
	Status       string    `json:"status"`
	Reason       *string   `json:"reason"`
	CreditAmount *int      `json:"credit_amount"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func listMyReturns(ctx context.Context, db *pgxpool.Pool, userID string, limit, offset int) ([]MyReturn, int, error) {
	var total int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) FROM game_returns WHERE user_id = $1", userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listMyReturns count: %w", err)
	}
	if total == 0 {
		return []MyReturn{}, 0, nil
	}

	rows, err := db.Query(ctx, `
		SELECT gr.id, gr.order_item_id, oi.game_name, oi.platform, oi.zarfiat,
		       gr.status, gr.reason, gr.credit_amount, gr.created_at, gr.updated_at
		FROM game_returns gr
		JOIN order_items oi ON oi.id = gr.order_item_id
		WHERE gr.user_id = $1
		ORDER BY gr.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("listMyReturns: %w", err)
	}
	defer rows.Close()

	out := make([]MyReturn, 0)
	for rows.Next() {
		var r MyReturn
		if err := rows.Scan(&r.ID, &r.ItemID, &r.GameName, &r.Console, &r.Capacity,
			&r.Status, &r.Reason, &r.CreditAmount, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("listMyReturns scan: %w", err)
		}
		out = append(out, r)
	}
	return out, total, rows.Err()
}

// --- admin: queue ------------------------------------------------------------

type AdminReturnRow struct {
	ID           string    `json:"id"`
	Status       string    `json:"status"`
	GameName     string    `json:"game_name"`
	Console      string    `json:"console"`
	Capacity     string    `json:"capacity"`
	UserPhone    string    `json:"user_phone"`
	UserName     string    `json:"user_name"`
	CreditAmount *int      `json:"credit_amount"`
	CreatedAt    time.Time `json:"created_at"`
}

type adminFilter struct {
	status string
	search string
	limit  int
	offset int
}

// listAdminReturns returns a page of the review queue: pending first, then the
// rest, newest within each group. Optional status narrows to one group; search
// matches the buyer's phone or name.
func listAdminReturns(ctx context.Context, db *pgxpool.Pool, f adminFilter) ([]AdminReturnRow, int, error) {
	var conds []string
	var args []any

	switch f.status {
	case "pending", "approved", "rejected", "refused":
		args = append(args, f.status)
		conds = append(conds, fmt.Sprintf("gr.status = $%d", len(args)))
	}
	if f.search != "" {
		args = append(args, "%"+f.search+"%")
		conds = append(conds, fmt.Sprintf(
			"(u.phone ILIKE $%d OR TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) ILIKE $%d)",
			len(args), len(args)))
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	base := `
		FROM game_returns gr
		JOIN order_items oi ON oi.id = gr.order_item_id
		JOIN users u ON u.id = gr.user_id
		` + where

	var total int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) "+base, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listAdminReturns count: %w", err)
	}
	if total == 0 {
		return []AdminReturnRow{}, 0, nil
	}

	q := fmt.Sprintf(`
		SELECT gr.id, gr.status, oi.game_name, oi.platform, oi.zarfiat,
		       u.phone, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))),
		       gr.credit_amount, gr.created_at
		%s
		ORDER BY CASE gr.status WHEN 'pending' THEN 0 ELSE 1 END, gr.created_at DESC
		LIMIT $%d OFFSET $%d
	`, base, len(args)+1, len(args)+2)
	rows, err := db.Query(ctx, q, append(args, f.limit, f.offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("listAdminReturns: %w", err)
	}
	defer rows.Close()

	out := make([]AdminReturnRow, 0)
	for rows.Next() {
		var r AdminReturnRow
		if err := rows.Scan(&r.ID, &r.Status, &r.GameName, &r.Console, &r.Capacity,
			&r.UserPhone, &r.UserName, &r.CreditAmount, &r.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("listAdminReturns scan: %w", err)
		}
		out = append(out, r)
	}
	return out, total, rows.Err()
}

// --- admin: returned-account inventory --------------------------------------

type ReturnedAccountRow struct {
	ReturnID             string     `json:"return_id"`
	GameID               string     `json:"game_id"`
	GameName             string     `json:"game_name"`
	Console              string     `json:"console"`
	Capacity             string     `json:"capacity"`
	AccountEmail         *string    `json:"account_email"`
	ReturnedAt           time.Time  `json:"returned_at"`
	SourceOrderID        string     `json:"source_order_id"`
	SourceOrderNumber    int64      `json:"source_order_number"`
	Available            bool       `json:"available"`
	InventoryDisabledAt  *time.Time `json:"inventory_disabled_at"`
	ReusedAt             *time.Time `json:"reused_at"`
	ReusedForOrderID     *string    `json:"reused_for_order_id"`
	ReusedForOrderNumber *int64     `json:"reused_for_order_number"`
}

type returnedAccountFilter struct {
	status string
	search string
	limit  int
	offset int
}

// listReturnedAccounts is the durable inventory/history view for every approved
// return. Rows are never deleted: available, manually unavailable, and reused
// accounts are all visible, with reuse linked to its destination order.
func listReturnedAccounts(ctx context.Context, db *pgxpool.Pool, cipher *credentials.Cipher, f returnedAccountFilter) ([]ReturnedAccountRow, int, error) {
	conds := []string{"gr.status = 'approved'"}
	var args []any
	switch f.status {
	case "available":
		conds = append(conds, "gr.reused_at IS NULL AND gr.inventory_disabled_at IS NULL")
	case "disabled":
		conds = append(conds, "gr.reused_at IS NULL AND gr.inventory_disabled_at IS NOT NULL")
	case "reused":
		conds = append(conds, "gr.reused_at IS NOT NULL")
	}
	if f.search != "" {
		args = append(args, "%"+f.search+"%")
		n := len(args)
		conds = append(conds, fmt.Sprintf(
			"(src.game_name ILIKE $%d OR CAST(source_order.order_number AS TEXT) ILIKE $%d OR CAST(reused_order.order_number AS TEXT) ILIKE $%d)",
			n, n, n))
	}
	where := "WHERE " + strings.Join(conds, " AND ")
	base := `
		FROM game_returns gr
		JOIN order_items src ON src.id = gr.order_item_id
		JOIN orders source_order ON source_order.id = src.order_id
		LEFT JOIN order_items reused_item ON reused_item.id = gr.reused_for_item_id
		LEFT JOIN orders reused_order ON reused_order.id = reused_item.order_id
		` + where

	var total int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) "+base, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listReturnedAccounts count: %w", err)
	}
	if total == 0 {
		return []ReturnedAccountRow{}, 0, nil
	}

	q := fmt.Sprintf(`
		SELECT gr.id, src.game_id, src.game_name, src.platform, src.zarfiat, src.email,
		       COALESCE(gr.reviewed_at, gr.updated_at, gr.created_at),
		       source_order.id, source_order.order_number,
		       gr.inventory_disabled_at, gr.reused_at,
		       reused_order.id, reused_order.order_number
		%s
		ORDER BY
		  CASE
		    WHEN gr.reused_at IS NULL AND gr.inventory_disabled_at IS NULL THEN 0
		    WHEN gr.reused_at IS NULL THEN 1
		    ELSE 2
		  END,
		  gr.reviewed_at DESC NULLS LAST,
		  gr.created_at DESC
		LIMIT $%d OFFSET $%d
	`, base, len(args)+1, len(args)+2)
	rows, err := db.Query(ctx, q, append(args, f.limit, f.offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("listReturnedAccounts: %w", err)
	}
	defer rows.Close()

	out := make([]ReturnedAccountRow, 0)
	for rows.Next() {
		var (
			r              ReturnedAccountRow
			encryptedEmail *string
		)
		if err := rows.Scan(&r.ReturnID, &r.GameID, &r.GameName, &r.Console, &r.Capacity,
			&encryptedEmail, &r.ReturnedAt, &r.SourceOrderID, &r.SourceOrderNumber,
			&r.InventoryDisabledAt, &r.ReusedAt, &r.ReusedForOrderID, &r.ReusedForOrderNumber); err != nil {
			return nil, 0, fmt.Errorf("listReturnedAccounts scan: %w", err)
		}
		if r.AccountEmail, err = cipher.DecryptPtr(encryptedEmail); err != nil {
			return nil, 0, fmt.Errorf("listReturnedAccounts decrypt email: %w", err)
		}
		r.Available = r.ReusedAt == nil && r.InventoryDisabledAt == nil
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("listReturnedAccounts rows: %w", err)
	}
	return out, total, nil
}

// setReturnedAccountAvailability toggles only the manual availability flag.
// Automatically reused rows are immutable history. Re-enabling is rejected if
// the same account identity is currently held by any customer.
func setReturnedAccountAvailability(ctx context.Context, db *pgxpool.Pool, cipher *credentials.Cipher, adminID, returnID string, available bool) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("setReturnedAccountAvailability begin: %w", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", credentialstate.FulfillmentAdvisoryLockKey); err != nil {
		return fmt.Errorf("setReturnedAccountAvailability lock: %w", err)
	}

	var (
		status         string
		encryptedEmail *string
		platform       string
		reusedAt       *time.Time
		disabledAt     *time.Time
	)
	err = tx.QueryRow(ctx, `
		SELECT gr.status, src.email, src.platform, gr.reused_at, gr.inventory_disabled_at
		FROM game_returns gr
		JOIN order_items src ON src.id = gr.order_item_id
		WHERE gr.id = $1
		FOR UPDATE OF gr
	`, returnID).Scan(&status, &encryptedEmail, &platform, &reusedAt, &disabledAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrReturnNotFound
	}
	if err != nil {
		return fmt.Errorf("setReturnedAccountAvailability load: %w", err)
	}
	if status != "approved" || encryptedEmail == nil {
		return ErrInventoryUnavailable
	}
	if reusedAt != nil {
		return ErrInventoryReused
	}
	if (available && disabledAt == nil) || (!available && disabledAt != nil) {
		return tx.Commit(ctx)
	}

	if available {
		email, err := cipher.DecryptPtr(encryptedEmail)
		if err != nil {
			return fmt.Errorf("setReturnedAccountAvailability decrypt email: %w", err)
		}
		if email == nil {
			return ErrInventoryUnavailable
		}
		identity := credentialstate.AccountIdentity(*email, platform)
		holders, err := credentialstate.ActiveHolders(ctx, tx, cipher,
			map[string]struct{}{identity: {}}, nil)
		if err != nil {
			return err
		}
		if len(holders[identity]) > 0 {
			return ErrInventoryActive
		}
		if _, err := tx.Exec(ctx, `
			UPDATE game_returns
			SET inventory_disabled_at = NULL, inventory_disabled_by = NULL, updated_at = NOW()
			WHERE id = $1 AND reused_at IS NULL
		`, returnID); err != nil {
			return fmt.Errorf("setReturnedAccountAvailability enable: %w", err)
		}
	} else {
		if _, err := tx.Exec(ctx, `
			UPDATE game_returns
			SET inventory_disabled_at = NOW(), inventory_disabled_by = $1, updated_at = NOW()
			WHERE id = $2 AND reused_at IS NULL
		`, adminID, returnID); err != nil {
			return fmt.Errorf("setReturnedAccountAvailability disable: %w", err)
		}
	}

	action := audit.ActionReturnInventoryDisable
	if available {
		action = audit.ActionReturnInventoryEnable
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID: adminID, Action: action, TargetType: "return", TargetID: returnID,
		Metadata: map[string]any{"available": available},
	}); err != nil {
		return fmt.Errorf("setReturnedAccountAvailability audit: %w", err)
	}
	return tx.Commit(ctx)
}

// --- admin: detail -----------------------------------------------------------

// AdminReturnDetail is everything an admin needs to judge a return: the account
// credentials (decrypted), what/when it was bought, who bought it, the video, and
// the suggested credit.
type AdminReturnDetail struct {
	ID           string     `json:"id"`
	Status       string     `json:"status"`
	Reason       *string    `json:"reason"`
	CreditAmount *int       `json:"credit_amount"`
	HasVideo     bool       `json:"has_video"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
	// ReusedAt is set once an approved return's account has been reused to fulfill a
	// new order, so the admin knows that stock is already spent.
	ReusedAt     *time.Time     `json:"reused_at"`
	GameID       string         `json:"game_id"`
	GameName     string         `json:"game_name"`
	Console      string         `json:"console"`
	Capacity     string         `json:"capacity"`
	PreOrder     bool           `json:"pre_order"`
	OrderNumber  int64          `json:"order_number"`
	PurchasedAt  time.Time      `json:"purchased_at"`
	UserPhone    string         `json:"user_phone"`
	UserName     string         `json:"user_name"`
	AccountEmail *string        `json:"account_email"`
	AccountPass  *string        `json:"account_password"`
	AccountCode  *string        `json:"account_passcode"`
	Estimate     creditEstimate `json:"estimate"`
}

func getAdminReturn(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, returnID string) (*AdminReturnDetail, error) {
	rate, catalog, err := loadPricing(ctx, db)
	if err != nil {
		return nil, err
	}

	var (
		d        AdminReturnDetail
		video    *string
		pi       priceInputs
		email    *string
		password *string
		passcode *string
	)
	err = db.QueryRow(ctx, `
		SELECT gr.id, gr.status, gr.reason, gr.credit_amount, gr.video_filename,
		       gr.created_at, gr.updated_at, gr.reviewed_at, gr.reused_at,
		       oi.game_id, oi.game_name, oi.platform, oi.zarfiat, oi.pre_order,
		       oi.email, oi.password, oi.passcode,
		       o.order_number, o.created_at,
		       u.phone, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))),
		       g.active, g.price_mode::text, g.profit_margin_pct,
		       g.return_fee_pct, g.return_fee_starts_at, g.return_fee_ends_at,
		       gp.price_toman, gbp.base_usd::float8
		FROM game_returns gr
		JOIN order_items oi ON oi.id = gr.order_item_id
		JOIN orders o ON o.id = oi.order_id
		JOIN users u ON u.id = gr.user_id
		JOIN games g ON g.id = oi.game_id
		LEFT JOIN game_prices gp
		  ON gp.game_id = oi.game_id AND gp.platform = oi.platform AND gp.zarfiat = oi.zarfiat
		LEFT JOIN game_base_prices gbp
		  ON gbp.game_id = oi.game_id AND gbp.platform = oi.platform
		  AND (cardinality(gbp.capacities) = 0 OR oi.zarfiat = ANY(gbp.capacities))
		WHERE gr.id = $1
	`, returnID).Scan(&d.ID, &d.Status, &d.Reason, &d.CreditAmount, &video,
		&d.CreatedAt, &d.UpdatedAt, &d.ReviewedAt, &d.ReusedAt,
		&d.GameID, &d.GameName, &d.Console, &d.Capacity, &d.PreOrder,
		&email, &password, &passcode,
		&d.OrderNumber, &d.PurchasedAt,
		&d.UserPhone, &d.UserName,
		&pi.active, &pi.priceMode, &pi.margin,
		&pi.feePct, &pi.feeStart, &pi.feeEnd,
		&pi.priceTmn, &pi.baseUSD)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getAdminReturn: %w", err)
	}

	d.HasVideo = video != nil && *video != ""
	if d.AccountEmail, err = cred.DecryptPtr(email); err != nil {
		return nil, fmt.Errorf("getAdminReturn decrypt email: %w", err)
	}
	if d.AccountPass, err = cred.DecryptPtr(password); err != nil {
		return nil, fmt.Errorf("getAdminReturn decrypt password: %w", err)
	}
	if d.AccountCode, err = cred.DecryptPtr(passcode); err != nil {
		return nil, fmt.Errorf("getAdminReturn decrypt passcode: %w", err)
	}
	d.Estimate = estimateCredit(pi, d.Console, d.Capacity, rate, catalog, time.Now().UTC())
	return &d, nil
}

// videoFilename returns the stored video file name for a return (empty if none).
func videoFilename(ctx context.Context, db *pgxpool.Pool, returnID string) (string, error) {
	var name *string
	err := db.QueryRow(ctx, "SELECT video_filename FROM game_returns WHERE id = $1", returnID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrReturnNotFound
	}
	if err != nil {
		return "", fmt.Errorf("videoFilename: %w", err)
	}
	if name == nil {
		return "", nil
	}
	return *name, nil
}

// --- admin: review actions ---------------------------------------------------

// approveReturn marks a pending return approved and credits the buyer's wallet by
// creditAmount (the admin-confirmed Toman figure), recording a ledger row and an
// audit entry in the same transaction. Guarded on status='pending' so a return is
// never credited twice. Once approved, the deal is settled and the proof video has
// served its purpose, so its row reference is cleared here and the returned old
// filename is handed back for the caller to delete from disk after commit.
func approveReturn(ctx context.Context, db *pgxpool.Pool, adminID, returnID string, creditAmount int) (string, error) {
	if creditAmount <= 0 {
		return "", ErrInvalidCredit
	}

	rate, catalog, err := loadPricing(ctx, db)
	if err != nil {
		return "", err
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("approveReturn begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var (
		status, userID, console, capacity string
		oldVideo                          *string
		pi                                priceInputs
	)
	err = tx.QueryRow(ctx, `
		SELECT gr.status, gr.user_id, gr.video_filename, oi.platform, oi.zarfiat,
		       g.active, g.price_mode::text, g.profit_margin_pct,
		       gp.price_toman, gbp.base_usd::float8
		FROM game_returns gr
		JOIN order_items oi ON oi.id = gr.order_item_id
		JOIN games g ON g.id = oi.game_id
		LEFT JOIN game_prices gp
		  ON gp.game_id = oi.game_id AND gp.platform = oi.platform AND gp.zarfiat = oi.zarfiat
		LEFT JOIN game_base_prices gbp
		  ON gbp.game_id = oi.game_id AND gbp.platform = oi.platform
		  AND (cardinality(gbp.capacities) = 0 OR oi.zarfiat = ANY(gbp.capacities))
		WHERE gr.id = $1
		FOR UPDATE OF gr
	`, returnID).Scan(&status, &userID, &oldVideo, &console, &capacity,
		&pi.active, &pi.priceMode, &pi.margin, &pi.priceTmn, &pi.baseUSD)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrReturnNotFound
	}
	if err != nil {
		return "", fmt.Errorf("approveReturn load: %w", err)
	}
	if status != "pending" {
		return "", ErrNotReviewable
	}

	// Cap the credit: never more than the game's current full price (the fee only
	// ever reduces it). When the game/capacity is delisted there is no price to
	// bound against, so fall back to an absolute sanity ceiling.
	maxCredit := MaxReturnCreditToman
	if price, ok := currentPrice(pi, console, capacity, rate, catalog); ok {
		maxCredit = price
	}
	if creditAmount > maxCredit {
		return "", ErrCreditTooLarge
	}

	if _, err := tx.Exec(ctx, `
		UPDATE game_returns
		SET status = 'approved', credit_amount = $1, reviewed_by = $2, reviewed_at = NOW(),
		    updated_at = NOW(), video_filename = NULL
		WHERE id = $3
	`, creditAmount, adminID, returnID); err != nil {
		return "", fmt.Errorf("approveReturn update: %w", err)
	}
	if _, err := tx.Exec(ctx,
		"UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2",
		creditAmount, userID); err != nil {
		return "", fmt.Errorf("approveReturn credit wallet: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO wallet_transactions (user_id, amount, reason, ref_type, ref_id)
		VALUES ($1, $2, 'return_credit', 'return', $3)
	`, userID, creditAmount, returnID); err != nil {
		return "", fmt.Errorf("approveReturn ledger: %w", err)
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionReturnApprove,
		TargetType: "return",
		TargetID:   returnID,
		Metadata:   map[string]any{"credit_amount": creditAmount, "user_id": userID},
	}); err != nil {
		return "", fmt.Errorf("approveReturn: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("approveReturn commit: %w", err)
	}
	if oldVideo != nil {
		return *oldVideo, nil
	}
	return "", nil
}

// reviewReturn sets a pending return to rejected (fixable: the user can re-upload)
// or refused (terminal: no credit, account forfeited), storing the Persian reason
// the buyer will see. Guarded on status='pending'.
func reviewReturn(ctx context.Context, db *pgxpool.Pool, adminID, returnID, reason string, terminal bool) error {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return ErrReasonRequired
	}
	if len(reason) > maxReasonLen {
		reason = reason[:maxReasonLen]
	}

	newStatus := "rejected"
	action := audit.ActionReturnReject
	if terminal {
		newStatus = "refused"
		action = audit.ActionReturnRefuse
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("reviewReturn begin: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE game_returns
		SET status = $1, reason = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
		WHERE id = $4 AND status = 'pending'
	`, newStatus, reason, adminID, returnID)
	if err != nil {
		return fmt.Errorf("reviewReturn update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		// Either the return doesn't exist or it isn't pending anymore.
		var exists bool
		if err := tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM game_returns WHERE id = $1)", returnID).Scan(&exists); err != nil {
			return fmt.Errorf("reviewReturn exists: %w", err)
		}
		if !exists {
			return ErrReturnNotFound
		}
		return ErrNotReviewable
	}

	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     action,
		TargetType: "return",
		TargetID:   returnID,
		Metadata:   map[string]any{"status": newStatus},
	}); err != nil {
		return fmt.Errorf("reviewReturn: %w", err)
	}
	return tx.Commit(ctx)
}

// isUniqueViolation reports whether err is a Postgres unique-constraint error.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
