package orders

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func mustExec(t *testing.T, ctx context.Context, db *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := db.Exec(ctx, sql, args...); err != nil {
		t.Fatalf("exec failed: %v\nSQL: %s", err, sql)
	}
}

func seedUser(t *testing.T, ctx context.Context, db *pgxpool.Pool, id, phone string) {
	mustExec(t, ctx, db, "INSERT INTO users (id, phone, role) VALUES ($1, $2, 'user')", id, phone)
}

func seedGame(t *testing.T, ctx context.Context, db *pgxpool.Pool, id, mode string, active bool) {
	mustExec(t, ctx, db,
		"INSERT INTO games (id, name, platform, price_mode, active) VALUES ($1, 'Test Game', 'ps5', $2::price_mode, $3)",
		id, mode, active)
}

// seedDynamicPrice gives a dynamic game a base USD price per console; the z2
// price (used by the cart helpers) derives as usd * (1+10%) * 60% * rate.
func seedDynamicPrice(t *testing.T, ctx context.Context, db *pgxpool.Pool, gameID string, usd float64) {
	mustExec(t, ctx, db,
		"INSERT INTO game_base_prices (game_id, platform, base_usd) VALUES ($1, 'ps5', $2)",
		gameID, usd)
}

func seedRate(t *testing.T, ctx context.Context, db *pgxpool.Pool, rate int) {
	mustExec(t, ctx, db, "INSERT INTO exchange_rate (id, usd_to_toman) VALUES (1, $1)", rate)
}

func seedCart(t *testing.T, ctx context.Context, db *pgxpool.Pool, userID, gameID string, qty int) {
	mustExec(t, ctx, db,
		"INSERT INTO cart_items (user_id, game_id, platform, zarfiat, quantity) VALUES ($1, $2, 'ps5', 'z2', $3)",
		userID, gameID, qty)
}

func oneItem() []orderItem {
	return []orderItem{{GameID: "g1", GameName: "Test Game", Platform: "ps5", Zarfiat: "z2", Quantity: 1}}
}

func TestCreatePendingOrder_ExpandsQuantity(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")

	// A quantity-3 line must become 3 separate order_items, so each account gets
	// its own credential slot at fulfillment.
	items := []orderItem{{GameID: "g1", GameName: "Test Game", Platform: "ps5", Zarfiat: "z2", Quantity: 3}}
	orderID, err := createPendingOrder(ctx, db, "u1", 3000, "", items)
	if err != nil {
		t.Fatal(err)
	}

	var count int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM order_items WHERE order_id=$1 AND quantity=1", orderID,
	).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 3 {
		t.Fatalf("order_items = %d, want 3 (one per unit)", count)
	}
}

func TestMarkOrderPaid_Idempotent(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")

	orderID, err := createPendingOrder(ctx, db, "u1", 1000, "", oneItem())
	if err != nil {
		t.Fatalf("createPendingOrder: %v", err)
	}

	first, err := markOrderPaid(ctx, db, orderID, 555)
	if err != nil || !first {
		t.Fatalf("first markOrderPaid: transitioned=%v err=%v (want true)", first, err)
	}
	second, err := markOrderPaid(ctx, db, orderID, 999)
	if err != nil {
		t.Fatal(err)
	}
	if second {
		t.Fatal("second markOrderPaid must report NO transition (idempotent)")
	}

	var status string
	var refID int64
	if err := db.QueryRow(ctx, "SELECT status, ref_id FROM orders WHERE id=$1", orderID).Scan(&status, &refID); err != nil {
		t.Fatal(err)
	}
	if status != "paid" {
		t.Fatalf("status = %q, want paid", status)
	}
	if refID != 555 {
		t.Fatalf("ref_id = %d, want 555 (the second call must not overwrite it)", refID)
	}
}

func TestFailOrder_AndPaidGuards(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")

	// A pending order can be failed, and a failed order can't be revived to paid.
	pendingID, _ := createPendingOrder(ctx, db, "u1", 1000, "", oneItem())
	if err := failOrder(ctx, db, pendingID); err != nil {
		t.Fatal(err)
	}
	revived, err := markOrderPaid(ctx, db, pendingID, 1)
	if err != nil {
		t.Fatal(err)
	}
	if revived {
		t.Fatal("markOrderPaid must not revive a failed order")
	}
	assertStatus(t, ctx, db, pendingID, "failed")

	// A paid order must not be flipped to failed.
	paidID, _ := createPendingOrder(ctx, db, "u1", 1000, "", oneItem())
	if _, err := markOrderPaid(ctx, db, paidID, 7); err != nil {
		t.Fatal(err)
	}
	if err := failOrder(ctx, db, paidID); err != nil {
		t.Fatal(err)
	}
	assertStatus(t, ctx, db, paidID, "paid")
}

func TestFulfillOrder_EncryptsAtRestAndCompletes(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	cred := newTestCipher(t)
	seedUser(t, ctx, db, "u1", "09120000001")

	orderID, _ := createPendingOrder(ctx, db, "u1", 1000, "", oneItem())
	if _, err := markOrderPaid(ctx, db, orderID, 1); err != nil {
		t.Fatal(err)
	}

	ao, err := getAdminOrder(ctx, db, cred, orderID)
	if err != nil || ao == nil || len(ao.Items) != 1 {
		t.Fatalf("getAdminOrder: %+v err=%v", ao, err)
	}
	itemID := ao.Items[0].ID

	// Partial credentials → order stays paid (not yet deliverable).
	if err := fulfillOrder(ctx, db, cred, "u1", orderID, []credInput{{ItemID: itemID, Email: "a@psn.com"}}); err != nil {
		t.Fatal(err)
	}
	assertStatus(t, ctx, db, orderID, "paid")

	// Complete credentials → order becomes fulfilled.
	if err := fulfillOrder(ctx, db, cred, "u1", orderID, []credInput{{ItemID: itemID, Email: "a@psn.com", Password: "pw", PsnPass: "psn"}}); err != nil {
		t.Fatal(err)
	}
	assertStatus(t, ctx, db, orderID, "fulfilled")

	// Stored value must be ciphertext, not the plaintext password.
	var rawPw string
	if err := db.QueryRow(ctx, "SELECT password FROM order_items WHERE id=$1", itemID).Scan(&rawPw); err != nil {
		t.Fatal(err)
	}
	if rawPw == "pw" || rawPw == "" {
		t.Fatalf("password stored as %q — not encrypted at rest", rawPw)
	}

	// Read path must decrypt it back.
	ao2, err := getAdminOrder(ctx, db, cred, orderID)
	if err != nil {
		t.Fatal(err)
	}
	if ao2.Items[0].Password == nil || *ao2.Items[0].Password != "pw" {
		t.Fatalf("decrypted password = %v, want pw", ao2.Items[0].Password)
	}

	// Each fulfill call (partial + complete) must leave an attributable audit row.
	var actions int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM admin_actions WHERE admin_id='u1' AND action='order.fulfill' AND target_id=$1",
		orderID).Scan(&actions); err != nil {
		t.Fatal(err)
	}
	if actions != 2 {
		t.Fatalf("admin_actions rows = %d, want 2 (one per fulfill call)", actions)
	}
}

func TestComputeCart(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	seedGame(t, ctx, db, "g1", "dynamic", true)
	seedDynamicPrice(t, ctx, db, "g1", 8)
	seedRate(t, ctx, db, 95000)
	seedCart(t, ctx, db, "u1", "g1", 2)

	items, total, err := computeCart(ctx, db, "u1")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("items = %d, want 1", len(items))
	}
	// z2 = 8 * (1+10%) * 60% * 95000 = 501,600; quantity 2.
	if want := 501600 * 2; total != want {
		t.Fatalf("total = %d, want %d", total, want)
	}
}

func TestComputeCart_EmptyAndInvalid(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")

	// Empty cart.
	if _, _, err := computeCart(ctx, db, "u1"); !errors.Is(err, ErrCartEmpty) {
		t.Fatalf("empty cart: got %v, want ErrCartEmpty", err)
	}

	// Inactive game in cart → must never be priced/charged.
	seedGame(t, ctx, db, "g1", "dynamic", false)
	seedDynamicPrice(t, ctx, db, "g1", 8)
	seedRate(t, ctx, db, 95000)
	seedCart(t, ctx, db, "u1", "g1", 1)
	if _, _, err := computeCart(ctx, db, "u1"); !errors.Is(err, ErrInvalidCart) {
		t.Fatalf("inactive game: got %v, want ErrInvalidCart", err)
	}
}

// setPreorder marks a seeded game as pre-order with the given release date.
func setPreorder(t *testing.T, ctx context.Context, db *pgxpool.Pool, gameID string, releaseDate time.Time) {
	mustExec(t, ctx, db,
		"UPDATE games SET release_status = 'pre_order', release_date = $1 WHERE id = $2",
		releaseDate, gameID)
}

func TestComputeCart_PreOrderStamped(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	seedGame(t, ctx, db, "g1", "dynamic", true)
	seedDynamicPrice(t, ctx, db, "g1", 8)
	seedRate(t, ctx, db, 95000)
	seedCart(t, ctx, db, "u1", "g1", 2)

	// Release well beyond the closing window → still taking pre-orders.
	setPreorder(t, ctx, db, "g1", time.Now().UTC().Add(10*24*time.Hour))

	items, _, err := computeCart(ctx, db, "u1")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 || !items[0].PreOrder {
		t.Fatalf("expected one pre-order item, got %+v", items)
	}

	// The pre-order flag must be snapshotted onto every expanded order_item.
	orderID, err := createPendingOrder(ctx, db, "u1", 1000, "", items)
	if err != nil {
		t.Fatal(err)
	}
	var preOrderCount, total int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FILTER (WHERE pre_order), COUNT(*) FROM order_items WHERE order_id = $1", orderID,
	).Scan(&preOrderCount, &total); err != nil {
		t.Fatal(err)
	}
	if total != 2 || preOrderCount != 2 {
		t.Fatalf("pre_order snapshot: got %d/%d pre-order items, want 2/2", preOrderCount, total)
	}
}

func TestComputeCart_PastReleaseBuysAsNormal(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	seedGame(t, ctx, db, "g1", "dynamic", true)
	seedDynamicPrice(t, ctx, db, "g1", 8)
	seedRate(t, ctx, db, 95000)
	seedCart(t, ctx, db, "u1", "g1", 1)

	// Status is still 'pre_order' but the release date has passed: the game
	// behaves as released, so the purchase must NOT be flagged as a pre-order.
	setPreorder(t, ctx, db, "g1", time.Now().UTC().Add(-24*time.Hour))

	items, _, err := computeCart(ctx, db, "u1")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 || items[0].PreOrder {
		t.Fatalf("expected one normal (non-pre-order) item, got %+v", items)
	}

	orderID, err := createPendingOrder(ctx, db, "u1", 1000, "", items)
	if err != nil {
		t.Fatal(err)
	}
	var preOrderCount int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM order_items WHERE order_id = $1 AND pre_order", orderID,
	).Scan(&preOrderCount); err != nil {
		t.Fatal(err)
	}
	if preOrderCount != 0 {
		t.Fatalf("pre_order items = %d, want 0 (game released by date)", preOrderCount)
	}
}

func TestComputeCart_ClosingWindowRejected(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	seedGame(t, ctx, db, "g1", "dynamic", true)
	seedDynamicPrice(t, ctx, db, "g1", 8)
	seedRate(t, ctx, db, 95000)
	seedCart(t, ctx, db, "u1", "g1", 1)

	// Release is hours away → inside the closing window, sales are shut.
	setPreorder(t, ctx, db, "g1", time.Now().UTC().Add(2*time.Hour))

	if _, _, err := computeCart(ctx, db, "u1"); !errors.Is(err, ErrInvalidCart) {
		t.Fatalf("closing window: got %v, want ErrInvalidCart", err)
	}
}

func assertStatus(t *testing.T, ctx context.Context, db *pgxpool.Pool, orderID, want string) {
	t.Helper()
	var status string
	if err := db.QueryRow(ctx, "SELECT status FROM orders WHERE id=$1", orderID).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != want {
		t.Fatalf("order status = %q, want %q", status, want)
	}
}
