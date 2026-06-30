package returns

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	// sweepInterval/sweepGrace control return-video cleanup: how often the sweep
	// runs, and how new a file must be to be spared (a just-uploaded clip whose row
	// may still be committing). Grace comfortably exceeds a single request.
	sweepInterval = 6 * time.Hour
	sweepGrace    = 2 * time.Hour
)

// startVideoSweeper periodically removes return videos on disk that no game_returns
// row references — abandoned/failed uploads, clips replaced on resubmit, and videos
// from returns later removed (e.g. by an order/user cascade). Without it the private
// RETURN_DIR would only ever grow.
func startVideoSweeper(db *pgxpool.Pool, dir string) {
	go func() {
		ticker := time.NewTicker(sweepInterval)
		defer ticker.Stop()
		for range ticker.C {
			removed, err := sweepReturnVideos(context.Background(), db, dir, sweepGrace)
			if err != nil {
				log.Printf("returns: video sweep failed: %v", err)
			} else if removed > 0 {
				log.Printf("returns: video sweep removed %d file(s)", removed)
			}
		}
	}()
}

// sweepReturnVideos deletes files in dir that aren't referenced by any
// game_returns.video_filename and are older than grace. Returns how many it removed.
func sweepReturnVideos(ctx context.Context, db *pgxpool.Pool, dir string, grace time.Duration) (int, error) {
	rows, err := db.Query(ctx, "SELECT video_filename FROM game_returns WHERE video_filename IS NOT NULL")
	if err != nil {
		return 0, fmt.Errorf("sweepReturnVideos query: %w", err)
	}
	referenced := make(map[string]bool)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			rows.Close()
			return 0, fmt.Errorf("sweepReturnVideos scan: %w", err)
		}
		referenced[name] = true
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("sweepReturnVideos rows: %w", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, fmt.Errorf("sweepReturnVideos readdir: %w", err)
	}

	cutoff := time.Now().Add(-grace)
	removed := 0
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if referenced[name] {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		// Spare anything written recently — it may be an upload whose row is still
		// committing (or an in-flight temp file).
		if info.ModTime().After(cutoff) {
			continue
		}
		if err := os.Remove(filepath.Join(dir, name)); err == nil {
			removed++
		}
	}
	return removed, nil
}
