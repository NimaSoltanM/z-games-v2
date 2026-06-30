package orders

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

// deliverAndReturn buys `items` for `buyer`, delivers the account with the given
// credentials, then opens an APPROVED return on it (returned-account inventory).
// Returns the delivered item id and the approved return id.
func deliverAndReturn(t *testing.T, ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, buyer string, items []orderItem, email, pass, code string) (itemID, returnID string) {
	t.Helper()
	orderID, _, _, err := createPendingOrder(ctx, db, buyer, 1000, 0, "", items)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := markOrderPaid(ctx, db, orderID, 1); err != nil {
		t.Fatal(err)
	}
	ao, err := getAdminOrder(ctx, db, cred, orderID)
	if err != nil {
		t.Fatal(err)
	}
	itemID = ao.Items[0].ID
	if err := fulfillOrder(ctx, db, cred, "admin", orderID,
		[]credInput{{ItemID: itemID, Email: email, Password: pass, Passcode: code}}); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `
		INSERT INTO game_returns (order_item_id, user_id, status, video_filename, agreed_terms, credit_amount)
		VALUES ($1, $2, 'approved', 'v.mp4', true, 1000) RETURNING id
	`, itemID, buyer).Scan(&returnID); err != nil {
		t.Fatal(err)
	}
	return itemID, returnID
}

func z3Item() []orderItem {
	return []orderItem{{GameID: "g1", GameName: "Test Game", Platform: "ps5", Zarfiat: "z3", Quantity: 1}}
}

func TestReuseReturnedAccount(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	cred := newTestCipher(t)
	seedUser(t, ctx, db, "buyer1", "09120000001")
	seedUser(t, ctx, db, "buyer2", "09120000002")
	seedUser(t, ctx, db, "admin", "09120000009")
	seedGame(t, ctx, db, "g1", "dynamic", true)

	_, retID := deliverAndReturn(t, ctx, db, cred, "buyer1", oneItem(), "acc@psn.com", "pw", "code")

	// buyer2 orders the same game + console + capacity → returned account is offered.
	o2, _, _, err := createPendingOrder(ctx, db, "buyer2", 1000, 0, "", oneItem())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := markOrderPaid(ctx, db, o2, 2); err != nil {
		t.Fatal(err)
	}
	ao2, err := getAdminOrder(ctx, db, cred, o2)
	if err != nil {
		t.Fatal(err)
	}
	item2 := ao2.Items[0].ID
	if got := ao2.Inventory[item2]; len(got) != 1 || got[0].ReturnID != retID {
		t.Fatalf("inventory for item2 = %+v, want 1 entry %s", ao2.Inventory[item2], retID)
	}

	// Reuse it.
	if err := reuseReturnedAccount(ctx, db, "admin", o2, item2, retID); err != nil {
		t.Fatal(err)
	}

	ao2b, err := getAdminOrder(ctx, db, cred, o2)
	if err != nil {
		t.Fatal(err)
	}
	if ao2b.Status != "fulfilled" {
		t.Fatalf("order2 status = %q, want fulfilled", ao2b.Status)
	}
	if ao2b.Items[0].Email == nil || *ao2b.Items[0].Email != "acc@psn.com" {
		t.Fatalf("reused email = %v, want acc@psn.com (copied from the returned account)", ao2b.Items[0].Email)
	}
	if len(ao2b.Inventory[item2]) != 0 {
		t.Fatalf("inventory after reuse = %+v, want empty", ao2b.Inventory[item2])
	}

	// Return is consumed and linked to the item it filled.
	var reusedAt *time.Time
	var reusedFor *string
	if err := db.QueryRow(ctx, "SELECT reused_at, reused_for_item_id FROM game_returns WHERE id=$1", retID).
		Scan(&reusedAt, &reusedFor); err != nil {
		t.Fatal(err)
	}
	if reusedAt == nil || reusedFor == nil || *reusedFor != item2 {
		t.Fatalf("return not consumed: reusedAt=%v reusedFor=%v", reusedAt, reusedFor)
	}

	// Reusing again is rejected.
	if err := reuseReturnedAccount(ctx, db, "admin", o2, item2, retID); !errors.Is(err, ErrReturnUnavailable) {
		t.Fatalf("second reuse err = %v, want ErrReturnUnavailable", err)
	}
}

func TestReuse_StrictCapacityMatch(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	cred := newTestCipher(t)
	seedUser(t, ctx, db, "buyer1", "09120000001")
	seedUser(t, ctx, db, "buyer2", "09120000002")
	seedUser(t, ctx, db, "admin", "09120000009")
	seedGame(t, ctx, db, "g1", "dynamic", true)

	// Returned account was sold as z2.
	_, retID := deliverAndReturn(t, ctx, db, cred, "buyer1", oneItem(), "acc@psn.com", "pw", "code")

	// buyer2 orders the same game/console but a DIFFERENT capacity (z3).
	o2, _, _, err := createPendingOrder(ctx, db, "buyer2", 1000, 0, "", z3Item())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := markOrderPaid(ctx, db, o2, 2); err != nil {
		t.Fatal(err)
	}
	ao2, err := getAdminOrder(ctx, db, cred, o2)
	if err != nil {
		t.Fatal(err)
	}
	item3 := ao2.Items[0].ID

	// Strict matching: a z2 account is NOT offered for a z3 order.
	if got := ao2.Inventory[item3]; len(got) != 0 {
		t.Fatalf("inventory for z3 item = %+v, want empty (z2 account must not match)", got)
	}
	// And the server rejects a forced cross-capacity reuse.
	if err := reuseReturnedAccount(ctx, db, "admin", o2, item3, retID); !errors.Is(err, ErrReturnMismatch) {
		t.Fatalf("cross-capacity reuse err = %v, want ErrReturnMismatch", err)
	}
}
