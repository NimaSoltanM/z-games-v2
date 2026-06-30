package orders

import (
	"context"
	"testing"

	"github.com/soltanmohammdi/z-games/internal/testdb"
)

// fakeVerifier resolves verifyPayment by the order's authority, so a test can give
// each pending order a deterministic gateway outcome.
type fakeVerifier struct {
	fn func(amount int, authority string) (int64, error)
}

func (f fakeVerifier) verifyPayment(_ context.Context, amount int, authority string) (int64, error) {
	return f.fn(amount, authority)
}

func TestReconcilePendingOrders(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001")
	setBalance(t, ctx, db, "u1", 20000)

	// Four pending orders with distinct gateway outcomes, plus one that's still recent.
	mk := func(authority string, walletApplied int) string {
		id, _, _, err := createPendingOrder(ctx, db, "u1", 10000, walletApplied, "", oneItem())
		if err != nil {
			t.Fatal(err)
		}
		if authority != "" {
			if err := setOrderAuthority(ctx, db, id, authority); err != nil {
				t.Fatal(err)
			}
		}
		return id
	}

	paidID := mk("auth-paid", 0)
	notPaidID := mk("auth-notpaid", 5000) // reserved wallet must be refunded on fail
	unknownID := mk("auth-unknown", 0)
	noAuthID := mk("", 3000) // never sent to gateway → fail+refund, verifier not called
	recentID := mk("auth-recent", 0)

	// Age everything except the recent order past the stale threshold.
	mustExec(t, ctx, db,
		"UPDATE orders SET created_at = NOW() - INTERVAL '1 hour' WHERE id = ANY($1)",
		[]string{paidID, notPaidID, unknownID, noAuthID})

	v := fakeVerifier{fn: func(amount int, authority string) (int64, error) {
		switch authority {
		case "auth-paid":
			return 777, nil
		case "auth-notpaid":
			return 0, ErrPaymentNotVerified
		case "auth-recent":
			t.Fatalf("recent order must not be reconciled (verify called for %q)", authority)
		}
		return 0, context.DeadlineExceeded // UNKNOWN for auth-unknown
	}}

	n, err := reconcilePendingOrders(ctx, db, v, reconcileStale)
	if err != nil {
		t.Fatal(err)
	}
	if n != 3 {
		t.Fatalf("resolved = %d, want 3 (paid + notpaid + no-authority)", n)
	}

	assertStatus(t, ctx, db, paidID, "paid")
	assertStatus(t, ctx, db, notPaidID, "failed")
	assertStatus(t, ctx, db, unknownID, "pending") // ambiguous → left for manual review
	assertStatus(t, ctx, db, noAuthID, "failed")
	assertStatus(t, ctx, db, recentID, "pending") // too new to touch

	// notPaid (5000) + noAuth (3000) reservations refunded; the rest unchanged.
	if bal := walletBalance(t, ctx, db, "u1"); bal != 20000 {
		t.Fatalf("balance = %d, want 20000 (both failed reservations refunded)", bal)
	}
	// The paid order kept its ref id.
	var refID int64
	if err := db.QueryRow(ctx, "SELECT ref_id FROM orders WHERE id=$1", paidID).Scan(&refID); err != nil {
		t.Fatal(err)
	}
	if refID != 777 {
		t.Fatalf("paid order ref_id = %d, want 777", refID)
	}
}
