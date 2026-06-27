package audit

import (
	"context"
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

func seedAdmin(t *testing.T, ctx context.Context, db *pgxpool.Pool, id, first, last string) {
	mustExec(t, ctx, db,
		"INSERT INTO users (id, phone, first_name, last_name, role) VALUES ($1, $2, $3, $4, 'admin')",
		id, "0912"+id, first, last)
}

func seedAction(t *testing.T, ctx context.Context, db *pgxpool.Pool, adminID, action string, at time.Time) {
	mustExec(t, ctx, db,
		"INSERT INTO admin_actions (admin_id, action, target_type, target_id, metadata, created_at) VALUES ($1, $2, 'game', 'g1', '{}'::jsonb, $3)",
		adminID, action, at)
}

func TestListActions_OrderFilterPaginate(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1", "Ali", "")
	seedAdmin(t, ctx, db, "a2", "Reza", "")

	base := time.Now().Truncate(time.Second)
	seedAction(t, ctx, db, "a1", "game.create", base)
	seedAction(t, ctx, db, "a1", "game.update", base.Add(time.Minute))
	seedAction(t, ctx, db, "a2", "order.fulfill", base.Add(2*time.Minute))

	// Unfiltered: newest first, with the admin name joined in.
	rows, total, err := listActions(ctx, db, listFilters{}, 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	if total != 3 || len(rows) != 3 {
		t.Fatalf("total=%d len=%d, want 3/3", total, len(rows))
	}
	if rows[0].Action != "order.fulfill" || rows[0].AdminName != "Reza" {
		t.Fatalf("newest row = %q by %q, want order.fulfill by Reza", rows[0].Action, rows[0].AdminName)
	}
	if rows[2].Action != "game.create" {
		t.Fatalf("oldest row = %q, want game.create", rows[2].Action)
	}

	// Filter by admin.
	rows, total, err = listActions(ctx, db, listFilters{AdminID: "a1"}, 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	if total != 2 {
		t.Fatalf("admin filter total = %d, want 2", total)
	}
	for _, r := range rows {
		if r.AdminID != "a1" {
			t.Fatalf("admin filter leaked %q", r.AdminID)
		}
	}

	// Filter by action.
	_, total, err = listActions(ctx, db, listFilters{Action: "game.update"}, 20, 0)
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 {
		t.Fatalf("action filter total = %d, want 1", total)
	}

	// Pagination: page size 1 walks newest -> oldest.
	first, _, _ := listActions(ctx, db, listFilters{}, 1, 0)
	second, _, _ := listActions(ctx, db, listFilters{}, 1, 1)
	if len(first) != 1 || first[0].Action != "order.fulfill" {
		t.Fatalf("page 1 = %v", first)
	}
	if len(second) != 1 || second[0].Action != "game.update" {
		t.Fatalf("page 2 = %v", second)
	}
}

func TestListActors_Distinct(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1", "Ali", "")
	seedAdmin(t, ctx, db, "a2", "Reza", "")

	base := time.Now().Truncate(time.Second)
	seedAction(t, ctx, db, "a1", "game.create", base)
	seedAction(t, ctx, db, "a1", "game.update", base.Add(time.Minute))
	seedAction(t, ctx, db, "a2", "order.fulfill", base.Add(2*time.Minute))

	actors, err := listActors(ctx, db)
	if err != nil {
		t.Fatal(err)
	}
	if len(actors) != 2 {
		t.Fatalf("actors = %d, want 2 distinct", len(actors))
	}
	// Ordered by name: Ali, then Reza.
	if actors[0].Name != "Ali" || actors[1].Name != "Reza" {
		t.Fatalf("actor order = %q, %q, want Ali, Reza", actors[0].Name, actors[1].Name)
	}
}
