package returns

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func mustExec(t *testing.T, ctx context.Context, db *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := db.Exec(ctx, sql, args...); err != nil {
		t.Fatalf("exec failed: %v\nSQL: %s", err, sql)
	}
}

func seedUser(t *testing.T, ctx context.Context, db *pgxpool.Pool, id, phone, role string) {
	t.Helper()
	mustExec(t, ctx, db, "INSERT INTO users (id, phone, role) VALUES ($1, $2, $3::user_role)", id, phone, role)
}

// seedReturnableGame seeds a dynamic ps5 game with a base USD price so its z2 price
// derives to usd*(1+10%)*60%*rate.
func seedGame(t *testing.T, ctx context.Context, db *pgxpool.Pool, id string, returnable, active bool, usd float64) {
	t.Helper()
	mustExec(t, ctx, db,
		"INSERT INTO games (id, name, slug, price_mode, active, returnable) VALUES ($1, 'Test Game', $1, 'dynamic', $2, $3)",
		id, active, returnable)
	mustExec(t, ctx, db, "INSERT INTO game_consoles (game_id, console_code) VALUES ($1, 'ps5')", id)
	mustExec(t, ctx, db, "INSERT INTO game_base_prices (game_id, platform, base_usd) VALUES ($1, 'ps5', $2)", id, usd)
}

func seedRate(t *testing.T, ctx context.Context, db *pgxpool.Pool, rate int) {
	t.Helper()
	mustExec(t, ctx, db, "INSERT INTO exchange_rate (id, usd_to_toman) VALUES (1, $1)", rate)
}

// seedDeliveredItem creates a paid order with one fully-delivered account
// (credentials present) and returns its order_item id.
func seedDeliveredItem(t *testing.T, ctx context.Context, db *pgxpool.Pool, userID, gameID, email, pass, code string) string {
	t.Helper()
	var orderID string
	if err := db.QueryRow(ctx,
		"INSERT INTO orders (user_id, amount, status) VALUES ($1, 10000, 'paid') RETURNING id", userID,
	).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	var itemID string
	if err := db.QueryRow(ctx, `
		INSERT INTO order_items (order_id, game_id, game_name, platform, zarfiat, quantity, email, password, passcode)
		VALUES ($1, $2, 'Test Game', 'ps5', 'z2', 1, $3, $4, $5) RETURNING id
	`, orderID, gameID, email, pass, code).Scan(&itemID); err != nil {
		t.Fatal(err)
	}
	return itemID
}

func returnStatus(t *testing.T, ctx context.Context, db *pgxpool.Pool, id string) string {
	t.Helper()
	var s string
	if err := db.QueryRow(ctx, "SELECT status FROM game_returns WHERE id = $1", id).Scan(&s); err != nil {
		t.Fatal(err)
	}
	return s
}

func walletBalance(t *testing.T, ctx context.Context, db *pgxpool.Pool, userID string) int {
	t.Helper()
	var bal int
	if err := db.QueryRow(ctx, "SELECT wallet_balance FROM users WHERE id = $1", userID).Scan(&bal); err != nil {
		t.Fatal(err)
	}
	return bal
}

// z2 price for usd=10, rate=100000: 10 * 1.1 * 0.6 * 100000 = 660,000.
const (
	testUSD      = 10
	testRate     = 100000
	testZ2Price  = 660000
	testZ2Credit = 495000 // 660,000 minus the default 25% fee
)

func TestListOwned_Estimate(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")

	items, total, err := listOwned(ctx, db, "u1", 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("owned = %d/%d, want 1/1", len(items), total)
	}
	it := items[0]
	if !it.Returnable {
		t.Fatal("want Returnable true")
	}
	if !it.Estimate.Available {
		t.Fatal("estimate should be available for a priced game")
	}
	if it.Estimate.CurrentPrice != testZ2Price {
		t.Fatalf("CurrentPrice = %d, want %d", it.Estimate.CurrentPrice, testZ2Price)
	}
	if it.Estimate.NetCredit != testZ2Credit {
		t.Fatalf("NetCredit = %d, want %d", it.Estimate.NetCredit, testZ2Credit)
	}
	if it.Estimate.Promo {
		t.Fatal("no reduced-fee window set; Promo should be false")
	}
}

func TestGetOwnedItem(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	itemID := seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")

	it, err := getOwnedItem(ctx, db, "u1", itemID)
	if err != nil {
		t.Fatal(err)
	}
	if it == nil {
		t.Fatal("owned item should be found")
	}
	if it.ItemID != itemID || it.Console != "ps5" || it.Capacity != "z2" {
		t.Fatalf("unexpected item: %+v", it)
	}
	if !it.Returnable || it.ReturnStatus != nil {
		t.Fatalf("want returnable + no existing return, got returnable=%v status=%v", it.Returnable, it.ReturnStatus)
	}
	if !it.Estimate.Available || it.Estimate.NetCredit != testZ2Credit {
		t.Fatalf("estimate = %+v, want available net %d", it.Estimate, testZ2Credit)
	}

	// Another user can't see it, and an unknown id returns nil (not an error).
	if other, err := getOwnedItem(ctx, db, "stranger", itemID); err != nil || other != nil {
		t.Fatalf("cross-user fetch = (%v, %v), want (nil, nil)", other, err)
	}
	if missing, err := getOwnedItem(ctx, db, "u1", "00000000-0000-0000-0000-000000000000"); err != nil || missing != nil {
		t.Fatalf("missing fetch = (%v, %v), want (nil, nil)", missing, err)
	}
}

func TestListOwned_DelistedHasNoEstimate(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedRate(t, ctx, db, testRate)
	// Inactive game: still owned/returnable, but no current store price to estimate.
	seedGame(t, ctx, db, "g1", true, false, testUSD)
	seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")

	items, _, err := listOwned(ctx, db, "u1", 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	if items[0].Estimate.Available {
		t.Fatal("a delisted/inactive game must have no credit estimate")
	}
}

func TestListOwned_PromoEstimate(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	// Open a live reduced return-fee window (10% instead of the default 25%).
	// Write the window in UTC exactly as setGameReturnFee does — the estimate
	// compares against time.Now().UTC(), and SQL NOW() would be DB-local time.
	mustExec(t, ctx, db,
		"UPDATE games SET return_fee_pct = 10, return_fee_starts_at = $1, return_fee_ends_at = $2 WHERE id = 'g1'",
		time.Now().UTC().Add(-time.Hour), time.Now().UTC().Add(24*time.Hour))
	seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")

	items, _, err := listOwned(ctx, db, "u1", 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	est := items[0].Estimate
	if !est.Available || !est.Promo {
		t.Fatalf("want available promo estimate, got %+v", est)
	}
	// price 660,000: promo fee 10% → 594,000; default fee 25% → 495,000.
	if est.FeePct != 10 || est.NormalFeePct != 25 {
		t.Fatalf("fees = (%d, %d), want (10, 25)", est.FeePct, est.NormalFeePct)
	}
	if est.NetCredit != 594000 || est.NormalCredit != testZ2Credit {
		t.Fatalf("credits = (%d, %d), want (594000, %d)", est.NetCredit, est.NormalCredit, testZ2Credit)
	}
	if est.NetCredit <= est.NormalCredit {
		t.Fatal("promo net credit must exceed the normal credit")
	}
}

func TestReviewReturn_ReasonRequired(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedUser(t, ctx, db, "admin", "09120000009", "admin")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	itemID := seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")
	retID, _ := insertReturn(ctx, db, "u1", itemID, "v.mp4")

	// A blank / whitespace-only reason is rejected for both reject and refuse.
	if err := reviewReturn(ctx, db, "admin", retID, "   ", false); !errors.Is(err, ErrReasonRequired) {
		t.Fatalf("blank reject reason: want ErrReasonRequired, got %v", err)
	}
	if err := reviewReturn(ctx, db, "admin", retID, "", true); !errors.Is(err, ErrReasonRequired) {
		t.Fatalf("empty refuse reason: want ErrReasonRequired, got %v", err)
	}
	// The return is untouched (still pending) after the rejected attempts.
	if s := returnStatus(t, ctx, db, retID); s != "pending" {
		t.Fatalf("status = %q, want pending (no review applied)", s)
	}
}

func TestCanCreateReturn_UndeliveredItem(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	// A paid order whose item has NO credentials yet (not delivered).
	var orderID string
	if err := db.QueryRow(ctx,
		"INSERT INTO orders (user_id, amount, status) VALUES ('u1', 10000, 'paid') RETURNING id",
	).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	var itemID string
	if err := db.QueryRow(ctx, `
		INSERT INTO order_items (order_id, game_id, game_name, platform, zarfiat, quantity)
		VALUES ($1, 'g1', 'Test Game', 'ps5', 'z2', 1) RETURNING id`, orderID,
	).Scan(&itemID); err != nil {
		t.Fatal(err)
	}

	if err := canCreateReturn(ctx, db, "u1", itemID); !errors.Is(err, ErrItemNotFound) {
		t.Fatalf("undelivered item: want ErrItemNotFound, got %v", err)
	}
}

func TestCreateApprove_CreditsWallet(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedUser(t, ctx, db, "admin", "09120000009", "admin")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	itemID := seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")

	if err := canCreateReturn(ctx, db, "u1", itemID); err != nil {
		t.Fatalf("canCreateReturn: %v", err)
	}
	retID, err := insertReturn(ctx, db, "u1", itemID, "vid.mp4")
	if err != nil {
		t.Fatal(err)
	}

	oldVideo, err := approveReturn(ctx, db, "admin", retID, testZ2Credit)
	if err != nil {
		t.Fatal(err)
	}
	if oldVideo != "vid.mp4" {
		t.Fatalf("approve returned old video %q, want vid.mp4 (for disk cleanup)", oldVideo)
	}
	if s := returnStatus(t, ctx, db, retID); s != "approved" {
		t.Fatalf("status = %q, want approved", s)
	}
	// The proof video reference is cleared once the deal is settled.
	var vid *string
	if err := db.QueryRow(ctx, "SELECT video_filename FROM game_returns WHERE id=$1", retID).Scan(&vid); err != nil {
		t.Fatal(err)
	}
	if vid != nil {
		t.Fatalf("video_filename = %q, want NULL after approval", *vid)
	}
	if bal := walletBalance(t, ctx, db, "u1"); bal != testZ2Credit {
		t.Fatalf("wallet = %d, want %d", bal, testZ2Credit)
	}
	var n int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM wallet_transactions WHERE user_id='u1' AND reason='return_credit' AND amount=$1", testZ2Credit,
	).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("return_credit ledger rows = %d, want 1", n)
	}

	// Approving again must be rejected and must not double-credit.
	if _, err := approveReturn(ctx, db, "admin", retID, testZ2Credit); !errors.Is(err, ErrNotReviewable) {
		t.Fatalf("second approve err = %v, want ErrNotReviewable", err)
	}
	if bal := walletBalance(t, ctx, db, "u1"); bal != testZ2Credit {
		t.Fatalf("wallet after double approve = %d, want %d", bal, testZ2Credit)
	}
}

func TestApprove_CreditCap(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedUser(t, ctx, db, "admin", "09120000009", "admin")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD) // current z2 full price = testZ2Price
	itemID := seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")
	retID, _ := insertReturn(ctx, db, "u1", itemID, "v.mp4")

	// More than the game's current full price is rejected.
	if _, err := approveReturn(ctx, db, "admin", retID, testZ2Price+1); !errors.Is(err, ErrCreditTooLarge) {
		t.Fatalf("over-price approve err = %v, want ErrCreditTooLarge", err)
	}
	// Exactly the full price is allowed (e.g. a 0%-fee promo credits the whole price).
	if _, err := approveReturn(ctx, db, "admin", retID, testZ2Price); err != nil {
		t.Fatalf("full-price approve: %v", err)
	}
	if bal := walletBalance(t, ctx, db, "u1"); bal != testZ2Price {
		t.Fatalf("wallet = %d, want %d", bal, testZ2Price)
	}
}

func TestApprove_CreditCap_Delisted(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedUser(t, ctx, db, "admin", "09120000009", "admin")
	seedRate(t, ctx, db, testRate)
	// Inactive game → no current price, so the absolute ceiling applies.
	seedGame(t, ctx, db, "g1", true, false, testUSD)
	itemID := seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")
	retID, _ := insertReturn(ctx, db, "u1", itemID, "v.mp4")

	if _, err := approveReturn(ctx, db, "admin", retID, MaxReturnCreditToman+1); !errors.Is(err, ErrCreditTooLarge) {
		t.Fatalf("over-ceiling approve err = %v, want ErrCreditTooLarge", err)
	}
	if _, err := approveReturn(ctx, db, "admin", retID, 500000); err != nil {
		t.Fatalf("admin-set credit on delisted game: %v", err)
	}
	if bal := walletBalance(t, ctx, db, "u1"); bal != 500000 {
		t.Fatalf("wallet = %d, want 500000", bal)
	}
}

func TestRejectThenResubmit(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedUser(t, ctx, db, "admin", "09120000009", "admin")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	itemID := seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")
	retID, _ := insertReturn(ctx, db, "u1", itemID, "vid.mp4")

	if err := reviewReturn(ctx, db, "admin", retID, "ویدیو واضح نیست", false); err != nil {
		t.Fatal(err)
	}
	if s := returnStatus(t, ctx, db, retID); s != "rejected" {
		t.Fatalf("status = %q, want rejected", s)
	}

	old, err := getResubmittable(ctx, db, "u1", retID)
	if err != nil {
		t.Fatalf("getResubmittable: %v", err)
	}
	if old != "vid.mp4" {
		t.Fatalf("old video = %q, want vid.mp4", old)
	}
	if err := resubmitReturn(ctx, db, "u1", retID, "vid2.mp4"); err != nil {
		t.Fatal(err)
	}
	if s := returnStatus(t, ctx, db, retID); s != "pending" {
		t.Fatalf("status = %q, want pending after resubmit", s)
	}
	var reason *string
	if err := db.QueryRow(ctx, "SELECT reason FROM game_returns WHERE id=$1", retID).Scan(&reason); err != nil {
		t.Fatal(err)
	}
	if reason != nil {
		t.Fatalf("reason = %v, want nil (cleared on resubmit)", *reason)
	}
}

func TestRefuse_TerminalNoCredit(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedUser(t, ctx, db, "admin", "09120000009", "admin")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	itemID := seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")
	retID, _ := insertReturn(ctx, db, "u1", itemID, "vid.mp4")

	if err := reviewReturn(ctx, db, "admin", retID, "ویدیو ویرایش شده است", true); err != nil {
		t.Fatal(err)
	}
	if s := returnStatus(t, ctx, db, retID); s != "refused" {
		t.Fatalf("status = %q, want refused", s)
	}
	// Terminal: the user can't resubmit, and it can't be approved.
	if _, err := getResubmittable(ctx, db, "u1", retID); !errors.Is(err, ErrNotResubmittable) {
		t.Fatalf("getResubmittable err = %v, want ErrNotResubmittable", err)
	}
	if _, err := approveReturn(ctx, db, "admin", retID, 1000); !errors.Is(err, ErrNotReviewable) {
		t.Fatalf("approve err = %v, want ErrNotReviewable", err)
	}
	if bal := walletBalance(t, ctx, db, "u1"); bal != 0 {
		t.Fatalf("wallet = %d, want 0 (refuse credits nothing)", bal)
	}
}

func TestCanCreate_Guards(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedRate(t, ctx, db, testRate)

	// Not returnable.
	seedGame(t, ctx, db, "g1", false, true, testUSD)
	item1 := seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")
	if err := canCreateReturn(ctx, db, "u1", item1); !errors.Is(err, ErrNotReturnable) {
		t.Fatalf("err = %v, want ErrNotReturnable", err)
	}

	// Returnable, but a request already exists.
	seedGame(t, ctx, db, "g2", true, true, testUSD)
	item2 := seedDeliveredItem(t, ctx, db, "u1", "g2", "e", "p", "c")
	if _, err := insertReturn(ctx, db, "u1", item2, "v.mp4"); err != nil {
		t.Fatal(err)
	}
	if err := canCreateReturn(ctx, db, "u1", item2); !errors.Is(err, ErrAlreadyRequested) {
		t.Fatalf("err = %v, want ErrAlreadyRequested", err)
	}

	// Unknown / not-owned item.
	if err := canCreateReturn(ctx, db, "u1", "00000000-0000-0000-0000-000000000000"); !errors.Is(err, ErrItemNotFound) {
		t.Fatalf("err = %v, want ErrItemNotFound", err)
	}
}

func TestAdminDetail_DecryptsAndEstimates(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	cred := newTestCipher(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)

	// Store credentials encrypted, exactly as fulfillment does.
	encEmail, _ := cred.EncryptNullable("acc@psn.com")
	encPass, _ := cred.EncryptNullable("secret")
	encCode, _ := cred.EncryptNullable("psn-pass")
	itemID := seedDeliveredItem(t, ctx, db, "u1", "g1", encEmail.(string), encPass.(string), encCode.(string))
	retID, _ := insertReturn(ctx, db, "u1", itemID, "vid.mp4")

	d, err := getAdminReturn(ctx, db, cred, retID)
	if err != nil || d == nil {
		t.Fatalf("getAdminReturn: %+v err=%v", d, err)
	}
	if d.AccountEmail == nil || *d.AccountEmail != "acc@psn.com" {
		t.Fatalf("AccountEmail = %v, want acc@psn.com", d.AccountEmail)
	}
	if d.AccountPass == nil || *d.AccountPass != "secret" {
		t.Fatalf("AccountPass = %v, want secret", d.AccountPass)
	}
	if !d.HasVideo {
		t.Fatal("HasVideo should be true")
	}
	if !d.Estimate.Available || d.Estimate.NetCredit != testZ2Credit {
		t.Fatalf("estimate = %+v, want available net %d", d.Estimate, testZ2Credit)
	}
}

func TestSweepReturnVideos(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	itemID := seedDeliveredItem(t, ctx, db, "u1", "g1", "e", "p", "c")
	if _, err := insertReturn(ctx, db, "u1", itemID, "keep.mp4"); err != nil {
		t.Fatal(err)
	}

	dir := t.TempDir()
	write := func(name string, age time.Duration) {
		p := filepath.Join(dir, name)
		if err := os.WriteFile(p, []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
		mt := time.Now().Add(-age)
		if err := os.Chtimes(p, mt, mt); err != nil {
			t.Fatal(err)
		}
	}
	write("keep.mp4", 24*time.Hour)       // referenced + old → kept
	write("orphan-old.mp4", 24*time.Hour) // unreferenced + old → removed
	write("orphan-new.mp4", 0)            // unreferenced + recent → spared by grace

	removed, err := sweepReturnVideos(ctx, db, dir, sweepGrace)
	if err != nil {
		t.Fatal(err)
	}
	if removed != 1 {
		t.Fatalf("removed = %d, want 1", removed)
	}

	exists := func(name string) bool {
		_, err := os.Stat(filepath.Join(dir, name))
		return err == nil
	}
	if !exists("keep.mp4") {
		t.Error("referenced video must be kept")
	}
	if exists("orphan-old.mp4") {
		t.Error("old orphan must be removed")
	}
	if !exists("orphan-new.mp4") {
		t.Error("recent orphan must be spared by the grace window")
	}
}

func newTestCipher(t *testing.T) *credentials.Cipher {
	t.Helper()
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}
	c, err := credentials.New(base64.StdEncoding.EncodeToString(key))
	if err != nil {
		t.Fatalf("credentials.New: %v", err)
	}
	return c
}
