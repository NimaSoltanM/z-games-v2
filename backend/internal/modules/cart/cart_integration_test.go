package cart

import (
	"context"
	"testing"

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

func seedGame(t *testing.T, ctx context.Context, db *pgxpool.Pool, id string) {
	mustExec(t, ctx, db,
		"INSERT INTO games (id, name, slug, platform, price_mode, active) VALUES ($1, 'Test Game', $1, 'ps5', 'dynamic'::price_mode, true)",
		id)
}

// qtyOf returns the stored quantity for a line, or -1 if the line is absent.
func qtyOf(t *testing.T, ctx context.Context, db *pgxpool.Pool, userID, gameID, platform, zarfiat string) int {
	t.Helper()
	var qty int
	err := db.QueryRow(ctx,
		"SELECT quantity FROM cart_items WHERE user_id=$1 AND game_id=$2 AND platform=$3 AND zarfiat=$4",
		userID, gameID, platform, zarfiat).Scan(&qty)
	if err != nil {
		return -1
	}
	return qty
}

func TestUpsertCartItem_ClampsAtTen(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	seedGame(t, ctx, db, "g1")

	// First insert asks for 12 — must land at the cap of 10, never violating the
	// quantity CHECK (1..10).
	if err := upsertCartItem(ctx, db, "u1", upsertInput{GameID: "g1", Platform: "ps5", Zarfiat: "z2", Quantity: 12}); err != nil {
		t.Fatalf("first upsert: %v", err)
	}
	if got := qtyOf(t, ctx, db, "u1", "g1", "ps5", "z2"); got != 10 {
		t.Fatalf("after insert of 12, quantity = %d, want 10", got)
	}

	// Adding 5 more on the conflict path stays clamped at 10.
	if err := upsertCartItem(ctx, db, "u1", upsertInput{GameID: "g1", Platform: "ps5", Zarfiat: "z2", Quantity: 5}); err != nil {
		t.Fatalf("second upsert: %v", err)
	}
	if got := qtyOf(t, ctx, db, "u1", "g1", "ps5", "z2"); got != 10 {
		t.Fatalf("after adding 5 more, quantity = %d, want 10", got)
	}
}

func TestMergeCart_SumsQuantitiesAndClamps(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	seedGame(t, ctx, db, "g1")

	// Existing server cart holds 4 of this line.
	if err := upsertCartItem(ctx, db, "u1", upsertInput{GameID: "g1", Platform: "ps5", Zarfiat: "z2", Quantity: 4}); err != nil {
		t.Fatalf("seed upsert: %v", err)
	}

	// Merging an anonymous cart of 8 would total 12, but the cap holds it at 10.
	if err := mergeCart(ctx, db, "u1", []mergeItem{{GameID: "g1", Platform: "ps5", Zarfiat: "z2", Quantity: 8}}); err != nil {
		t.Fatalf("mergeCart: %v", err)
	}
	if got := qtyOf(t, ctx, db, "u1", "g1", "ps5", "z2"); got != 10 {
		t.Fatalf("after merge, quantity = %d, want 10", got)
	}
}

func TestMergeCart_SkipsInvalidItemButKeepsValid(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	seedGame(t, ctx, db, "g1")
	// "gX" is never seeded, so its line hits a foreign-key violation.

	err := mergeCart(ctx, db, "u1", []mergeItem{
		{GameID: "g1", Platform: "ps5", Zarfiat: "z2", Quantity: 2},
		{GameID: "gX", Platform: "ps5", Zarfiat: "z2", Quantity: 1},
	})
	if err != nil {
		t.Fatalf("mergeCart should skip the invalid item, not fail: %v", err)
	}

	if got := qtyOf(t, ctx, db, "u1", "g1", "ps5", "z2"); got != 2 {
		t.Fatalf("valid line quantity = %d, want 2", got)
	}
	if got := qtyOf(t, ctx, db, "u1", "gX", "ps5", "z2"); got != -1 {
		t.Fatalf("invalid line should not be persisted, got quantity %d", got)
	}

	items, err := getCartItems(ctx, db, "u1")
	if err != nil {
		t.Fatalf("getCartItems: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("cart should contain exactly the valid line, got %d items", len(items))
	}
}

func TestMergeCart_IgnoresNonPositiveQuantity(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	seedGame(t, ctx, db, "g1")

	if err := mergeCart(ctx, db, "u1", []mergeItem{{GameID: "g1", Platform: "ps5", Zarfiat: "z2", Quantity: 0}}); err != nil {
		t.Fatalf("mergeCart: %v", err)
	}
	if got := qtyOf(t, ctx, db, "u1", "g1", "ps5", "z2"); got != -1 {
		t.Fatalf("a zero-quantity merge must not create a line, got %d", got)
	}
}

func TestSetCartItemQty_ZeroDeletesLine(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	seedGame(t, ctx, db, "g1")
	if err := upsertCartItem(ctx, db, "u1", upsertInput{GameID: "g1", Platform: "ps5", Zarfiat: "z2", Quantity: 2}); err != nil {
		t.Fatalf("seed upsert: %v", err)
	}

	if err := setCartItemQty(ctx, db, "u1", "g1", "ps5", "z2", 0); err != nil {
		t.Fatalf("setCartItemQty: %v", err)
	}
	if got := qtyOf(t, ctx, db, "u1", "g1", "ps5", "z2"); got != -1 {
		t.Fatalf("line should be deleted at quantity 0, got %d", got)
	}
}
