package support

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func seedSupportUser(t *testing.T, ctx context.Context, db *pgxpool.Pool, id, phone, role string) {
	t.Helper()
	if _, err := db.Exec(ctx,
		"INSERT INTO users (id, phone, first_name, role) VALUES ($1, $2, $3, $4::user_role)",
		id, phone, id, role,
	); err != nil {
		t.Fatalf("seed user: %v", err)
	}
}

func TestTicketLifecycleAndOwnership(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedSupportUser(t, ctx, db, "customer", "09120000001", "user")
	seedSupportUser(t, ctx, db, "other", "09120000002", "user")
	seedSupportUser(t, ctx, db, "admin", "09120000003", "admin")

	id, err := createTicket(ctx, db, "customer", "مشکل سفارش", "order", "شرح اولیه درخواست")
	if err != nil {
		t.Fatalf("create ticket: %v", err)
	}

	detail, err := getTicket(ctx, db, id, "customer", false)
	if err != nil {
		t.Fatalf("get own ticket: %v", err)
	}
	if detail == nil || detail.Status != "awaiting_admin" || len(detail.Messages) != 1 {
		t.Fatalf("unexpected new ticket: %+v", detail)
	}
	if hidden, err := getTicket(ctx, db, id, "other", false); err != nil || hidden != nil {
		t.Fatalf("ticket leaked to another user: detail=%+v err=%v", hidden, err)
	}
	if err := addReply(ctx, db, id, "other", "نباید ثبت شود", false); !errors.Is(err, ErrTicketNotFound) {
		t.Fatalf("other user reply error = %v, want not found", err)
	}

	if err := addReply(ctx, db, id, "admin", "پاسخ پشتیبانی", true); err != nil {
		t.Fatalf("admin reply: %v", err)
	}
	detail, err = getTicket(ctx, db, id, "admin", true)
	if err != nil {
		t.Fatalf("admin get: %v", err)
	}
	if detail.Status != "awaiting_customer" || len(detail.Messages) != 2 {
		t.Fatalf("after admin reply: %+v", detail)
	}

	if err := setStatus(ctx, db, id, "admin", "resolved"); err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if err := addReply(ctx, db, id, "customer", "اطلاعات تکمیلی", false); err != nil {
		t.Fatalf("customer reopen reply: %v", err)
	}
	detail, err = getTicket(ctx, db, id, "customer", false)
	if err != nil {
		t.Fatalf("get reopened ticket: %v", err)
	}
	if detail.Status != "awaiting_admin" || len(detail.Messages) != 3 {
		t.Fatalf("after customer reply: %+v", detail)
	}

	var auditCount int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM admin_actions WHERE target_id = $1 AND action IN ('support.reply', 'support.status')",
		id,
	).Scan(&auditCount); err != nil {
		t.Fatalf("count audit rows: %v", err)
	}
	if auditCount != 2 {
		t.Fatalf("audit rows = %d, want 2", auditCount)
	}
}

func TestTicketInputValidation(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedSupportUser(t, ctx, db, "customer", "09120000001", "user")

	if _, err := createTicket(ctx, db, "customer", "", "order", "body"); !errors.Is(err, ErrInvalidSubject) {
		t.Fatalf("empty subject error = %v", err)
	}
	if _, err := createTicket(ctx, db, "customer", "subject", "unknown", "body"); !errors.Is(err, ErrInvalidCategory) {
		t.Fatalf("category error = %v", err)
	}
	if _, err := createTicket(ctx, db, "customer", "subject", "other", " "); !errors.Is(err, ErrInvalidMessage) {
		t.Fatalf("empty body error = %v", err)
	}
}
