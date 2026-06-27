package games

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/release"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func mustExec(t *testing.T, ctx context.Context, db *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := db.Exec(ctx, sql, args...); err != nil {
		t.Fatalf("exec failed: %v\nSQL: %s", err, sql)
	}
}

func seedAdmin(t *testing.T, ctx context.Context, db *pgxpool.Pool, id string) {
	mustExec(t, ctx, db, "INSERT INTO users (id, phone, role) VALUES ($1, $2, 'admin')", id, "0912"+id)
}

func seedGame(t *testing.T, ctx context.Context, db *pgxpool.Pool, id string) {
	mustExec(t, ctx, db,
		"INSERT INTO games (id, name, slug, platform, price_mode, active) VALUES ($1, 'Test Game', $1, 'ps5', 'dynamic', true)",
		id)
}

func TestSetGamePreorder(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	seedGame(t, ctx, db, "g1")

	releaseDate := time.Now().UTC().Add(10 * 24 * time.Hour)
	if err := setGamePreorder(ctx, db, "a1", "g1", release.StatusPreOrder, true, &releaseDate); err != nil {
		t.Fatal(err)
	}

	g, err := getGameByID(ctx, db, "g1", false)
	if err != nil {
		t.Fatal(err)
	}
	if g.ReleaseStatus != release.StatusPreOrder {
		t.Fatalf("release_status = %q, want pre_order", g.ReleaseStatus)
	}
	if g.ReleaseDate == nil {
		t.Fatal("release_date should be set")
	}
	if g.Phase != release.PhasePreOrder || !g.Purchasable {
		t.Fatalf("phase = %q purchasable = %v, want pre_order/true", g.Phase, g.Purchasable)
	}

	// The action must be audited.
	var n int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM admin_actions WHERE action = 'game.preorder' AND target_id = 'g1'",
	).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("audit rows = %d, want 1", n)
	}
}

func TestSetGamePreorder_Errors(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	seedGame(t, ctx, db, "g1")

	if err := setGamePreorder(ctx, db, "a1", "g1", "bogus", false, nil); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("invalid status: got %v, want ErrInvalidInput", err)
	}
	if err := setGamePreorder(ctx, db, "a1", "missing", release.StatusPreOrder, false, nil); !errors.Is(err, ErrGameNotFound) {
		t.Fatalf("missing game: got %v, want ErrGameNotFound", err)
	}
}

// TestSetGamePreorder_PauseResumePreservesDate is the rock-solid edge case: an
// admin closing a pre-order by flipping it to released and later re-opening it
// must keep the original release date, so the countdown/auto-close behave exactly
// as before — the toggle is a pause, not a reset.
func TestSetGamePreorder_PauseResumePreservesDate(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	seedGame(t, ctx, db, "g1")

	releaseDate := time.Now().UTC().Add(10 * 24 * time.Hour).Truncate(time.Second)
	if err := setGamePreorder(ctx, db, "a1", "g1", release.StatusPreOrder, true, &releaseDate); err != nil {
		t.Fatal(err)
	}

	// Pause: flip to released WITHOUT sending a date.
	if err := setGamePreorder(ctx, db, "a1", "g1", release.StatusReleased, false, nil); err != nil {
		t.Fatal(err)
	}
	g, err := getGameByID(ctx, db, "g1", false)
	if err != nil {
		t.Fatal(err)
	}
	if g.ReleaseStatus != release.StatusReleased || g.Phase != release.PhaseReleased {
		t.Fatalf("paused: status=%q phase=%q, want released/released", g.ReleaseStatus, g.Phase)
	}
	if g.ReleaseDate == nil || !g.ReleaseDate.Equal(releaseDate) {
		t.Fatalf("paused: release_date = %v, want preserved %v", g.ReleaseDate, releaseDate)
	}

	// Resume: flip back to pre_order WITHOUT a date — must behave exactly as before.
	if err := setGamePreorder(ctx, db, "a1", "g1", release.StatusPreOrder, false, nil); err != nil {
		t.Fatal(err)
	}
	g, err = getGameByID(ctx, db, "g1", false)
	if err != nil {
		t.Fatal(err)
	}
	if g.ReleaseStatus != release.StatusPreOrder || g.Phase != release.PhasePreOrder || !g.Purchasable {
		t.Fatalf("resumed: status=%q phase=%q purchasable=%v, want pre_order/pre_order/true",
			g.ReleaseStatus, g.Phase, g.Purchasable)
	}
	if g.ReleaseDate == nil || !g.ReleaseDate.Equal(releaseDate) {
		t.Fatalf("resumed: release_date = %v, want preserved %v", g.ReleaseDate, releaseDate)
	}
}

// An explicit date update (updateDate=true) still writes through, including a
// clear to NULL.
func TestSetGamePreorder_UpdateAndClearDate(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	seedGame(t, ctx, db, "g1")

	d1 := time.Now().UTC().Add(20 * 24 * time.Hour).Truncate(time.Second)
	if err := setGamePreorder(ctx, db, "a1", "g1", release.StatusPreOrder, true, &d1); err != nil {
		t.Fatal(err)
	}
	// Postpone to a new date.
	d2 := time.Now().UTC().Add(40 * 24 * time.Hour).Truncate(time.Second)
	if err := setGamePreorder(ctx, db, "a1", "g1", release.StatusPreOrder, true, &d2); err != nil {
		t.Fatal(err)
	}
	g, _ := getGameByID(ctx, db, "g1", false)
	if g.ReleaseDate == nil || !g.ReleaseDate.Equal(d2) {
		t.Fatalf("postpone: release_date = %v, want %v", g.ReleaseDate, d2)
	}
	// Clear the date explicitly.
	if err := setGamePreorder(ctx, db, "a1", "g1", release.StatusPreOrder, true, nil); err != nil {
		t.Fatal(err)
	}
	g, _ = getGameByID(ctx, db, "g1", false)
	if g.ReleaseDate != nil {
		t.Fatalf("clear: release_date = %v, want nil", g.ReleaseDate)
	}
}

func TestSetGameAlert_SetAndClear(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	seedGame(t, ctx, db, "g1")

	if err := setGameAlert(ctx, db, "a1", "g1", "تعمیرات سرور", "warning"); err != nil {
		t.Fatal(err)
	}
	g, err := getGameByID(ctx, db, "g1", false)
	if err != nil {
		t.Fatal(err)
	}
	if g.AlertMessage == nil || *g.AlertMessage != "تعمیرات سرور" || g.AlertVariant == nil || *g.AlertVariant != "warning" {
		t.Fatalf("alert not set: message=%v variant=%v", g.AlertMessage, g.AlertVariant)
	}

	// Empty message clears both fields.
	if err := setGameAlert(ctx, db, "a1", "g1", "  ", "info"); err != nil {
		t.Fatal(err)
	}
	g, err = getGameByID(ctx, db, "g1", false)
	if err != nil {
		t.Fatal(err)
	}
	if g.AlertMessage != nil || g.AlertVariant != nil {
		t.Fatalf("alert not cleared: message=%v variant=%v", g.AlertMessage, g.AlertVariant)
	}
}

func TestSetGameAlert_InvalidVariant(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	seedGame(t, ctx, db, "g1")

	if err := setGameAlert(ctx, db, "a1", "g1", "hi", "danger"); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("invalid variant: got %v, want ErrInvalidInput", err)
	}
}
