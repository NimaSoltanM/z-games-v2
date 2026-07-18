package returns

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func seedEncryptedDeliveredItem(t *testing.T, ctx context.Context, db *pgxpool.Pool, cipher *credentials.Cipher, userID, gameID, email string) (orderID, itemID string) {
	t.Helper()
	if err := db.QueryRow(ctx,
		"INSERT INTO orders (user_id, amount, status) VALUES ($1, 10000, 'fulfilled') RETURNING id", userID,
	).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	encryptedEmail, err := cipher.EncryptNullable(email)
	if err != nil {
		t.Fatal(err)
	}
	encryptedPassword, err := cipher.EncryptNullable("password")
	if err != nil {
		t.Fatal(err)
	}
	encryptedPasscode, err := cipher.EncryptNullable("code")
	if err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `
		INSERT INTO order_items (order_id, game_id, game_name, platform, zarfiat, quantity, email, password, passcode)
		VALUES ($1, $2, 'Test Game', 'ps5', 'z2', 1, $3, $4, $5) RETURNING id
	`, orderID, gameID, encryptedEmail, encryptedPassword, encryptedPasscode).Scan(&itemID); err != nil {
		t.Fatal(err)
	}
	return orderID, itemID
}

func seedApprovedInventory(t *testing.T, ctx context.Context, db *pgxpool.Pool, itemID, userID string) string {
	t.Helper()
	var returnID string
	if err := db.QueryRow(ctx, `
		INSERT INTO game_returns
		  (order_item_id, user_id, status, agreed_terms, reviewed_at, updated_at)
		VALUES ($1, $2, 'approved', true, NOW(), NOW())
		RETURNING id
	`, itemID, userID).Scan(&returnID); err != nil {
		t.Fatal(err)
	}
	return returnID
}

func setupInventoryTest(t *testing.T) (context.Context, *pgxpool.Pool, *credentials.Cipher) {
	t.Helper()
	ctx := context.Background()
	db := testdb.New(t)
	cipher := newTestCipher(t)
	seedUser(t, ctx, db, "buyer1", "09120000001", "user")
	seedUser(t, ctx, db, "buyer2", "09120000002", "user")
	seedUser(t, ctx, db, "admin", "09120000009", "admin")
	seedGame(t, ctx, db, "g1", true, true, testUSD)
	return ctx, db, cipher
}

func TestReturnedAccountInventory_ListAndNonDestructiveToggle(t *testing.T) {
	ctx, db, cipher := setupInventoryTest(t)
	_, itemID := seedEncryptedDeliveredItem(t, ctx, db, cipher, "buyer1", "g1", "stock@example.com")
	returnID := seedApprovedInventory(t, ctx, db, itemID, "buyer1")

	rows, total, err := listReturnedAccounts(ctx, db, cipher, returnedAccountFilter{limit: 20})
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 || len(rows) != 1 || !rows[0].Available || rows[0].AccountEmail == nil || *rows[0].AccountEmail != "stock@example.com" {
		t.Fatalf("inventory = total %d rows %+v", total, rows)
	}

	if err := setReturnedAccountAvailability(ctx, db, cipher, "admin", returnID, false); err != nil {
		t.Fatal(err)
	}
	disabled, total, err := listReturnedAccounts(ctx, db, cipher, returnedAccountFilter{status: "disabled", limit: 20})
	if err != nil || total != 1 || len(disabled) != 1 || disabled[0].Available {
		t.Fatalf("disabled inventory total=%d rows=%+v err=%v", total, disabled, err)
	}

	if err := setReturnedAccountAvailability(ctx, db, cipher, "admin", returnID, true); err != nil {
		t.Fatal(err)
	}
	available, total, err := listReturnedAccounts(ctx, db, cipher, returnedAccountFilter{status: "available", limit: 20})
	if err != nil || total != 1 || len(available) != 1 || !available[0].Available {
		t.Fatalf("available inventory total=%d rows=%+v err=%v", total, available, err)
	}
}

func TestReturnedAccountInventory_CannotReactivateUsedOrActivelyHeldAccount(t *testing.T) {
	ctx, db, cipher := setupInventoryTest(t)
	_, sourceItem := seedEncryptedDeliveredItem(t, ctx, db, cipher, "buyer1", "g1", "shared@example.com")
	returnID := seedApprovedInventory(t, ctx, db, sourceItem, "buyer1")

	if err := setReturnedAccountAvailability(ctx, db, cipher, "admin", returnID, false); err != nil {
		t.Fatal(err)
	}
	seedEncryptedDeliveredItem(t, ctx, db, cipher, "buyer2", "g1", "SHARED@example.com")
	if err := setReturnedAccountAvailability(ctx, db, cipher, "admin", returnID, true); !errors.Is(err, ErrInventoryActive) {
		t.Fatalf("enable while active err = %v, want ErrInventoryActive", err)
	}

	mustExec(t, ctx, db, `
		UPDATE game_returns
		SET inventory_disabled_at = NULL, inventory_disabled_by = NULL, reused_at = NOW()
		WHERE id = $1
	`, returnID)
	if err := setReturnedAccountAvailability(ctx, db, cipher, "admin", returnID, true); !errors.Is(err, ErrInventoryReused) {
		t.Fatalf("enable reused err = %v, want ErrInventoryReused", err)
	}
}
