package games

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/modules/uploads"
	"github.com/soltanmohammdi/z-games/internal/shared/audit"
	"github.com/soltanmohammdi/z-games/internal/shared/release"
)

// ErrDuplicateLink is returned when a link URL is already attached to another
// game (game_links.url is globally unique).
var ErrDuplicateLink = errors.New("DUPLICATE_LINK")

// releaseStatusOrDefault guards a write against an empty status (e.g. a directly
// constructed input), falling back to the released default the DB also uses.
func releaseStatusOrDefault(s string) string {
	if s == "" {
		return release.StatusReleased
	}
	return s
}

// isUniqueViolation reports whether err is a Postgres unique-constraint error.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// insertChildren writes a game's prices and links inside an open transaction.
// Returns ErrDuplicateLink if a link URL collides with another game's.
func insertChildren(ctx context.Context, tx pgx.Tx, gameID string, in normalizedGame) error {
	for _, p := range in.Prices {
		if _, err := tx.Exec(ctx, `
			INSERT INTO game_prices (game_id, platform, zarfiat, price_usd, price_toman, slots)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, gameID, p.Platform, p.Zarfiat, p.PriceUSD, p.PriceToman, p.Slots); err != nil {
			return fmt.Errorf("insert price: %w", err)
		}
	}
	for _, url := range in.Links {
		linkID, err := newID()
		if err != nil {
			return fmt.Errorf("link id: %w", err)
		}
		if _, err := tx.Exec(ctx,
			"INSERT INTO game_links (id, game_id, url) VALUES ($1, $2, $3)",
			linkID, gameID, url,
		); err != nil {
			if isUniqueViolation(err) {
				return ErrDuplicateLink
			}
			return fmt.Errorf("insert link: %w", err)
		}
	}
	return nil
}

// createGame inserts a game with its prices and links in one transaction and
// returns the new id. Audited.
func createGame(ctx context.Context, db *pgxpool.Pool, adminID string, in normalizedGame) (string, error) {
	id, err := newID()
	if err != nil {
		return "", fmt.Errorf("createGame id: %w", err)
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("createGame begin: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		INSERT INTO games (id, name, cover_image, platform, price_mode, active,
		                   release_status, release_date, alert_message, alert_variant)
		VALUES ($1, $2, $3, $4::platform, $5::price_mode, $6, $7, $8, $9, $10)
	`, id, in.Name, in.CoverImage, in.Platform, in.PriceMode, in.Active,
		releaseStatusOrDefault(in.ReleaseStatus), in.ReleaseDate, in.AlertMessage, in.AlertVariant); err != nil {
		return "", fmt.Errorf("createGame insert: %w", err)
	}

	if err := insertChildren(ctx, tx, id, in); err != nil {
		return "", err
	}

	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionGameCreate,
		TargetType: "game",
		TargetID:   id,
		Metadata:   map[string]any{"name": in.Name, "prices": len(in.Prices), "links": len(in.Links)},
	}); err != nil {
		return "", fmt.Errorf("createGame: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("createGame commit: %w", err)
	}
	return id, nil
}

// updateGame overwrites a game and fully replaces its prices and links in one
// transaction. If the cover image changed, the old uploaded file is removed
// (best-effort) after commit. Audited. Returns ErrGameNotFound / ErrDuplicateLink.
func updateGame(ctx context.Context, db *pgxpool.Pool, adminID, id string, in normalizedGame) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("updateGame begin: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock the row and grab the current cover so we can clean it up if it changes.
	var oldCover *string
	err = tx.QueryRow(ctx, "SELECT cover_image FROM games WHERE id = $1 FOR UPDATE", id).Scan(&oldCover)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrGameNotFound
	}
	if err != nil {
		return fmt.Errorf("updateGame load: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE games SET name = $2, cover_image = $3, platform = $4::platform,
		       price_mode = $5::price_mode, active = $6, release_status = $7,
		       release_date = $8, alert_message = $9, alert_variant = $10, updated_at = NOW()
		WHERE id = $1
	`, id, in.Name, in.CoverImage, in.Platform, in.PriceMode, in.Active,
		releaseStatusOrDefault(in.ReleaseStatus), in.ReleaseDate, in.AlertMessage, in.AlertVariant); err != nil {
		return fmt.Errorf("updateGame update: %w", err)
	}

	if _, err := tx.Exec(ctx, "DELETE FROM game_prices WHERE game_id = $1", id); err != nil {
		return fmt.Errorf("updateGame clear prices: %w", err)
	}
	if _, err := tx.Exec(ctx, "DELETE FROM game_links WHERE game_id = $1", id); err != nil {
		return fmt.Errorf("updateGame clear links: %w", err)
	}
	if err := insertChildren(ctx, tx, id, in); err != nil {
		return err
	}

	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionGameUpdate,
		TargetType: "game",
		TargetID:   id,
		Metadata:   map[string]any{"prices": len(in.Prices), "links": len(in.Links)},
	}); err != nil {
		return fmt.Errorf("updateGame: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("updateGame commit: %w", err)
	}

	// Only after a successful commit, drop the replaced cover file.
	cleanupReplacedCover(oldCover, in.CoverImage)
	return nil
}

// deleteGame removes a game (cascading prices, links, and cart items) and deletes
// its cover file. Audited. Returns ErrGameNotFound.
func deleteGame(ctx context.Context, db *pgxpool.Pool, adminID, id string) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("deleteGame begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var cover *string
	err = tx.QueryRow(ctx, "SELECT cover_image FROM games WHERE id = $1", id).Scan(&cover)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrGameNotFound
	}
	if err != nil {
		return fmt.Errorf("deleteGame load: %w", err)
	}

	if _, err := tx.Exec(ctx, "DELETE FROM games WHERE id = $1", id); err != nil {
		return fmt.Errorf("deleteGame delete: %w", err)
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionGameDelete,
		TargetType: "game",
		TargetID:   id,
	}); err != nil {
		return fmt.Errorf("deleteGame: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("deleteGame commit: %w", err)
	}

	if cover != nil {
		if err := uploads.DeleteImageByURL(uploads.Dir(), *cover); err != nil {
			log.Printf("deleteGame: cover cleanup failed for %s: %v", id, err)
		}
	}
	return nil
}

// cleanupReplacedCover removes the old cover file when the cover changed to a
// different value. Best-effort: a failure is logged, never surfaced.
func cleanupReplacedCover(oldCover, newCover *string) {
	if oldCover == nil || *oldCover == "" {
		return
	}
	if newCover != nil && *newCover == *oldCover {
		return // unchanged
	}
	if err := uploads.DeleteImageByURL(uploads.Dir(), *oldCover); err != nil {
		log.Printf("updateGame: replaced cover cleanup failed: %v", err)
	}
}

// setExchangeRate upserts the single USD→Toman rate row. Audited.
func setExchangeRate(ctx context.Context, db *pgxpool.Pool, adminID string, rate int) error {
	if rate <= 0 {
		return ErrInvalidInput
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("setExchangeRate begin: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		INSERT INTO exchange_rate (id, usd_to_toman, updated_at) VALUES (1, $1, NOW())
		ON CONFLICT (id) DO UPDATE SET usd_to_toman = $1, updated_at = NOW()
	`, rate); err != nil {
		return fmt.Errorf("setExchangeRate upsert: %w", err)
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:  adminID,
		Action:   audit.ActionExchangeRate,
		Metadata: map[string]any{"usd_to_toman": rate},
	}); err != nil {
		return fmt.Errorf("setExchangeRate: %w", err)
	}
	return tx.Commit(ctx)
}
