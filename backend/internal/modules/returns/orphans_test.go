package returns

import (
	"context"
	"testing"
	"time"

	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func TestReleaseStaleReturnVideos_KeepsRecentRejectedProof(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedUser(t, ctx, db, "u1", "09120000001", "user")
	seedUser(t, ctx, db, "admin", "09120000009", "admin")
	seedRate(t, ctx, db, testRate)
	seedGame(t, ctx, db, "g1", true, true, testUSD)

	oldItem := seedDeliveredItem(t, ctx, db, "u1", "g1", "old@example.test", "p", "c")
	oldReturn, _ := insertReturn(ctx, db, "u1", oldItem, "old.mp4")
	if err := reviewReturn(ctx, db, "admin", oldReturn, "ویدیو واضح نیست", false); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, "UPDATE game_returns SET reviewed_at=NOW() - INTERVAL '31 days' WHERE id=$1", oldReturn); err != nil {
		t.Fatal(err)
	}

	recentItem := seedDeliveredItem(t, ctx, db, "u1", "g1", "recent@example.test", "p", "c")
	recentReturn, _ := insertReturn(ctx, db, "u1", recentItem, "recent.mp4")
	if err := reviewReturn(ctx, db, "admin", recentReturn, "نیاز به ارسال دوباره", false); err != nil {
		t.Fatal(err)
	}

	released, err := releaseStaleReturnVideos(ctx, db, 30*24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if len(released) != 1 || released[0] != "old.mp4" {
		t.Fatalf("released = %v, want [old.mp4]", released)
	}

	var oldVideo, recentVideo *string
	if err := db.QueryRow(ctx, "SELECT video_filename FROM game_returns WHERE id=$1", oldReturn).Scan(&oldVideo); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, "SELECT video_filename FROM game_returns WHERE id=$1", recentReturn).Scan(&recentVideo); err != nil {
		t.Fatal(err)
	}
	if oldVideo != nil {
		t.Fatalf("old video reference = %q, want NULL", *oldVideo)
	}
	if recentVideo == nil || *recentVideo != "recent.mp4" {
		t.Fatalf("recent video reference = %v, want recent.mp4", recentVideo)
	}
}
