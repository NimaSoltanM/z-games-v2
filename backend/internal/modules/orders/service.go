package orders

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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
}

// computeCart reads the user's cart and prices every line at CURRENT prices
// (dynamic = price_usd * exchange rate, fixed = price_toman). Returns the items
// and the total in Toman. Errors if the cart is empty or any item is no longer
// purchasable (inactive game or missing price) — we never charge for those.
func computeCart(ctx context.Context, db *pgxpool.Pool, userID string) ([]orderItem, int, error) {
	var rate int
	err := db.QueryRow(ctx, "SELECT usd_to_toman FROM exchange_rate WHERE id = 1").Scan(&rate)
	if errors.Is(err, pgx.ErrNoRows) {
		rate = 0
	} else if err != nil {
		return nil, 0, fmt.Errorf("computeCart rate: %w", err)
	}

	rows, err := db.Query(ctx, `
		SELECT ci.game_id, g.name, ci.platform, ci.zarfiat, ci.quantity,
		       g.active, g.price_mode::text, gp.price_usd::float8, gp.price_toman
		FROM cart_items ci
		JOIN games g ON g.id = ci.game_id
		LEFT JOIN game_prices gp
		  ON gp.game_id = ci.game_id AND gp.platform = ci.platform AND gp.zarfiat = ci.zarfiat
		WHERE ci.user_id = $1
		ORDER BY ci.created_at ASC
	`, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("computeCart query: %w", err)
	}
	defer rows.Close()

	var items []orderItem
	total := 0
	for rows.Next() {
		var (
			it        orderItem
			active    bool
			priceMode string
			priceUSD  *float64
			priceTmn  *int
		)
		if err := rows.Scan(&it.GameID, &it.GameName, &it.Platform, &it.Zarfiat, &it.Quantity,
			&active, &priceMode, &priceUSD, &priceTmn); err != nil {
			return nil, 0, fmt.Errorf("computeCart scan: %w", err)
		}
		price, ok := unitPrice(active, priceMode, priceUSD, priceTmn, rate)
		if !ok {
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

func unitPrice(active bool, priceMode string, priceUSD *float64, priceTmn *int, rate int) (int, bool) {
	if !active {
		return 0, false
	}
	if priceMode == "fixed" {
		if priceTmn == nil || *priceTmn <= 0 {
			return 0, false
		}
		return *priceTmn, true
	}
	// dynamic
	if priceUSD == nil || rate <= 0 {
		return 0, false
	}
	return int(math.Round(*priceUSD * float64(rate))), true
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

	for _, it := range items {
		if _, err := tx.Exec(ctx, `
			INSERT INTO order_items (order_id, game_id, game_name, platform, zarfiat, quantity)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, orderID, it.GameID, it.GameName, it.Platform, it.Zarfiat, it.Quantity); err != nil {
			return "", fmt.Errorf("createPendingOrder item: %w", err)
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
	ID     string
	UserID string
	Amount int
	Status string
}

func getOrderByAuthority(ctx context.Context, db *pgxpool.Pool, authority string) (*orderLookup, error) {
	var o orderLookup
	err := db.QueryRow(ctx,
		"SELECT id, user_id, amount, status FROM orders WHERE authority = $1",
		authority,
	).Scan(&o.ID, &o.UserID, &o.Amount, &o.Status)
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
	GameID   string `json:"game_id"`
	GameName string `json:"game_name"`
	Platform string `json:"platform"`
	Zarfiat  string `json:"zarfiat"`
	Quantity int    `json:"quantity"`
}

type OrderView struct {
	ID        string          `json:"id"`
	Amount    int             `json:"amount"`
	Status    string          `json:"status"`
	CreatedAt time.Time       `json:"created_at"`
	Items     []OrderItemView `json:"items"`
}

// listUserOrders returns the user's paid orders (their actual purchases),
// newest first, each with its line items. Pending/failed checkout attempts are
// excluded — they aren't "orders" from the customer's point of view.
func listUserOrders(ctx context.Context, db *pgxpool.Pool, userID string) ([]OrderView, error) {
	rows, err := db.Query(ctx, `
		SELECT id, amount, status, created_at
		FROM orders
		WHERE user_id = $1 AND status = 'paid'
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("listUserOrders: %w", err)
	}
	defer rows.Close()

	orders := make([]OrderView, 0)
	byID := make(map[string]int)
	for rows.Next() {
		var o OrderView
		if err := rows.Scan(&o.ID, &o.Amount, &o.Status, &o.CreatedAt); err != nil {
			return nil, fmt.Errorf("listUserOrders scan: %w", err)
		}
		o.Items = []OrderItemView{}
		byID[o.ID] = len(orders)
		orders = append(orders, o)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("listUserOrders rows: %w", err)
	}
	if len(orders) == 0 {
		return orders, nil
	}

	ids := make([]string, 0, len(orders))
	for _, o := range orders {
		ids = append(ids, o.ID)
	}
	if err := attachOrderItems(ctx, db, ids, func(orderID string, it OrderItemView) {
		if i, ok := byID[orderID]; ok {
			orders[i].Items = append(orders[i].Items, it)
		}
	}); err != nil {
		return nil, err
	}
	return orders, nil
}

// getUserOrder returns a single order owned by the user (any status), or nil if
// it doesn't exist or belongs to someone else.
func getUserOrder(ctx context.Context, db *pgxpool.Pool, userID, orderID string) (*OrderView, error) {
	var o OrderView
	err := db.QueryRow(ctx, `
		SELECT id, amount, status, created_at
		FROM orders
		WHERE id = $1 AND user_id = $2
	`, orderID, userID).Scan(&o.ID, &o.Amount, &o.Status, &o.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getUserOrder: %w", err)
	}
	o.Items = []OrderItemView{}
	if err := attachOrderItems(ctx, db, []string{o.ID}, func(_ string, it OrderItemView) {
		o.Items = append(o.Items, it)
	}); err != nil {
		return nil, err
	}
	return &o, nil
}

func attachOrderItems(ctx context.Context, db *pgxpool.Pool, orderIDs []string, add func(orderID string, it OrderItemView)) error {
	rows, err := db.Query(ctx, `
		SELECT order_id, game_id, game_name, platform, zarfiat, quantity
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
		if err := rows.Scan(&orderID, &it.GameID, &it.GameName, &it.Platform, &it.Zarfiat, &it.Quantity); err != nil {
			return fmt.Errorf("attachOrderItems scan: %w", err)
		}
		add(orderID, it)
	}
	return rows.Err()
}
