package orders

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/audit"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/shared/credentialstate"
	"github.com/soltanmohammdi/z-games/internal/shared/pricing"
	"github.com/soltanmohammdi/z-games/internal/shared/release"
)

var (
	ErrCartEmpty          = errors.New("CART_EMPTY")
	ErrInvalidCart        = errors.New("CART_INVALID")
	ErrInsufficientWallet = errors.New("WALLET_INSUFFICIENT")
)

type orderItem struct {
	GameID   string
	GameName string
	Platform string
	Zarfiat  string
	Quantity int
	PreOrder bool // game was in its pre-order phase at checkout
}

// computeCart reads the user's cart and prices every line at CURRENT prices: a
// fixed game uses its stored per-tier Toman price; a dynamic game derives its
// tier price from its base USD price * rate * (1+margin) * split. Returns the
// items and the Toman total. Errors if the cart is empty or any item is no longer
// purchasable (inactive game, missing price, or closing pre-order window).
func computeCart(ctx context.Context, db *pgxpool.Pool, userID string) ([]orderItem, int, error) {
	rate, catalog, err := loadPricing(ctx, db)
	if err != nil {
		return nil, 0, err
	}

	rows, err := db.Query(ctx, `
		SELECT ci.game_id, g.name, ci.platform, ci.zarfiat, ci.quantity,
		       g.active, g.price_mode::text, gp.price_toman, gbp.base_usd::float8,
		       g.profit_margin_pct, g.release_status, g.release_date,
		       g.discount_pct, g.discount_starts_at, g.discount_ends_at
		FROM cart_items ci
		JOIN games g ON g.id = ci.game_id
		LEFT JOIN game_prices gp
		  ON gp.game_id = ci.game_id AND gp.platform = ci.platform AND gp.zarfiat = ci.zarfiat
		LEFT JOIN game_base_prices gbp
		  ON gbp.game_id = ci.game_id AND gbp.platform = ci.platform
		  AND (cardinality(gbp.capacities) = 0 OR ci.zarfiat = ANY(gbp.capacities))
		WHERE ci.user_id = $1
		ORDER BY ci.created_at ASC
	`, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("computeCart query: %w", err)
	}
	defer rows.Close()

	now := time.Now().UTC()
	var items []orderItem
	total := 0
	for rows.Next() {
		var (
			it            orderItem
			active        bool
			priceMode     string
			priceTmn      *int
			baseUSD       *float64
			marginPct     *int
			releaseStatus string
			releaseDate   *time.Time
			discountPct   *int
			discountStart *time.Time
			discountEnd   *time.Time
		)
		if err := rows.Scan(&it.GameID, &it.GameName, &it.Platform, &it.Zarfiat, &it.Quantity,
			&active, &priceMode, &priceTmn, &baseUSD, &marginPct, &releaseStatus, &releaseDate,
			&discountPct, &discountStart, &discountEnd); err != nil {
			return nil, 0, fmt.Errorf("computeCart scan: %w", err)
		}
		// Pre-order sales close in the window just before release, so an item that
		// slipped into that window is no longer purchasable — same as an inactive
		// game or missing price: we refuse to charge for it.
		phase := release.Phase(releaseStatus, releaseDate, now)
		if !release.Purchasable(phase) {
			return nil, 0, ErrInvalidCart
		}
		it.PreOrder = phase == release.PhasePreOrder
		price, ok := unitPrice(active, priceMode, baseUSD, marginPct, priceTmn, rate, catalog, it.Platform, it.Zarfiat)
		if !ok {
			return nil, 0, ErrInvalidCart
		}
		// Charge the discounted price when a discount is live, so the amount matches
		// what the storefront showed. Same window math as the public game response.
		price = pricing.ApplyDiscount(price, pricing.ActiveDiscountPct(discountPct, discountStart, discountEnd, now))
		if price <= 0 {
			return nil, 0, ErrInvalidCart
		}
		total += price * it.Quantity
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("computeCart rows: %w", err)
	}

	if len(items) == 0 {
		return nil, 0, ErrCartEmpty
	}
	if total <= 0 {
		return nil, 0, ErrInvalidCart
	}
	return items, total, nil
}

// loadPricing reads the exchange rate + the console/capacity catalog; the rate is 0
// (and the catalog whatever is seeded) if none has been saved yet.
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

func unitPrice(active bool, priceMode string, baseUSD *float64, marginOverride *int, priceTmn *int, rate int, catalog pricing.Catalog, console, capacity string) (int, bool) {
	if !active {
		return 0, false
	}
	if priceMode == "fixed" {
		if priceTmn == nil || *priceTmn <= 0 {
			return 0, false
		}
		return *priceTmn, true
	}
	// Dynamic: derive the capacity price from the game's base USD price, using the
	// console's margin and the capacity's split from the catalog.
	if baseUSD == nil {
		return 0, false
	}
	return catalog.TierTomanFor(console, capacity, *baseUSD, marginOverride, rate)
}

// createPendingOrder opens an order for `amount` (Toman, the full value) and
// reserves walletApplied of it from the buyer's wallet — deducting the balance and
// writing the spend ledger row in the same transaction. When the wallet covers the
// whole amount the order is created already 'paid' (no gateway step); otherwise it
// is 'pending' and the caller charges the (amount − walletApplied) remainder via
// ZarinPal. Returns the order id, its number, and whether it is already paid.
// ErrInsufficientWallet means the balance changed under us (a concurrent spend) —
// the guarded deduct found too little, so nothing was charged.
func createPendingOrder(ctx context.Context, db *pgxpool.Pool, userID string, amount, walletApplied int, referralCode string, items []orderItem) (orderID string, orderNumber int64, paid bool, err error) {
	paid = walletApplied >= amount
	status := "pending"
	if paid {
		status = "paid"
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return "", 0, false, fmt.Errorf("createPendingOrder begin: %w", err)
	}
	defer tx.Rollback(ctx)

	if walletApplied > 0 {
		tag, err := tx.Exec(ctx,
			"UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 AND wallet_balance >= $1",
			walletApplied, userID)
		if err != nil {
			return "", 0, false, fmt.Errorf("createPendingOrder wallet debit: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return "", 0, false, ErrInsufficientWallet
		}
	}

	var refArg any
	if referralCode != "" {
		refArg = referralCode
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO orders (user_id, amount, status, referral_code, wallet_applied)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, order_number
	`, userID, amount, status, refArg, walletApplied).Scan(&orderID, &orderNumber)
	if err != nil {
		return "", 0, false, fmt.Errorf("createPendingOrder insert: %w", err)
	}

	// Each unit is a distinct account we deliver, so a quantity-N cart line is
	// expanded into N order_items (quantity 1 each). That gives every account its
	// own credential slot at fulfillment instead of cramming N into one.
	for _, it := range items {
		for range it.Quantity {
			if _, err := tx.Exec(ctx, `
				INSERT INTO order_items (order_id, game_id, game_name, platform, zarfiat, quantity, pre_order)
				VALUES ($1, $2, $3, $4, $5, 1, $6)
			`, orderID, it.GameID, it.GameName, it.Platform, it.Zarfiat, it.PreOrder); err != nil {
				return "", 0, false, fmt.Errorf("createPendingOrder item: %w", err)
			}
		}
	}

	if walletApplied > 0 {
		if _, err := tx.Exec(ctx, `
			INSERT INTO wallet_transactions (user_id, amount, reason, ref_type, ref_id)
			VALUES ($1, $2, 'order_payment', 'order', $3)
		`, userID, -walletApplied, orderID); err != nil {
			return "", 0, false, fmt.Errorf("createPendingOrder wallet ledger: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return "", 0, false, fmt.Errorf("createPendingOrder commit: %w", err)
	}
	return orderID, orderNumber, paid, nil
}

func setOrderAuthority(ctx context.Context, db *pgxpool.Pool, orderID, authority string) error {
	_, err := db.Exec(ctx,
		"UPDATE orders SET authority = $1, updated_at = NOW() WHERE id = $2",
		authority, orderID)
	return err
}

// failOrder transitions a pending order to failed and refunds any wallet credit
// that was reserved for it, atomically. The pending→failed guard makes the refund
// happen exactly once, so a duplicate callback (cancel then verify-failed) can't
// double-credit the wallet. A no-op when the order isn't pending anymore.
func failOrder(ctx context.Context, db *pgxpool.Pool, orderID string) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failOrder begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var userID string
	var walletApplied int
	err = tx.QueryRow(ctx, `
		UPDATE orders SET status = 'failed', updated_at = NOW()
		WHERE id = $1 AND status = 'pending'
		RETURNING user_id, wallet_applied
	`, orderID).Scan(&userID, &walletApplied)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // already settled/failed — nothing to refund
	}
	if err != nil {
		return fmt.Errorf("failOrder update: %w", err)
	}

	if walletApplied > 0 {
		if _, err := tx.Exec(ctx,
			"UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2",
			walletApplied, userID); err != nil {
			return fmt.Errorf("failOrder refund: %w", err)
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO wallet_transactions (user_id, amount, reason, ref_type, ref_id)
			VALUES ($1, $2, 'order_refund', 'order', $3)
		`, userID, walletApplied, orderID); err != nil {
			return fmt.Errorf("failOrder refund ledger: %w", err)
		}
	}
	return tx.Commit(ctx)
}

type orderLookup struct {
	ID            string
	OrderNumber   int64
	UserID        string
	Amount        int
	WalletApplied int
	Status        string
	RefID         *int64
}

// GatewayAmount is what ZarinPal charged/verifies against: the order total minus
// the portion paid from the wallet.
func (o *orderLookup) GatewayAmount() int { return o.Amount - o.WalletApplied }

func (o *orderLookup) ReferenceID() int64 {
	if o.RefID == nil {
		return 0
	}
	return *o.RefID
}

func getOrderByAuthority(ctx context.Context, db *pgxpool.Pool, authority string) (*orderLookup, error) {
	var o orderLookup
	err := db.QueryRow(ctx,
		"SELECT id, order_number, user_id, amount, wallet_applied, status, ref_id FROM orders WHERE authority = $1",
		authority,
	).Scan(&o.ID, &o.OrderNumber, &o.UserID, &o.Amount, &o.WalletApplied, &o.Status, &o.RefID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getOrderByAuthority: %w", err)
	}
	return &o, nil
}

// markOrderPaid transitions pending -> paid exactly once. Returns true only when
// THIS call performed the transition, so the caller clears the cart a single time
// even if ZarinPal hits the callback twice (verify returns 101 the second time).
func markOrderPaid(ctx context.Context, db *pgxpool.Pool, orderID string, refID int64) (bool, error) {
	tag, err := db.Exec(ctx,
		"UPDATE orders SET status = 'paid', ref_id = $1, updated_at = NOW() WHERE id = $2 AND status = 'pending'",
		refID, orderID)
	if err != nil {
		return false, fmt.Errorf("markOrderPaid: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

func clearUserCart(ctx context.Context, db *pgxpool.Pool, userID string) error {
	_, err := db.Exec(ctx, "DELETE FROM cart_items WHERE user_id = $1", userID)
	return err
}

// --- reads (user dashboard) -------------------------------------------------

type OrderItemView struct {
	ID                  string                   `json:"id"`
	GameID              string                   `json:"game_id"`
	GameName            string                   `json:"game_name"`
	Platform            string                   `json:"platform"`
	Zarfiat             string                   `json:"zarfiat"`
	Quantity            int                      `json:"quantity"`
	PreOrder            bool                     `json:"pre_order"`
	CredentialsReturned bool                     `json:"credentials_returned"`
	Email               *string                  `json:"email"`
	Password            *string                  `json:"password"`
	Passcode            *string                  `json:"passcode"`
	VerificationCode    *VerificationSupportView `json:"verification_code"`
}

type OrderView struct {
	ID          string          `json:"id"`
	OrderNumber int64           `json:"order_number"`
	Amount      int             `json:"amount"`
	Status      string          `json:"status"`
	RefID       *int64          `json:"ref_id"`
	CreatedAt   time.Time       `json:"created_at"`
	Items       []OrderItemView `json:"items"`
}

// listUserOrders returns a page of the user's actual purchases (paid/fulfilled),
// newest first, each with its line items. An optional status ("paid" or
// "fulfilled") narrows the list. Returns the page and the total match count.
func listUserOrders(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, userID, status string, limit, offset int) ([]OrderView, int, error) {
	args := []any{userID}
	statusCond := "status IN ('paid', 'fulfilled')"
	if status == "paid" || status == "fulfilled" {
		args = append(args, status)
		statusCond = fmt.Sprintf("status = $%d", len(args))
	}
	where := "WHERE user_id = $1 AND " + statusCond

	var total int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) FROM orders "+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listUserOrders count: %w", err)
	}
	if total == 0 {
		return []OrderView{}, 0, nil
	}

	q := fmt.Sprintf(`
		SELECT id, order_number, amount, status, ref_id, created_at FROM orders %s
		ORDER BY created_at DESC LIMIT $%d OFFSET $%d
	`, where, len(args)+1, len(args)+2)
	rows, err := db.Query(ctx, q, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("listUserOrders: %w", err)
	}
	defer rows.Close()

	orders := make([]OrderView, 0)
	byID := make(map[string]int)
	for rows.Next() {
		var o OrderView
		if err := rows.Scan(&o.ID, &o.OrderNumber, &o.Amount, &o.Status, &o.RefID, &o.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("listUserOrders scan: %w", err)
		}
		o.Items = []OrderItemView{}
		byID[o.ID] = len(orders)
		orders = append(orders, o)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("listUserOrders rows: %w", err)
	}

	ids := make([]string, 0, len(orders))
	for _, o := range orders {
		ids = append(ids, o.ID)
	}
	if err := attachOrderItems(ctx, db, cred, ids, false, func(orderID string, it OrderItemView) {
		if i, ok := byID[orderID]; ok {
			orders[i].Items = append(orders[i].Items, it)
		}
	}); err != nil {
		return nil, 0, err
	}
	return orders, total, nil
}

// getUserOrder returns a single order owned by the user (any status), or nil if
// it doesn't exist or belongs to someone else.
func getUserOrder(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, userID, orderID string) (*OrderView, error) {
	var o OrderView
	err := db.QueryRow(ctx, `
		SELECT id, order_number, amount, status, ref_id, created_at
		FROM orders
		WHERE id = $1 AND user_id = $2
	`, orderID, userID).Scan(&o.ID, &o.OrderNumber, &o.Amount, &o.Status, &o.RefID, &o.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getUserOrder: %w", err)
	}
	o.Items = []OrderItemView{}
	if err := attachOrderItems(ctx, db, cred, []string{o.ID}, false, func(_ string, it OrderItemView) {
		o.Items = append(o.Items, it)
	}); err != nil {
		return nil, err
	}
	if err := attachVerificationSupport(ctx, db, cred, userID, o.Status, o.Items); err != nil {
		return nil, err
	}
	return &o, nil
}

// --- admin fulfillment -------------------------------------------------------

var (
	ErrOrderNotFound         = errors.New("ORDER_NOT_FOUND")
	ErrNotFulfillable        = errors.New("ORDER_NOT_FULFILLABLE")
	ErrItemNotInOrder        = errors.New("ITEM_NOT_IN_ORDER")
	ErrReturnNotFound        = errors.New("RETURN_NOT_FOUND")
	ErrReturnUnavailable     = errors.New("RETURN_UNAVAILABLE") // not approved, or already reused
	ErrReturnMismatch        = errors.New("RETURN_MISMATCH")    // game/console/capacity differs from the item
	ErrReturnedItemImmutable = errors.New("RETURNED_ITEM_IMMUTABLE")
)

type AdminOrderView struct {
	OrderView
	UserPhone string  `json:"user_phone"`
	UserName  string  `json:"user_name"`
	Authority *string `json:"authority"` // for manually reconciling a stuck payment in ZarinPal
	// Inventory maps an undelivered item's id to the returned accounts that can fill
	// it (same game + console + capacity), so the admin reuses returned stock instead
	// of sourcing a new account. Empty unless there is matching available stock.
	Inventory map[string][]InventoryAccount `json:"inventory"`
}

// InventoryAccount is one reusable returned account offered for an order item.
type InventoryAccount struct {
	ReturnID   string    `json:"return_id"`
	ReturnedAt time.Time `json:"returned_at"`
}

// adminOrderFilter narrows the admin queue. Status "" is the default queue
// (paid + payment-review pending + fulfilled); "paid"/"pending"/"fulfilled"
// select one group. Search matches the buyer's phone or name.
type adminOrderFilter struct {
	status string
	search string
	limit  int
	offset int
}

// listAdminOrders returns a page of the admin queue ordered awaiting-fulfillment
// (paid) first, then payment-review (pending, older than the gateway window),
// then delivered (fulfilled). Returns the page and the total match count.
func listAdminOrders(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, f adminOrderFilter) ([]AdminOrderView, int, error) {
	var conds []string
	var args []any

	switch f.status {
	case "paid", "fulfilled":
		args = append(args, f.status)
		conds = append(conds, fmt.Sprintf("o.status = $%d", len(args)))
	case "pending":
		conds = append(conds, "(o.status = 'pending' AND o.created_at < NOW() - INTERVAL '10 minutes')")
	default:
		conds = append(conds, "(o.status IN ('paid', 'fulfilled') OR (o.status = 'pending' AND o.created_at < NOW() - INTERVAL '10 minutes'))")
	}

	if f.search != "" {
		args = append(args, "%"+f.search+"%")
		conds = append(conds, fmt.Sprintf(
			"(u.phone ILIKE $%d OR TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) ILIKE $%d OR CAST(o.order_number AS TEXT) ILIKE $%d)",
			len(args), len(args), len(args)))
	}

	where := "WHERE " + strings.Join(conds, " AND ")

	var total int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM orders o JOIN users u ON u.id = o.user_id "+where, args...,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listAdminOrders count: %w", err)
	}
	if total == 0 {
		return []AdminOrderView{}, 0, nil
	}

	q := fmt.Sprintf(`
		SELECT o.id, o.order_number, o.amount, o.status, o.ref_id, o.created_at, o.authority,
		       u.phone, TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))
		FROM orders o
		JOIN users u ON u.id = o.user_id
		%s
		ORDER BY
		    CASE o.status WHEN 'paid' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
		    o.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)+1, len(args)+2)
	rows, err := db.Query(ctx, q, append(args, f.limit, f.offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("listAdminOrders: %w", err)
	}
	defer rows.Close()

	orders := make([]AdminOrderView, 0)
	byID := make(map[string]int)
	for rows.Next() {
		var o AdminOrderView
		if err := rows.Scan(&o.ID, &o.OrderNumber, &o.Amount, &o.Status, &o.RefID, &o.CreatedAt, &o.Authority, &o.UserPhone, &o.UserName); err != nil {
			return nil, 0, fmt.Errorf("listAdminOrders scan: %w", err)
		}
		o.Items = []OrderItemView{}
		byID[o.ID] = len(orders)
		orders = append(orders, o)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("listAdminOrders rows: %w", err)
	}

	ids := make([]string, 0, len(orders))
	for _, o := range orders {
		ids = append(ids, o.ID)
	}
	if err := attachOrderItems(ctx, db, cred, ids, true, func(orderID string, it OrderItemView) {
		if i, ok := byID[orderID]; ok {
			orders[i].Items = append(orders[i].Items, it)
		}
	}); err != nil {
		return nil, 0, err
	}
	return orders, total, nil
}

func getAdminOrder(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, orderID string) (*AdminOrderView, error) {
	var o AdminOrderView
	err := db.QueryRow(ctx, `
		SELECT o.id, o.order_number, o.amount, o.status, o.ref_id, o.created_at, o.authority,
		       u.phone, TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))
		FROM orders o
		JOIN users u ON u.id = o.user_id
		WHERE o.id = $1
	`, orderID).Scan(&o.ID, &o.OrderNumber, &o.Amount, &o.Status, &o.RefID, &o.CreatedAt, &o.Authority, &o.UserPhone, &o.UserName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getAdminOrder: %w", err)
	}
	o.Items = []OrderItemView{}
	if err := attachOrderItems(ctx, db, cred, []string{o.ID}, true, func(_ string, it OrderItemView) {
		o.Items = append(o.Items, it)
	}); err != nil {
		return nil, err
	}
	inv, err := attachReturnInventory(ctx, db, o.Items)
	if err != nil {
		return nil, err
	}
	o.Inventory = inv
	return &o, nil
}

// attachReturnInventory finds, for each UNDELIVERED item in the list, the returned
// accounts available to reuse for it (approved + not yet reused, matching the
// item's game + console + capacity). Items already delivered are skipped. Returns a
// map keyed by item id; the same account appears under every matching item until
// it's reused (the page refetches after each reuse, so it then drops off).
func attachReturnInventory(ctx context.Context, db *pgxpool.Pool, items []OrderItemView) (map[string][]InventoryAccount, error) {
	// Only items still missing credentials can be fulfilled from stock.
	pending := make([]OrderItemView, 0, len(items))
	gameIDs := make([]string, 0, len(items))
	seen := map[string]bool{}
	for _, it := range items {
		if it.Email != nil && it.Password != nil && it.Passcode != nil {
			continue
		}
		pending = append(pending, it)
		if !seen[it.GameID] {
			seen[it.GameID] = true
			gameIDs = append(gameIDs, it.GameID)
		}
	}
	out := map[string][]InventoryAccount{}
	if len(pending) == 0 {
		return out, nil
	}

	// One query for all available stock of the order's games; matched to items in Go.
	rows, err := db.Query(ctx, `
		SELECT gr.id, gr.created_at, src.game_id, src.platform, src.zarfiat
		FROM game_returns gr
		JOIN order_items src ON src.id = gr.order_item_id
		WHERE gr.status = 'approved'
		  AND gr.reused_at IS NULL
		  AND gr.inventory_disabled_at IS NULL
		  AND src.game_id = ANY($1)
		ORDER BY gr.created_at ASC
	`, gameIDs)
	if err != nil {
		return nil, fmt.Errorf("attachReturnInventory: %w", err)
	}
	defer rows.Close()

	type stock struct {
		acc                       InventoryAccount
		gameID, platform, zarfiat string
	}
	var available []stock
	for rows.Next() {
		var s stock
		if err := rows.Scan(&s.acc.ReturnID, &s.acc.ReturnedAt, &s.gameID, &s.platform, &s.zarfiat); err != nil {
			return nil, fmt.Errorf("attachReturnInventory scan: %w", err)
		}
		available = append(available, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("attachReturnInventory rows: %w", err)
	}

	for _, it := range pending {
		for _, s := range available {
			if s.gameID == it.GameID && s.platform == it.Platform && s.zarfiat == it.Zarfiat {
				out[it.ID] = append(out[it.ID], s.acc)
			}
		}
	}
	return out, nil
}

type credInput struct {
	ItemID   string
	Email    string
	Password string
	Passcode string
}

type CredentialMatch struct {
	OrderID     string `json:"order_id"`
	OrderNumber int64  `json:"order_number"`
	ItemID      string `json:"item_id"`
	GameName    string `json:"game_name"`
	Console     string `json:"console"`
	Capacity    string `json:"capacity"`
}

type CredentialWarning struct {
	ItemID  string            `json:"item_id"`
	Email   string            `json:"email"`
	Matches []CredentialMatch `json:"matches"`
}

type fulfillmentItem struct {
	ID       string
	GameName string
	Console  string
	Capacity string
	Returned bool
}

// fulfillOrder writes credentials onto the given items (scoped to the order) and
// flips the order to 'fulfilled' once every item has all three credentials
// (or back to 'paid' if any is cleared). Empty fields are stored as NULL.
func fulfillOrder(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, adminID, orderID string, items []credInput, allowDuplicate bool) ([]CredentialWarning, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("fulfillOrder begin: %w", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", credentialstate.FulfillmentAdvisoryLockKey); err != nil {
		return nil, fmt.Errorf("fulfillOrder lock: %w", err)
	}

	var (
		status      string
		orderNumber int64
	)
	err = tx.QueryRow(ctx, "SELECT status, order_number FROM orders WHERE id = $1 FOR UPDATE", orderID).Scan(&status, &orderNumber)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrOrderNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("fulfillOrder status: %w", err)
	}
	if status != "paid" && status != "fulfilled" {
		return nil, ErrNotFulfillable
	}

	rows, err := tx.Query(ctx, `
		SELECT oi.id, oi.game_name, oi.platform, oi.zarfiat,
		       COALESCE(gr.status IN ('approved', 'refused'), false)
		FROM order_items oi
		LEFT JOIN game_returns gr ON gr.order_item_id = oi.id
		WHERE oi.order_id = $1
		FOR UPDATE OF oi
	`, orderID)
	if err != nil {
		return nil, fmt.Errorf("fulfillOrder items: %w", err)
	}
	orderItems := make(map[string]fulfillmentItem)
	for rows.Next() {
		var it fulfillmentItem
		if err := rows.Scan(&it.ID, &it.GameName, &it.Console, &it.Capacity, &it.Returned); err != nil {
			rows.Close()
			return nil, fmt.Errorf("fulfillOrder items scan: %w", err)
		}
		orderItems[it.ID] = it
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, fmt.Errorf("fulfillOrder items rows: %w", err)
	}
	rows.Close()

	excluded := make(map[string]struct{}, len(items))
	wanted := make(map[string]struct{})
	identities := make(map[string]string)
	for _, input := range items {
		if _, exists := excluded[input.ItemID]; exists {
			return nil, ErrItemNotInOrder
		}
		meta, exists := orderItems[input.ItemID]
		if !exists {
			return nil, ErrItemNotInOrder
		}
		if meta.Returned {
			return nil, ErrReturnedItemImmutable
		}
		excluded[input.ItemID] = struct{}{}
		if input.Email != "" && input.Password != "" && input.Passcode != "" {
			identity := credentialstate.AccountIdentity(input.Email, meta.Console)
			wanted[identity] = struct{}{}
			if _, exists := identities[identity]; !exists {
				identities[identity] = input.ItemID
			}
		}
	}

	holders, err := credentialstate.ActiveHolders(ctx, tx, cred, wanted, excluded)
	if err != nil {
		return nil, err
	}
	warnings := duplicateWarnings(orderID, orderNumber, items, orderItems, holders)
	if len(warnings) > 0 && !allowDuplicate {
		return warnings, nil
	}

	for _, it := range items {
		// Credentials are encrypted at rest; empty fields are stored as NULL.
		email, err := cred.EncryptNullable(it.Email)
		if err != nil {
			return nil, fmt.Errorf("fulfillOrder encrypt email: %w", err)
		}
		password, err := cred.EncryptNullable(it.Password)
		if err != nil {
			return nil, fmt.Errorf("fulfillOrder encrypt password: %w", err)
		}
		passcode, err := cred.EncryptNullable(it.Passcode)
		if err != nil {
			return nil, fmt.Errorf("fulfillOrder encrypt passcode: %w", err)
		}

		tag, err := tx.Exec(ctx, `
			UPDATE order_items SET email = $1, password = $2, passcode = $3
			WHERE id = $4 AND order_id = $5
		`, email, password, passcode, it.ItemID, orderID)
		if err != nil {
			return nil, fmt.Errorf("fulfillOrder update item: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return nil, ErrItemNotInOrder
		}
	}

	consumed, err := consumeReturnedAccountsByIdentity(ctx, tx, cred, adminID, orderID, identities, "manual_credentials")
	if err != nil {
		return nil, err
	}

	var incomplete int
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM order_items
		WHERE order_id = $1 AND (email IS NULL OR password IS NULL OR passcode IS NULL)
	`, orderID).Scan(&incomplete); err != nil {
		return nil, fmt.Errorf("fulfillOrder completeness: %w", err)
	}

	newStatus := "paid"
	if incomplete == 0 {
		newStatus = "fulfilled"
	}
	if _, err := tx.Exec(ctx,
		"UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND status IN ('paid', 'fulfilled')",
		newStatus, orderID); err != nil {
		return nil, fmt.Errorf("fulfillOrder status update: %w", err)
	}

	// Audit the action in the same transaction, so a delivery always has a record.
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionOrderFulfill,
		TargetType: "order",
		TargetID:   orderID,
		Metadata: map[string]any{
			"status": newStatus, "items": len(items),
			"duplicate_override": len(warnings), "returned_accounts_consumed": consumed,
		},
	}); err != nil {
		return nil, fmt.Errorf("fulfillOrder: %w", err)
	}

	return nil, tx.Commit(ctx)
}

func duplicateWarnings(orderID string, orderNumber int64, inputs []credInput, items map[string]fulfillmentItem, holders map[string][]credentialstate.Holder) []CredentialWarning {
	byIdentity := make(map[string][]credInput)
	for _, input := range inputs {
		if input.Email == "" || input.Password == "" || input.Passcode == "" {
			continue
		}
		identity := credentialstate.AccountIdentity(input.Email, items[input.ItemID].Console)
		byIdentity[identity] = append(byIdentity[identity], input)
	}

	warnings := make([]CredentialWarning, 0)
	for identity, group := range byIdentity {
		for _, input := range group {
			matches := make([]CredentialMatch, 0, len(holders[identity])+len(group)-1)
			for _, holder := range holders[identity] {
				matches = append(matches, CredentialMatch{
					OrderID: holder.OrderID, OrderNumber: holder.OrderNumber, ItemID: holder.ItemID,
					GameName: holder.GameName, Console: holder.Console, Capacity: holder.Capacity,
				})
			}
			for _, other := range group {
				if other.ItemID == input.ItemID {
					continue
				}
				meta := items[other.ItemID]
				matches = append(matches, CredentialMatch{
					OrderID: orderID, OrderNumber: orderNumber, ItemID: other.ItemID,
					GameName: meta.GameName, Console: meta.Console, Capacity: meta.Capacity,
				})
			}
			if len(matches) > 0 {
				warnings = append(warnings, CredentialWarning{ItemID: input.ItemID, Email: input.Email, Matches: matches})
			}
		}
	}
	return warnings
}

// consumeReturnedAccountsByIdentity closes every available inventory row for an
// account that was manually pasted into fulfillment. This prevents the same login
// remaining advertised as stock merely because the admin did not use the explicit
// reuse button. Identity spans games, capacities, and console generations within
// one account ecosystem, but never collides across unrelated ecosystems.
func consumeReturnedAccountsByIdentity(ctx context.Context, tx pgx.Tx, cred *credentials.Cipher, adminID, orderID string, identityTargets map[string]string, mode string) (int, error) {
	if len(identityTargets) == 0 {
		return 0, nil
	}
	rows, err := tx.Query(ctx, `
		SELECT gr.id, gr.order_item_id, src.email, src.platform
		FROM game_returns gr
		JOIN order_items src ON src.id = gr.order_item_id
		WHERE gr.status = 'approved'
		  AND gr.reused_at IS NULL
		  AND gr.inventory_disabled_at IS NULL
		FOR UPDATE OF gr
	`)
	if err != nil {
		return 0, fmt.Errorf("consumeReturnedAccountsByIdentity: %w", err)
	}
	type candidate struct{ returnID, sourceItemID, identity, platform string }
	var candidates []candidate
	for rows.Next() {
		var c candidate
		var encryptedEmail *string
		if err := rows.Scan(&c.returnID, &c.sourceItemID, &encryptedEmail, &c.platform); err != nil {
			rows.Close()
			return 0, fmt.Errorf("consumeReturnedAccountsByIdentity scan: %w", err)
		}
		email, err := cred.DecryptPtr(encryptedEmail)
		if err != nil {
			rows.Close()
			return 0, fmt.Errorf("consumeReturnedAccountsByIdentity decrypt email: %w", err)
		}
		if email != nil {
			c.identity = credentialstate.AccountIdentity(*email, c.platform)
			candidates = append(candidates, c)
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, fmt.Errorf("consumeReturnedAccountsByIdentity rows: %w", err)
	}
	rows.Close()

	consumed := 0
	for _, c := range candidates {
		targetItemID, match := identityTargets[c.identity]
		if !match || targetItemID == c.sourceItemID {
			continue
		}
		tag, err := tx.Exec(ctx, `
			UPDATE game_returns
			SET reused_at = NOW(), reused_for_item_id = $1, updated_at = NOW()
			WHERE id = $2 AND reused_at IS NULL AND inventory_disabled_at IS NULL
		`, targetItemID, c.returnID)
		if err != nil {
			return 0, fmt.Errorf("consumeReturnedAccountsByIdentity update: %w", err)
		}
		if tag.RowsAffected() == 0 {
			continue
		}
		consumed++
		if err := audit.Record(ctx, tx, audit.Entry{
			AdminID: adminID, Action: audit.ActionReturnReuse, TargetType: "return", TargetID: c.returnID,
			Metadata: map[string]any{"order_id": orderID, "order_item_id": targetItemID, "mode": mode},
		}); err != nil {
			return 0, fmt.Errorf("consumeReturnedAccountsByIdentity audit: %w", err)
		}
	}
	return consumed, nil
}

// reuseReturnedAccount fulfills one order item from returned-account inventory: it
// copies the returned account's (already-encrypted, same-key) credentials onto the
// item, marks the source return consumed, recomputes the order's fulfillment
// status, and audits — atomically. The return must be approved, not yet reused, and
// match the item's game + console + capacity exactly.
func reuseReturnedAccount(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, adminID, orderID, itemID, returnID string, allowDuplicate bool) ([]CredentialWarning, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("reuseReturnedAccount begin: %w", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", credentialstate.FulfillmentAdvisoryLockKey); err != nil {
		return nil, fmt.Errorf("reuseReturnedAccount lock: %w", err)
	}

	// Target item + its order status.
	var tGame, tPlatform, tZarfiat, orderStatus string
	var targetReturned bool
	err = tx.QueryRow(ctx, `
		SELECT oi.game_id, oi.platform, oi.zarfiat, o.status,
		       COALESCE(target_return.status IN ('approved', 'refused'), false)
		FROM order_items oi JOIN orders o ON o.id = oi.order_id
		LEFT JOIN game_returns target_return ON target_return.order_item_id = oi.id
		WHERE oi.id = $1 AND oi.order_id = $2
		FOR UPDATE OF oi, o
	`, itemID, orderID).Scan(&tGame, &tPlatform, &tZarfiat, &orderStatus, &targetReturned)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrItemNotInOrder
	}
	if err != nil {
		return nil, fmt.Errorf("reuseReturnedAccount target: %w", err)
	}
	if orderStatus != "paid" && orderStatus != "fulfilled" {
		return nil, ErrNotFulfillable
	}
	if targetReturned {
		return nil, ErrReturnedItemImmutable
	}

	// Source returned account (locked), with its credentials + match key.
	var (
		status                     string
		reusedAt, disabledAt       *time.Time
		email, pass, code          *string
		sGame, sPlatform, sZarfiat string
	)
	err = tx.QueryRow(ctx, `
		SELECT gr.status, gr.reused_at, gr.inventory_disabled_at,
		       src.email, src.password, src.passcode,
		       src.game_id, src.platform, src.zarfiat
		FROM game_returns gr JOIN order_items src ON src.id = gr.order_item_id
		WHERE gr.id = $1
		FOR UPDATE OF gr
	`, returnID).Scan(&status, &reusedAt, &disabledAt, &email, &pass, &code, &sGame, &sPlatform, &sZarfiat)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrReturnNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("reuseReturnedAccount source: %w", err)
	}
	if status != "approved" || reusedAt != nil || disabledAt != nil {
		return nil, ErrReturnUnavailable
	}
	// Defensive: an approved return always comes from a fully delivered account, but
	// never copy a partial/blank credential set onto the new item (which would
	// consume inventory without actually delivering).
	if email == nil || pass == nil || code == nil {
		return nil, ErrReturnUnavailable
	}
	if sGame != tGame || sPlatform != tPlatform || sZarfiat != tZarfiat {
		return nil, ErrReturnMismatch
	}

	plainEmail, err := cred.DecryptPtr(email)
	if err != nil {
		return nil, fmt.Errorf("reuseReturnedAccount decrypt email: %w", err)
	}
	if plainEmail == nil {
		return nil, ErrReturnUnavailable
	}
	identity := credentialstate.AccountIdentity(*plainEmail, tPlatform)
	holders, err := credentialstate.ActiveHolders(ctx, tx, cred,
		map[string]struct{}{identity: {}}, map[string]struct{}{itemID: {}})
	if err != nil {
		return nil, err
	}
	var warnings []CredentialWarning
	if active := holders[identity]; len(active) > 0 {
		matches := make([]CredentialMatch, 0, len(active))
		for _, holder := range active {
			matches = append(matches, CredentialMatch{
				OrderID: holder.OrderID, OrderNumber: holder.OrderNumber, ItemID: holder.ItemID,
				GameName: holder.GameName, Console: holder.Console, Capacity: holder.Capacity,
			})
		}
		warnings = []CredentialWarning{{ItemID: itemID, Email: *plainEmail, Matches: matches}}
		if !allowDuplicate {
			return warnings, nil
		}
	}

	// Copy the (already-encrypted, same-key) credentials onto the new item.
	if _, err := tx.Exec(ctx,
		"UPDATE order_items SET email = $1, password = $2, passcode = $3 WHERE id = $4 AND order_id = $5",
		email, pass, code, itemID, orderID); err != nil {
		return nil, fmt.Errorf("reuseReturnedAccount copy creds: %w", err)
	}

	consumed, err := consumeReturnedAccountsByIdentity(ctx, tx, cred, adminID, orderID,
		map[string]string{identity: itemID}, "inventory_button")
	if err != nil {
		return nil, err
	}
	if consumed == 0 {
		return nil, ErrReturnUnavailable
	}

	// Recompute fulfillment: fulfilled once every item has all three credentials.
	var incomplete int
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM order_items
		WHERE order_id = $1 AND (email IS NULL OR password IS NULL OR passcode IS NULL)
	`, orderID).Scan(&incomplete); err != nil {
		return nil, fmt.Errorf("reuseReturnedAccount completeness: %w", err)
	}
	newStatus := "paid"
	if incomplete == 0 {
		newStatus = "fulfilled"
	}
	if _, err := tx.Exec(ctx,
		"UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND status IN ('paid','fulfilled')",
		newStatus, orderID); err != nil {
		return nil, fmt.Errorf("reuseReturnedAccount status: %w", err)
	}
	if len(warnings) > 0 {
		if err := audit.Record(ctx, tx, audit.Entry{
			AdminID: adminID, Action: audit.ActionOrderFulfill, TargetType: "order", TargetID: orderID,
			Metadata: map[string]any{"status": newStatus, "items": 1, "duplicate_override": len(warnings)},
		}); err != nil {
			return nil, fmt.Errorf("reuseReturnedAccount duplicate audit: %w", err)
		}
	}
	return nil, tx.Commit(ctx)
}

func attachOrderItems(ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, orderIDs []string, includeReturnedCredentials bool, add func(orderID string, it OrderItemView)) error {
	rows, err := db.Query(ctx, `
		SELECT oi.order_id, oi.id, oi.game_id, oi.game_name, oi.platform, oi.zarfiat,
		       oi.quantity, oi.pre_order, oi.email, oi.password, oi.passcode, gr.status
		FROM order_items oi
		LEFT JOIN game_returns gr ON gr.order_item_id = oi.id
		WHERE oi.order_id = ANY($1)
		ORDER BY oi.game_name
	`, orderIDs)
	if err != nil {
		return fmt.Errorf("attachOrderItems: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var orderID string
		var it OrderItemView
		var returnStatus *string
		if err := rows.Scan(&orderID, &it.ID, &it.GameID, &it.GameName, &it.Platform, &it.Zarfiat, &it.Quantity,
			&it.PreOrder, &it.Email, &it.Password, &it.Passcode, &returnStatus); err != nil {
			return fmt.Errorf("attachOrderItems scan: %w", err)
		}

		// Credentials are stored encrypted — decrypt before handing them back.
		if it.Email, err = cred.DecryptPtr(it.Email); err != nil {
			return fmt.Errorf("attachOrderItems decrypt email: %w", err)
		}
		if it.Password, err = cred.DecryptPtr(it.Password); err != nil {
			return fmt.Errorf("attachOrderItems decrypt password: %w", err)
		}
		if it.Passcode, err = cred.DecryptPtr(it.Passcode); err != nil {
			return fmt.Errorf("attachOrderItems decrypt passcode: %w", err)
		}
		it.CredentialsReturned = returnStatus != nil && (*returnStatus == "approved" || *returnStatus == "refused")
		if it.CredentialsReturned && !includeReturnedCredentials {
			it.Email, it.Password, it.Passcode = nil, nil, nil
		}

		add(orderID, it)
	}
	return rows.Err()
}
