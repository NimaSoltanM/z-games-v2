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
	"github.com/soltanmohammdi/z-games/internal/shared/pricing"
	"github.com/soltanmohammdi/z-games/internal/shared/release"
)

var (
	ErrCartEmpty   = errors.New("CART_EMPTY")
	ErrInvalidCart = errors.New("CART_INVALID")
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
	if baseUSD == nil || rate <= 0 {
		return 0, false
	}
	cn, ok := catalog.Console(console)
	if !ok {
		return 0, false
	}
	cp, ok := catalog.Capacity(console, capacity)
	if !ok {
		return 0, false
	}
	p := pricing.TierToman(*baseUSD, cn.Margin(marginOverride), cp.SplitPct, rate)
	if p <= 0 {
		return 0, false
	}
	return p, true
}

func createPendingOrder(ctx context.Context, db *pgxpool.Pool, userID string, amount int, referralCode string, items []orderItem) (string, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("createPendingOrder begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var refArg any
	if referralCode != "" {
		refArg = referralCode
	}

	var orderID string
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (user_id, amount, status, referral_code)
		VALUES ($1, $2, 'pending', $3)
		RETURNING id
	`, userID, amount, refArg).Scan(&orderID)
	if err != nil {
		return "", fmt.Errorf("createPendingOrder insert: %w", err)
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
				return "", fmt.Errorf("createPendingOrder item: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("createPendingOrder commit: %w", err)
	}
	return orderID, nil
}

func setOrderAuthority(ctx context.Context, db *pgxpool.Pool, orderID, authority string) error {
	_, err := db.Exec(ctx,
		"UPDATE orders SET authority = $1, updated_at = NOW() WHERE id = $2",
		authority, orderID)
	return err
}

func failOrder(ctx context.Context, db *pgxpool.Pool, orderID string) error {
	_, err := db.Exec(ctx,
		"UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = $1 AND status = 'pending'",
		orderID)
	return err
}

type orderLookup struct {
	ID          string
	OrderNumber int64
	UserID      string
	Amount      int
	Status      string
}

func getOrderByAuthority(ctx context.Context, db *pgxpool.Pool, authority string) (*orderLookup, error) {
	var o orderLookup
	err := db.QueryRow(ctx,
		"SELECT id, order_number, user_id, amount, status FROM orders WHERE authority = $1",
		authority,
	).Scan(&o.ID, &o.OrderNumber, &o.UserID, &o.Amount, &o.Status)
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
	ID       string  `json:"id"`
	GameID   string  `json:"game_id"`
	GameName string  `json:"game_name"`
	Platform string  `json:"platform"`
	Zarfiat  string  `json:"zarfiat"`
	Quantity int     `json:"quantity"`
	PreOrder bool    `json:"pre_order"`
	Email    *string `json:"email"`
	Password *string `json:"password"`
	Passcode *string `json:"passcode"`
}

type OrderView struct {
	ID          string          `json:"id"`
	OrderNumber int64           `json:"order_number"`
	Amount      int             `json:"amount"`
	Status      string          `json:"status"`
	CreatedAt   time.Time       `json:"created_at"`
	Items       []OrderItemView `json:"items"`
}

// listUserOrders returns a page of the user's actual purchases (paid/fulfilled),
// newest first, each with its line items. An optional status ("paid" or
// "fulfilled") narrows the list. Returns the page and the total match count.
func listUserOrders(ctx context.Context, db *pgxpool.Pool, cred *credCipher, userID, status string, limit, offset int) ([]OrderView, int, error) {
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
		SELECT id, order_number, amount, status, created_at FROM orders %s
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
		if err := rows.Scan(&o.ID, &o.OrderNumber, &o.Amount, &o.Status, &o.CreatedAt); err != nil {
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
	if err := attachOrderItems(ctx, db, cred, ids, func(orderID string, it OrderItemView) {
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
func getUserOrder(ctx context.Context, db *pgxpool.Pool, cred *credCipher, userID, orderID string) (*OrderView, error) {
	var o OrderView
	err := db.QueryRow(ctx, `
		SELECT id, order_number, amount, status, created_at
		FROM orders
		WHERE id = $1 AND user_id = $2
	`, orderID, userID).Scan(&o.ID, &o.OrderNumber, &o.Amount, &o.Status, &o.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getUserOrder: %w", err)
	}
	o.Items = []OrderItemView{}
	if err := attachOrderItems(ctx, db, cred, []string{o.ID}, func(_ string, it OrderItemView) {
		o.Items = append(o.Items, it)
	}); err != nil {
		return nil, err
	}
	return &o, nil
}

// --- admin fulfillment -------------------------------------------------------

var (
	ErrOrderNotFound  = errors.New("ORDER_NOT_FOUND")
	ErrNotFulfillable = errors.New("ORDER_NOT_FULFILLABLE")
	ErrItemNotInOrder = errors.New("ITEM_NOT_IN_ORDER")
)

type AdminOrderView struct {
	OrderView
	UserPhone string  `json:"user_phone"`
	UserName  string  `json:"user_name"`
	Authority *string `json:"authority"` // for manually reconciling a stuck payment in ZarinPal
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
func listAdminOrders(ctx context.Context, db *pgxpool.Pool, cred *credCipher, f adminOrderFilter) ([]AdminOrderView, int, error) {
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
		SELECT o.id, o.order_number, o.amount, o.status, o.created_at, o.authority,
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
		if err := rows.Scan(&o.ID, &o.OrderNumber, &o.Amount, &o.Status, &o.CreatedAt, &o.Authority, &o.UserPhone, &o.UserName); err != nil {
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
	if err := attachOrderItems(ctx, db, cred, ids, func(orderID string, it OrderItemView) {
		if i, ok := byID[orderID]; ok {
			orders[i].Items = append(orders[i].Items, it)
		}
	}); err != nil {
		return nil, 0, err
	}
	return orders, total, nil
}

func getAdminOrder(ctx context.Context, db *pgxpool.Pool, cred *credCipher, orderID string) (*AdminOrderView, error) {
	var o AdminOrderView
	err := db.QueryRow(ctx, `
		SELECT o.id, o.order_number, o.amount, o.status, o.created_at, o.authority,
		       u.phone, TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))
		FROM orders o
		JOIN users u ON u.id = o.user_id
		WHERE o.id = $1
	`, orderID).Scan(&o.ID, &o.OrderNumber, &o.Amount, &o.Status, &o.CreatedAt, &o.Authority, &o.UserPhone, &o.UserName)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getAdminOrder: %w", err)
	}
	o.Items = []OrderItemView{}
	if err := attachOrderItems(ctx, db, cred, []string{o.ID}, func(_ string, it OrderItemView) {
		o.Items = append(o.Items, it)
	}); err != nil {
		return nil, err
	}
	return &o, nil
}

type credInput struct {
	ItemID   string
	Email    string
	Password string
	Passcode string
}

// fulfillOrder writes credentials onto the given items (scoped to the order) and
// flips the order to 'fulfilled' once every item has all three credentials
// (or back to 'paid' if any is cleared). Empty fields are stored as NULL.
func fulfillOrder(ctx context.Context, db *pgxpool.Pool, cred *credCipher, adminID, orderID string, items []credInput) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("fulfillOrder begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var status string
	err = tx.QueryRow(ctx, "SELECT status FROM orders WHERE id = $1", orderID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrOrderNotFound
	}
	if err != nil {
		return fmt.Errorf("fulfillOrder status: %w", err)
	}
	if status != "paid" && status != "fulfilled" {
		return ErrNotFulfillable
	}

	for _, it := range items {
		// Credentials are encrypted at rest; empty fields are stored as NULL.
		email, err := cred.encryptNullable(it.Email)
		if err != nil {
			return fmt.Errorf("fulfillOrder encrypt email: %w", err)
		}
		password, err := cred.encryptNullable(it.Password)
		if err != nil {
			return fmt.Errorf("fulfillOrder encrypt password: %w", err)
		}
		passcode, err := cred.encryptNullable(it.Passcode)
		if err != nil {
			return fmt.Errorf("fulfillOrder encrypt passcode: %w", err)
		}

		tag, err := tx.Exec(ctx, `
			UPDATE order_items SET email = $1, password = $2, passcode = $3
			WHERE id = $4 AND order_id = $5
		`, email, password, passcode, it.ItemID, orderID)
		if err != nil {
			return fmt.Errorf("fulfillOrder update item: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return ErrItemNotInOrder
		}
	}

	var incomplete int
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM order_items
		WHERE order_id = $1 AND (email IS NULL OR password IS NULL OR passcode IS NULL)
	`, orderID).Scan(&incomplete); err != nil {
		return fmt.Errorf("fulfillOrder completeness: %w", err)
	}

	newStatus := "paid"
	if incomplete == 0 {
		newStatus = "fulfilled"
	}
	if _, err := tx.Exec(ctx,
		"UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND status IN ('paid', 'fulfilled')",
		newStatus, orderID); err != nil {
		return fmt.Errorf("fulfillOrder status update: %w", err)
	}

	// Audit the action in the same transaction, so a delivery always has a record.
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionOrderFulfill,
		TargetType: "order",
		TargetID:   orderID,
		Metadata:   map[string]any{"status": newStatus, "items": len(items)},
	}); err != nil {
		return fmt.Errorf("fulfillOrder: %w", err)
	}

	return tx.Commit(ctx)
}

func attachOrderItems(ctx context.Context, db *pgxpool.Pool, cred *credCipher, orderIDs []string, add func(orderID string, it OrderItemView)) error {
	rows, err := db.Query(ctx, `
		SELECT order_id, id, game_id, game_name, platform, zarfiat, quantity, pre_order, email, password, passcode
		FROM order_items
		WHERE order_id = ANY($1)
		ORDER BY game_name
	`, orderIDs)
	if err != nil {
		return fmt.Errorf("attachOrderItems: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var orderID string
		var it OrderItemView
		if err := rows.Scan(&orderID, &it.ID, &it.GameID, &it.GameName, &it.Platform, &it.Zarfiat, &it.Quantity,
			&it.PreOrder, &it.Email, &it.Password, &it.Passcode); err != nil {
			return fmt.Errorf("attachOrderItems scan: %w", err)
		}

		// Credentials are stored encrypted — decrypt before handing them back.
		if it.Email, err = cred.decryptPtr(it.Email); err != nil {
			return fmt.Errorf("attachOrderItems decrypt email: %w", err)
		}
		if it.Password, err = cred.decryptPtr(it.Password); err != nil {
			return fmt.Errorf("attachOrderItems decrypt password: %w", err)
		}
		if it.Passcode, err = cred.decryptPtr(it.Passcode); err != nil {
			return fmt.Errorf("attachOrderItems decrypt passcode: %w", err)
		}

		add(orderID, it)
	}
	return rows.Err()
}
