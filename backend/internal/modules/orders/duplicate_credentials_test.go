package orders

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/shared/credentialstate"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func newPaidOrderItem(t *testing.T, ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, buyer string, items []orderItem) (string, string) {
	t.Helper()
	orderID, _, _, err := createPendingOrder(ctx, db, buyer, 1000, 0, "", items)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := markOrderPaid(ctx, db, orderID, 10); err != nil {
		t.Fatal(err)
	}
	order, err := getAdminOrder(ctx, db, cred, orderID)
	if err != nil {
		t.Fatal(err)
	}
	return orderID, order.Items[0].ID
}

func deliverCredentials(t *testing.T, ctx context.Context, db *pgxpool.Pool, cred *credentials.Cipher, adminID, orderID, itemID, email string) {
	t.Helper()
	warnings, err := fulfillOrder(ctx, db, cred, adminID, orderID, []credInput{{
		ItemID: itemID, Email: email, Password: "password", Passcode: "code",
	}}, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(warnings) != 0 {
		t.Fatalf("unexpected warnings: %+v", warnings)
	}
}

func setupCredentialTest(t *testing.T) (context.Context, *pgxpool.Pool, *credentials.Cipher) {
	t.Helper()
	ctx := context.Background()
	db := testdb.New(t)
	cred := newTestCipher(t)
	seedUser(t, ctx, db, "buyer1", "09120000001")
	seedUser(t, ctx, db, "buyer2", "09120000002")
	seedUser(t, ctx, db, "buyer3", "09120000003")
	seedUser(t, ctx, db, "admin", "09120000009")
	seedGame(t, ctx, db, "g1", "dynamic", true)
	return ctx, db, cred
}

func TestDuplicateWarnings_RequiresCompleteCredentialsAndReportsEveryTarget(t *testing.T) {
	items := map[string]fulfillmentItem{
		"new-1": {ID: "new-1", GameName: "Game A", Console: "ps5", Capacity: "z2"},
		"new-2": {ID: "new-2", GameName: "Game B", Console: "ps4", Capacity: "z3"},
		"new-3": {ID: "new-3", GameName: "Game C", Console: "xbox_series", Capacity: "home"},
	}
	holders := map[string][]credentialstate.Holder{
		credentialstate.AccountIdentity("shared@example.com", "ps5"): {{
			ItemID: "old-item", OrderID: "old-order", OrderNumber: 41,
			GameName: "Old Game", Console: "ps4", Capacity: "z3",
		}},
	}
	inputs := []credInput{
		{ItemID: "new-1", Email: " Shared@Example.com ", Password: "pw", Passcode: "code"},
		{ItemID: "new-2", Email: "shared@example.com", Password: "pw", Passcode: "code"},
		{ItemID: "new-3", Email: "shared@example.com", Password: "pw", Passcode: "code"},
		{ItemID: "partial", Email: "shared@example.com", Password: "", Passcode: "code"},
	}

	warnings := duplicateWarnings("new-order", 42, inputs, items, holders)
	if len(warnings) != 2 {
		t.Fatalf("warnings = %+v, want two complete duplicate inputs", warnings)
	}
	for _, warning := range warnings {
		if warning.ItemID == "new-3" {
			t.Fatal("same email on Xbox must not collide with a PlayStation account")
		}
		if len(warning.Matches) != 2 {
			t.Fatalf("warning = %+v, want existing holder and other request item", warning)
		}
	}
}

func TestFulfillOrder_DuplicateActiveAccountWarnsAndOverrideIsExplicit(t *testing.T) {
	ctx, db, cred := setupCredentialTest(t)
	firstOrder, firstItem := newPaidOrderItem(t, ctx, db, cred, "buyer1", oneItem())
	deliverCredentials(t, ctx, db, cred, "admin", firstOrder, firstItem, "Player@Example.com")

	secondOrder, secondItem := newPaidOrderItem(t, ctx, db, cred, "buyer2", oneItem())
	input := []credInput{{ItemID: secondItem, Email: " player@example.COM ", Password: "new", Passcode: "new"}}
	warnings, err := fulfillOrder(ctx, db, cred, "admin", secondOrder, input, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(warnings) != 1 || len(warnings[0].Matches) != 1 || warnings[0].Matches[0].OrderID != firstOrder {
		t.Fatalf("warnings = %+v, want active first order", warnings)
	}
	assertStatus(t, ctx, db, secondOrder, "paid")
	var savedEmail *string
	if err := db.QueryRow(ctx, "SELECT email FROM order_items WHERE id=$1", secondItem).Scan(&savedEmail); err != nil {
		t.Fatal(err)
	}
	if savedEmail != nil {
		t.Fatal("warning response must not save credentials")
	}

	warnings, err = fulfillOrder(ctx, db, cred, "admin", secondOrder, input, true)
	if err != nil || len(warnings) != 0 {
		t.Fatalf("override warnings=%+v err=%v", warnings, err)
	}
	assertStatus(t, ctx, db, secondOrder, "fulfilled")
}

func TestFulfillOrder_ApprovedReturnDoesNotWarnAndIsAutoConsumed(t *testing.T) {
	ctx, db, cred := setupCredentialTest(t)
	_, returnID := deliverAndReturn(t, ctx, db, cred, "buyer1", oneItem(), "returned@example.com", "pw", "code")

	orderID, itemID := newPaidOrderItem(t, ctx, db, cred, "buyer2", oneItem())
	warnings, err := fulfillOrder(ctx, db, cred, "admin", orderID, []credInput{{
		ItemID: itemID, Email: "RETURNED@example.com", Password: "pw", Passcode: "code",
	}}, false)
	if err != nil || len(warnings) != 0 {
		t.Fatalf("returned account warnings=%+v err=%v", warnings, err)
	}
	var reusedFor *string
	if err := db.QueryRow(ctx, "SELECT reused_for_item_id FROM game_returns WHERE id=$1", returnID).Scan(&reusedFor); err != nil {
		t.Fatal(err)
	}
	if reusedFor == nil || *reusedFor != itemID {
		t.Fatalf("reused_for_item_id = %v, want %s", reusedFor, itemID)
	}
}

func TestFulfillOrder_PendingReturnStillWarnsButTerminalRefusalDoesNot(t *testing.T) {
	ctx, db, cred := setupCredentialTest(t)
	firstOrder, firstItem := newPaidOrderItem(t, ctx, db, cred, "buyer1", oneItem())
	deliverCredentials(t, ctx, db, cred, "admin", firstOrder, firstItem, "pending@example.com")
	mustExec(t, ctx, db, `
		INSERT INTO game_returns (order_item_id, user_id, status, agreed_terms)
		VALUES ($1, 'buyer1', 'pending', true)
	`, firstItem)

	secondOrder, secondItem := newPaidOrderItem(t, ctx, db, cred, "buyer2", oneItem())
	warnings, err := fulfillOrder(ctx, db, cred, "admin", secondOrder, []credInput{{
		ItemID: secondItem, Email: "pending@example.com", Password: "pw", Passcode: "code",
	}}, false)
	if err != nil || len(warnings) != 1 {
		t.Fatalf("pending return warnings=%+v err=%v", warnings, err)
	}

	mustExec(t, ctx, db, "UPDATE game_returns SET status='refused' WHERE order_item_id=$1", firstItem)
	warnings, err = fulfillOrder(ctx, db, cred, "admin", secondOrder, []credInput{{
		ItemID: secondItem, Email: "pending@example.com", Password: "pw", Passcode: "code",
	}}, false)
	if err != nil || len(warnings) != 0 {
		t.Fatalf("refused return warnings=%+v err=%v", warnings, err)
	}
}

func TestFulfillOrder_DuplicateInsideSameRequestWarns(t *testing.T) {
	ctx, db, cred := setupCredentialTest(t)
	items := []orderItem{{GameID: "g1", GameName: "Test Game", Platform: "ps5", Zarfiat: "z2", Quantity: 2}}
	orderID, _ := newPaidOrderItem(t, ctx, db, cred, "buyer1", items)
	order, err := getAdminOrder(ctx, db, cred, orderID)
	if err != nil {
		t.Fatal(err)
	}
	inputs := []credInput{
		{ItemID: order.Items[0].ID, Email: "same@example.com", Password: "a", Passcode: "a"},
		{ItemID: order.Items[1].ID, Email: "SAME@example.com", Password: "b", Passcode: "b"},
	}
	warnings, err := fulfillOrder(ctx, db, cred, "admin", orderID, inputs, false)
	if err != nil || len(warnings) != 2 {
		t.Fatalf("in-request warnings=%+v err=%v", warnings, err)
	}
	if _, err := fulfillOrder(ctx, db, cred, "admin", orderID, inputs, true); err != nil {
		t.Fatal(err)
	}
	assertStatus(t, ctx, db, orderID, "fulfilled")
}

func TestReturnedCredentialsHiddenFromCustomerButRetainedForAdmin(t *testing.T) {
	ctx, db, cred := setupCredentialTest(t)
	itemID, returnID := deliverAndReturn(t, ctx, db, cred, "buyer1", oneItem(), "hidden@example.com", "pw", "code")
	var orderID string
	if err := db.QueryRow(ctx, "SELECT order_id FROM order_items WHERE id=$1", itemID).Scan(&orderID); err != nil {
		t.Fatal(err)
	}

	userOrder, err := getUserOrder(ctx, db, cred, "buyer1", orderID)
	if err != nil {
		t.Fatal(err)
	}
	if !userOrder.Items[0].CredentialsReturned || userOrder.Items[0].Email != nil {
		t.Fatalf("customer item = %+v, want returned with hidden credentials", userOrder.Items[0])
	}
	adminOrder, err := getAdminOrder(ctx, db, cred, orderID)
	if err != nil {
		t.Fatal(err)
	}
	if adminOrder.Items[0].Email == nil || *adminOrder.Items[0].Email != "hidden@example.com" {
		t.Fatalf("admin credentials missing after return %s: %+v", returnID, adminOrder.Items[0])
	}
}
