package uploads

import (
	"context"
	"fmt"
	"log"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Dir resolves the configured upload directory (UPLOAD_DIR, default ./uploads).
// Shared so every caller — serving, sweeping, and the future game-update flow —
// agrees on one location.
func Dir() string {
	if d := os.Getenv("UPLOAD_DIR"); d != "" {
		return d
	}
	return "./uploads"
}

// DeleteImageByURL removes the stored file behind a "/uploads/<name>" path. It's
// a no-op for paths we don't own (absolute/external URLs) or files already gone,
// so the game-update flow can call it to drop a replaced cover without guarding.
func DeleteImageByURL(dir, coverURL string) error {
	const prefix = "/uploads/"
	if !strings.HasPrefix(coverURL, prefix) {
		return nil
	}
	name := path.Base(coverURL)
	if name == "." || name == "/" || name == "" {
		return nil
	}
	if err := os.Remove(filepath.Join(dir, name)); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("DeleteImageByURL: %w", err)
	}
	return nil
}

// SweepOrphans deletes files in dir that no game references via cover_image and
// that are older than grace (so an image uploaded but not yet attached to a game
// is left alone). Leftover temp files from interrupted writes are swept too.
// Returns how many files it removed.
func SweepOrphans(ctx context.Context, db *pgxpool.Pool, dir string, grace time.Duration) (int, error) {
	rows, err := db.Query(ctx, "SELECT cover_image FROM games WHERE cover_image LIKE '/uploads/%'")
	if err != nil {
		return 0, fmt.Errorf("SweepOrphans query: %w", err)
	}
	referenced := make(map[string]bool)
	for rows.Next() {
		var cover string
		if err := rows.Scan(&cover); err != nil {
			rows.Close()
			return 0, fmt.Errorf("SweepOrphans scan: %w", err)
		}
		referenced[path.Base(cover)] = true
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("SweepOrphans rows: %w", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, fmt.Errorf("SweepOrphans readdir: %w", err)
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
		// Skip anything written recently — it may be an upload not yet saved onto
		// a game (or an in-flight temp file).
		if info.ModTime().After(cutoff) {
			continue
		}
		if err := os.Remove(filepath.Join(dir, name)); err == nil {
			removed++
		}
	}
	return removed, nil
}

// startSweeper runs SweepOrphans on an interval for the life of the process.
func startSweeper(db *pgxpool.Pool, dir string, interval, grace time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			removed, err := SweepOrphans(context.Background(), db, dir, grace)
			if err != nil {
				log.Printf("uploads: orphan sweep failed: %v", err)
			} else if removed > 0 {
				log.Printf("uploads: orphan sweep removed %d file(s)", removed)
			}
		}
	}()
}
