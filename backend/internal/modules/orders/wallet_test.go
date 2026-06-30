package orders

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func TestSplitWallet(t *testing.T) {
	cases := []struct {
		name                            string
		bal, total, wantApplied, wantGw int
	}{
		{"no balance", 0, 10000, 0, 10000},
		{"full cover", 10000, 10000, 10000, 0},
		{"over cover", 20000, 10000, 10000, 0},
		{"partial", 4000, 10000, 4000, 6000},
		// remainder 500 < MinGatewayToman(1000): hold back 500 so the gateway is chargeable.
		{"min gateway guard", 9500, 10000, 9000, 1000},
		{"remainder already at min", 9000, 10000, 9000, 1000},
		// not enough wallet to lift a tiny remainder — apply what we can.
		{"tiny order, tiny wallet", 300, 800, 0, 800},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			a, g := splitWallet(c.bal, c.total)
			if a != c.wantApplied || g != c.wantGw {
				t.Fatalf("splitWallet(%d,%d) = (%d,%d), want (%d,%d)", c.bal, c.total, a, g, c.wantApplied, c.wantGw)
			}
			if a+g != c.total {
				t.Fatalf("applied+gateway = %d, want total %d", a+g, c.total)
			}
		})
	}
}

func setBalance(t *testing.T, ctx context.Context, db *pgxpool.Pool, userID string, bal int) {
	t.Helper()
	mustExec(t, ctx, db, "UPDATE users SET wallet_balance = $1 WHERE id = $2", bal, userID)
}

func walletBalance(t *testing.T, ctx context.Context, db *pgxpool.Pool, userID string) int {
	t.Helper()
	var bal int
	if err := db.QueryRow(ctx, "SELECT wallet_balance FROM users WHERE id = $1", userID).Scan(&bal); err != nil {
		t.Fatal(err)
	}
	return bal
}

func ledgerCount(t *testing.T, ctx context.Context, db *pgxpool.Pool, userID, reason string) int {
	t.Helper()
	var n int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM wallet_transactions WHERE user_id = $1 AND reason = $2", userID, reason,
	).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestGetWallet(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	setBalance(t, ctx, db, "u1", 5000)
	mustExec(t, ctx, db,
		"INSERT INTO wallet_transactions (user_id, amount, reason) VALUES ('u1', 7000, 'return_credit')")
	mustExec(t, ctx, db,
		"INSERT INTO wallet_transactions (user_id, amount, reason) VALUES ('u1', -2000, 'order_payment')")
	// A different user's ledger must not leak in.
	seedUser(t, ctx, db, "u2", "09120000002")
	mustExec(t, ctx, db,
		"INSERT INTO wallet_transactions (user_id, amount, reason) VALUES ('u2', 999, 'return_credit')")

	w, err := getWallet(ctx, db, "u1")
	if err != nil {
		t.Fatal(err)
	}
	if w.Balance != 5000 {
		t.Fatalf("balance = %d, want 5000 (the column, not the ledger sum)", w.Balance)
	}
	if len(w.Transactions) != 2 {
		t.Fatalf("txns = %d, want 2 (only u1's)", len(w.Transactions))
	}
	sum := 0
	for _, tx := range w.Transactions {
		sum += tx.Amount
	}
	if sum != 5000 {
		t.Fatalf("ledger sum = %d, want 5000 (7000 - 2000)", sum)
	}
}

func TestCreatePendingOrder_WalletFullyCovers(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	setBalance(t, ctx, db, "u1", 5000)

	orderID, _, paid, err := createPendingOrder(ctx, db, "u1", 5000, 5000, "", oneItem())
	if err != nil {
		t.Fatal(err)
	}
	if !paid {
		t.Fatal("want paid=true when wallet fully covers the order")
	}
	assertStatus(t, ctx, db, orderID, "paid")
	if bal := walletBalance(t, ctx, db, "u1"); bal != 0 {
		t.Fatalf("balance = %d, want 0", bal)
	}

	var applied int
	if err := db.QueryRow(ctx, "SELECT wallet_applied FROM orders WHERE id = $1", orderID).Scan(&applied); err != nil {
		t.Fatal(err)
	}
	if applied != 5000 {
		t.Fatalf("wallet_applied = %d, want 5000", applied)
	}
	if n := ledgerCount(t, ctx, db, "u1", "order_payment"); n != 1 {
		t.Fatalf("order_payment ledger rows = %d, want 1", n)
	}
}

func TestCreatePendingOrder_WalletPartial(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	setBalance(t, ctx, db, "u1", 4000)

	orderID, _, paid, err := createPendingOrder(ctx, db, "u1", 10000, 4000, "", oneItem())
	if err != nil {
		t.Fatal(err)
	}
	if paid {
		t.Fatal("want paid=false when wallet only partially covers")
	}
	assertStatus(t, ctx, db, orderID, "pending")
	if bal := walletBalance(t, ctx, db, "u1"); bal != 0 {
		t.Fatalf("balance = %d, want 0 (all reserved)", bal)
	}
}

func TestCreatePendingOrder_InsufficientWallet(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	setBalance(t, ctx, db, "u1", 1000)

	// Asking to reserve more than the balance (a concurrent spend drained it) must
	// fail without charging or creating the order.
	_, _, _, err := createPendingOrder(ctx, db, "u1", 5000, 2000, "", oneItem())
	if !errors.Is(err, ErrInsufficientWallet) {
		t.Fatalf("err = %v, want ErrInsufficientWallet", err)
	}
	if bal := walletBalance(t, ctx, db, "u1"); bal != 1000 {
		t.Fatalf("balance = %d, want 1000 (unchanged)", bal)
	}
	var orders int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) FROM orders WHERE user_id = 'u1'").Scan(&orders); err != nil {
		t.Fatal(err)
	}
	if orders != 0 {
		t.Fatalf("orders = %d, want 0 (rolled back)", orders)
	}
}

func TestFailOrder_RefundsWalletOnce(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	setBalance(t, ctx, db, "u1", 8000)

	orderID, _, _, err := createPendingOrder(ctx, db, "u1", 10000, 8000, "", oneItem())
	if err != nil {
		t.Fatal(err)
	}
	if bal := walletBalance(t, ctx, db, "u1"); bal != 0 {
		t.Fatalf("balance after reserve = %d, want 0", bal)
	}

	if err := failOrder(ctx, db, orderID); err != nil {
		t.Fatal(err)
	}
	assertStatus(t, ctx, db, orderID, "failed")
	if bal := walletBalance(t, ctx, db, "u1"); bal != 8000 {
		t.Fatalf("balance after refund = %d, want 8000", bal)
	}

	// A duplicate fail (e.g. callback hit twice) must not refund again.
	if err := failOrder(ctx, db, orderID); err != nil {
		t.Fatal(err)
	}
	if bal := walletBalance(t, ctx, db, "u1"); bal != 8000 {
		t.Fatalf("balance after second fail = %d, want 8000 (no double refund)", bal)
	}
	if n := ledgerCount(t, ctx, db, "u1", "order_refund"); n != 1 {
		t.Fatalf("order_refund ledger rows = %d, want 1", n)
	}
}
