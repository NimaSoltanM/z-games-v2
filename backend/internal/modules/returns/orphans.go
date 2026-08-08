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
	sweepInterval          = 6 * time.Hour
	sweepGrace             = 2 * time.Hour
	rejectedVideoRetention = 30 * 24 * time.Hour
)

// startVideoSweeper periodically removes return videos on disk that no game_returns
// row references — abandoned/failed uploads, clips replaced on resubmit, and videos
// from returns later removed (e.g. by an order/user cascade). Without it the private
// RETURN_DIR would only ever grow.
func startVideoSweeper(db *pgxpool.Pool, dir string) {
	go func() {
		run := func() {
			released, err := releaseStaleReturnVideos(context.Background(), db, rejectedVideoRetention)
			if err != nil {
				log.Printf("returns: stale video release failed: %v", err)
			} else {
				for _, name := range released {
					if err := os.Remove(filepath.Join(dir, filepath.Base(name))); err != nil && !os.IsNotExist(err) {
						log.Printf("returns: stale video cleanup failed for %s: %v", name, err)
					}
				}
				if len(released) > 0 {
					log.Printf("returns: released %d stale proof video(s)", len(released))
				}
			}

			removed, err := sweepReturnVideos(context.Background(), db, dir, sweepGrace)
			if err != nil {
				log.Printf("returns: video sweep failed: %v", err)
			} else if removed > 0 {
				log.Printf("returns: video sweep removed %d file(s)", removed)
			}
		}

		run()
		ticker := time.NewTicker(sweepInterval)
		defer ticker.Stop()
		for range ticker.C {
			run()
		}
	}()
}

// releaseStaleReturnVideos clears database references before files are deleted.
// Refused returns are terminal and can be removed immediately; rejected returns
// retain their proof long enough for support/dispute handling and resubmission.
func releaseStaleReturnVideos(ctx context.Context, db *pgxpool.Pool, retention time.Duration) ([]string, error) {
	rows, err := db.Query(ctx, `
		WITH released AS (
			SELECT id, video_filename
			FROM game_returns
			WHERE video_filename IS NOT NULL
			  AND (
			    status = 'refused'
			    OR (status = 'rejected' AND reviewed_at <= $1)
			  )
			FOR UPDATE
		), updated AS (
			UPDATE game_returns gr
			SET video_filename = NULL, updated_at = NOW()
			FROM released
			WHERE gr.id = released.id
			RETURNING released.video_filename
		)
		SELECT video_filename FROM updated
	`, time.Now().Add(-retention))
	if err != nil {
		return nil, fmt.Errorf("releaseStaleReturnVideos update: %w", err)
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("releaseStaleReturnVideos scan: %w", err)
		}
		names = append(names, name)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("releaseStaleReturnVideos rows: %w", err)
	}
	return names, nil
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
