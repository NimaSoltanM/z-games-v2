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
	"github.com/soltanmohammdi/z-games/internal/shared/pricing"
	"github.com/soltanmohammdi/z-games/internal/shared/release"
)

// ErrDuplicateLink is returned when a link URL is already attached to another
// game (game_links.url is globally unique).
var ErrDuplicateLink = errors.New("DUPLICATE_LINK")

// ErrDuplicateSlug is returned when a slug already belongs to another game
// (games.slug is globally unique).
var ErrDuplicateSlug = errors.New("DUPLICATE_SLUG")

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

// isSlugViolation reports whether err is the games.slug unique-index conflict, so
// it can be told apart from a link-URL conflict (both are 23505).
func isSlugViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "games_slug_key"
}

// resolveSlug returns the explicit slug, or a derived collision-resistant one when
// empty (defensive: the admin flow always sends a slug, validated upstream).
func resolveSlug(in normalizedGame) (string, error) {
	if in.Slug != "" {
		return in.Slug, nil
	}
	return fallbackSlug(in.Name)
}

// tagsOrEmpty coalesces a nil tag slice to an empty one so it satisfies the NOT
// NULL games.tags column (pgx encodes a nil slice as SQL NULL).
func tagsOrEmpty(tags []string) []string {
	if tags == nil {
		return []string{}
	}
	return tags
}

// insertChildren writes a game's prices and links inside an open transaction.
// Returns ErrDuplicateLink if a link URL collides with another game's.
func insertChildren(ctx context.Context, tx pgx.Tx, gameID string, in normalizedGame) error {
	if in.PriceMode == "dynamic" {
		for _, b := range in.BasePrices {
			if _, err := tx.Exec(ctx,
				"INSERT INTO game_base_prices (game_id, platform, base_usd) VALUES ($1, $2, $3)",
				gameID, b.Platform, b.BaseUSD); err != nil {
				return fmt.Errorf("insert base price: %w", err)
			}
		}
	} else {
		for _, p := range in.Prices {
			if _, err := tx.Exec(ctx, `
				INSERT INTO game_prices (game_id, platform, zarfiat, price_toman, slots)
				VALUES ($1, $2, $3, $4, $5)
			`, gameID, p.Platform, p.Zarfiat, p.PriceToman, p.Slots); err != nil {
				return fmt.Errorf("insert price: %w", err)
			}
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
	slug, err := resolveSlug(in)
	if err != nil {
		return "", fmt.Errorf("createGame slug: %w", err)
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("createGame begin: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		INSERT INTO games (id, slug, name, cover_image, platform, price_mode, active, featured, tags,
		                   release_status, release_date, alert_message, alert_variant, profit_margin_pct)
		VALUES ($1, $2, $3, $4, $5::platform, $6::price_mode, $7, $8, $9, $10, $11, $12, $13, $14)
	`, id, slug, in.Name, in.CoverImage, in.Platform, in.PriceMode, in.Active, in.Featured, tagsOrEmpty(in.Tags),
		releaseStatusOrDefault(in.ReleaseStatus), in.ReleaseDate, in.AlertMessage, in.AlertVariant,
		in.ProfitMarginPct); err != nil {
		if isSlugViolation(err) {
			return "", ErrDuplicateSlug
		}
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
		Metadata:   map[string]any{"name": in.Name, "active": in.Active, "prices": len(in.Prices), "links": len(in.Links)},
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
	slug, err := resolveSlug(in)
	if err != nil {
		return fmt.Errorf("updateGame slug: %w", err)
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("updateGame begin: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock the row and snapshot its current state so we can clean up a replaced
	// cover and record a field-level diff in the audit log.
	old, err := loadOldGameState(ctx, tx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrGameNotFound
	}
	if err != nil {
		return fmt.Errorf("updateGame load: %w", err)
	}
	oldCover := old.CoverImage

	oldFixed, oldBase, err := loadOldPrices(ctx, tx, id)
	if err != nil {
		return fmt.Errorf("updateGame load prices: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE games SET name = $2, cover_image = $3, platform = $4::platform,
		       price_mode = $5::price_mode, active = $6, release_status = $7,
		       release_date = $8, alert_message = $9, alert_variant = $10,
		       profit_margin_pct = $11, slug = $12, featured = $13, tags = $14, updated_at = NOW()
		WHERE id = $1
	`, id, in.Name, in.CoverImage, in.Platform, in.PriceMode, in.Active,
		releaseStatusOrDefault(in.ReleaseStatus), in.ReleaseDate, in.AlertMessage, in.AlertVariant,
		in.ProfitMarginPct, slug, in.Featured, tagsOrEmpty(in.Tags)); err != nil {
		if isSlugViolation(err) {
			return ErrDuplicateSlug
		}
		return fmt.Errorf("updateGame update: %w", err)
	}

	// Replace both price representations (the game may have switched modes).
	if _, err := tx.Exec(ctx, "DELETE FROM game_prices WHERE game_id = $1", id); err != nil {
		return fmt.Errorf("updateGame clear prices: %w", err)
	}
	if _, err := tx.Exec(ctx, "DELETE FROM game_base_prices WHERE game_id = $1", id); err != nil {
		return fmt.Errorf("updateGame clear base prices: %w", err)
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
		Metadata:   buildUpdateMetadata(old, in, oldFixed, oldBase),
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
	var name string
	err = tx.QueryRow(ctx, "SELECT name, cover_image FROM games WHERE id = $1", id).Scan(&name, &cover)
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
		Metadata:   map[string]any{"name": name},
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

var (
	ErrRateInvalid  = errors.New("RATE_INVALID")
	ErrSplitInvalid = errors.New("SPLIT_INVALID")
)

// setExchangeRate upserts the global pricing config singleton: the USD→Toman rate,
// the capacity split, and the default margin. The split must sum to 100. Audited.
func setExchangeRate(ctx context.Context, db *pgxpool.Pool, adminID string, rate int, cfg pricing.Config) error {
	if rate <= 0 {
		return ErrRateInvalid
	}
	if cfg.Z1Pct < 0 || cfg.Z2Pct < 0 || cfg.Z3Pct < 0 || cfg.Z1Pct+cfg.Z2Pct+cfg.Z3Pct != 100 {
		return ErrSplitInvalid
	}
	if cfg.DefaultMarginPct < 0 {
		return ErrInvalidInput
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("setExchangeRate begin: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		INSERT INTO exchange_rate (id, usd_to_toman, z1_pct, z2_pct, z3_pct, default_margin_pct, updated_at)
		VALUES (1, $1, $2, $3, $4, $5, NOW())
		ON CONFLICT (id) DO UPDATE SET usd_to_toman = $1, z1_pct = $2, z2_pct = $3,
		       z3_pct = $4, default_margin_pct = $5, updated_at = NOW()
	`, rate, cfg.Z1Pct, cfg.Z2Pct, cfg.Z3Pct, cfg.DefaultMarginPct); err != nil {
		return fmt.Errorf("setExchangeRate upsert: %w", err)
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:  adminID,
		Action:   audit.ActionExchangeRate,
		Metadata: map[string]any{"usd_to_toman": rate, "split": []int{cfg.Z1Pct, cfg.Z2Pct, cfg.Z3Pct}, "default_margin_pct": cfg.DefaultMarginPct},
	}); err != nil {
		return fmt.Errorf("setExchangeRate: %w", err)
	}
	return tx.Commit(ctx)
}
