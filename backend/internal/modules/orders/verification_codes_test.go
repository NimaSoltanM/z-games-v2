package orders

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestVerificationCodeEligibilityExcludesOnlyPlayStationZ1(t *testing.T) {
	tests := []struct {
		platform, capacity string
		want               bool
	}{
		{"ps4", "z1", false},
		{"ps5", "Z1", false},
		{"playstation_6", "z1", false},
		{"ps5", "z2", true},
		{"xbox_series", "home", true},
		{"xbox_series", "z1", true},
		{"steam", "shared", true},
	}
	for _, tt := range tests {
		if got := verificationCodeEligible(tt.platform, tt.capacity); got != tt.want {
			t.Errorf("verificationCodeEligible(%q,%q)=%v, want %v", tt.platform, tt.capacity, got, tt.want)
		}
	}
}

func TestVerificationRequestIsGlobalPerUserAndRollingTwentyFourHours(t *testing.T) {
	ctx, db, cred := setupCredentialTest(t)
	order1, item1 := newPaidOrderItem(t, ctx, db, cred, "buyer1", oneItem())
	deliverCredentials(t, ctx, db, cred, "admin", order1, item1, "first@example.com")
	order2, item2 := newPaidOrderItem(t, ctx, db, cred, "buyer1", oneItem())
	deliverCredentials(t, ctx, db, cred, "admin", order2, item2, "second@example.com")

	req, err := requestVerificationCode(ctx, db, "buyer1", item1)
	if err != nil || req.Status != "pending" {
		t.Fatalf("first request=%+v err=%v", req, err)
	}
	if _, err := requestVerificationCode(ctx, db, "buyer1", item2); !errors.Is(err, ErrVerificationPending) {
		t.Fatalf("second pending request error=%v, want ErrVerificationPending", err)
	}
	if _, err := sendVerificationCode(ctx, db, cred, "admin", req.ID, "123456", false); err != nil {
		t.Fatal(err)
	}
	if _, err := requestVerificationCode(ctx, db, "buyer1", item2); !errors.Is(err, ErrVerificationActive) {
		t.Fatalf("request while active error=%v, want ErrVerificationActive", err)
	}

	mustExec(t, ctx, db, "UPDATE verification_code_requests SET expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1", req.ID)
	if _, err := purgeExpiredVerificationCodes(ctx, db); err != nil {
		t.Fatal(err)
	}
	if _, err := requestVerificationCode(ctx, db, "buyer1", item2); err == nil {
		t.Fatal("request inside rolling 24-hour window unexpectedly succeeded")
	} else {
		var cooldown *verificationCooldownError
		if !errors.As(err, &cooldown) {
			t.Fatalf("request error=%v, want verificationCooldownError", err)
		}
	}
	mustExec(t, ctx, db, "UPDATE verification_code_requests SET requested_at=NOW()-INTERVAL '25 hours' WHERE id=$1", req.ID)
	if _, err := requestVerificationCode(ctx, db, "buyer1", item2); err != nil {
		t.Fatalf("request after window: %v", err)
	}
}

func TestVerificationRequestRejectsReturnedAccount(t *testing.T) {
	ctx, db, cred := setupCredentialTest(t)
	itemID, _ := deliverAndReturn(t, ctx, db, cred, "buyer1", oneItem(), "returned@example.com", "pw", "code")
	if _, err := requestVerificationCode(ctx, db, "buyer1", itemID); !errors.Is(err, ErrVerificationItemNotFound) {
		t.Fatalf("returned account error=%v, want ErrVerificationItemNotFound", err)
	}
}

func TestSendVerificationCodeWarnsOnActiveDuplicateAndOverrideIsAudited(t *testing.T) {
	ctx, db, cred := setupCredentialTest(t)
	order1, item1 := newPaidOrderItem(t, ctx, db, cred, "buyer1", oneItem())
	deliverCredentials(t, ctx, db, cred, "admin", order1, item1, "one@example.com")
	order2, item2 := newPaidOrderItem(t, ctx, db, cred, "buyer2", oneItem())
	deliverCredentials(t, ctx, db, cred, "admin", order2, item2, "two@example.com")
	req1, err := requestVerificationCode(ctx, db, "buyer1", item1)
	if err != nil {
		t.Fatal(err)
	}
	req2, err := requestVerificationCode(ctx, db, "buyer2", item2)
	if err != nil {
		t.Fatal(err)
	}
	if matches, err := sendVerificationCode(ctx, db, cred, "admin", req1.ID, " SAME-CODE ", false); err != nil || len(matches) != 0 {
		t.Fatalf("first send matches=%+v err=%v", matches, err)
	}
	matches, err := sendVerificationCode(ctx, db, cred, "admin", req2.ID, "SAME-CODE", false)
	if err != nil || len(matches) != 1 || matches[0].OrderID != order1 {
		t.Fatalf("duplicate matches=%+v err=%v", matches, err)
	}
	var status string
	if err := db.QueryRow(ctx, "SELECT status FROM verification_code_requests WHERE id=$1", req2.ID).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != "pending" {
		t.Fatalf("warning saved request status=%q, want pending", status)
	}
	if matches, err := sendVerificationCode(ctx, db, cred, "admin", req2.ID, "SAME-CODE", true); err != nil || len(matches) != 0 {
		t.Fatalf("override matches=%+v err=%v", matches, err)
	}
	var encrypted string
	var expiresAt, deliveredAt time.Time
	if err := db.QueryRow(ctx, "SELECT code, delivered_at, expires_at FROM verification_code_requests WHERE id=$1", req2.ID).Scan(&encrypted, &deliveredAt, &expiresAt); err != nil {
		t.Fatal(err)
	}
	if encrypted == "SAME-CODE" {
		t.Fatal("verification code was stored in plaintext")
	}
	if d := expiresAt.Sub(deliveredAt); d < 23*time.Hour+59*time.Minute || d > 24*time.Hour+time.Minute {
		t.Fatalf("code lifetime=%v, want 24h", d)
	}
	var actions int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) FROM admin_actions WHERE action=$1 AND target_id=$2", "verification_code.send", req2.ID).Scan(&actions); err != nil {
		t.Fatal(err)
	}
	if actions != 1 {
		t.Fatalf("audit actions=%d, want 1", actions)
	}
}

func TestExpiredVerificationCodeIsErasedAndHiddenFromCustomer(t *testing.T) {
	ctx, db, cred := setupCredentialTest(t)
	orderID, itemID := newPaidOrderItem(t, ctx, db, cred, "buyer1", oneItem())
	deliverCredentials(t, ctx, db, cred, "admin", orderID, itemID, "player@example.com")
	req, err := requestVerificationCode(ctx, db, "buyer1", itemID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := sendVerificationCode(ctx, db, cred, "admin", req.ID, "TEMP-CODE", false); err != nil {
		t.Fatal(err)
	}
	mustExec(t, ctx, db, "UPDATE verification_code_requests SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1", req.ID)
	if n, err := purgeExpiredVerificationCodes(context.Background(), db); err != nil || n != 1 {
		t.Fatalf("purge count=%d err=%v", n, err)
	}
	var code *string
	var status string
	if err := db.QueryRow(ctx, "SELECT code, status FROM verification_code_requests WHERE id=$1", req.ID).Scan(&code, &status); err != nil {
		t.Fatal(err)
	}
	if code != nil || status != "expired" {
		t.Fatalf("expired row code=%v status=%q", code, status)
	}
	order, err := getUserOrder(ctx, db, cred, "buyer1", orderID)
	if err != nil {
		t.Fatal(err)
	}
	support := order.Items[0].VerificationCode
	if support == nil || support.Request == nil || support.Request.Status != "expired" || support.Request.Code != nil {
		t.Fatalf("customer support view=%+v", support)
	}
}
