package games

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/audit"
	"github.com/soltanmohammdi/z-games/internal/shared/pricing"
	"github.com/soltanmohammdi/z-games/internal/shared/release"
)

var (
	ErrGameNotFound = errors.New("GAME_NOT_FOUND")
	ErrInvalidInput = errors.New("INVALID_INPUT")
)

// setGamePreorder updates a game's release lifecycle. The status (released or
// pre_order) is always set; the expected release date is only touched when
// updateDate is true (then releaseDate may be nil to clear it). This makes a pure
// status flip a non-destructive "pause" — toggling pre_order → released → pre_order
// keeps the original release date, so the countdown and auto-close survive intact.
// Audited. Returns ErrGameNotFound if the game doesn't exist, ErrInvalidInput on a
// bad status.
func setGamePreorder(ctx context.Context, db *pgxpool.Pool, adminID, gameID, status string, updateDate bool, releaseDate *time.Time) error {
	if status != release.StatusReleased && status != release.StatusPreOrder {
		return ErrInvalidInput
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("setGamePreorder begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var name string
	if updateDate {
		err = tx.QueryRow(ctx,
			"UPDATE games SET release_status = $1, release_date = $2, updated_at = NOW() WHERE id = $3 RETURNING name",
			status, releaseDate, gameID).Scan(&name)
	} else {
		// Leave release_date exactly as-is — this is the pause/resume path.
		err = tx.QueryRow(ctx,
			"UPDATE games SET release_status = $1, updated_at = NOW() WHERE id = $2 RETURNING name",
			status, gameID).Scan(&name)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrGameNotFound
	}
	if err != nil {
		return fmt.Errorf("setGamePreorder update: %w", err)
	}

	meta := map[string]any{"name": name, "release_status": status, "date_updated": updateDate}
	if updateDate {
		meta["release_date"] = releaseDate
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionGamePreorder,
		TargetType: "game",
		TargetID:   gameID,
		Metadata:   meta,
	}); err != nil {
		return fmt.Errorf("setGamePreorder: %w", err)
	}
	return tx.Commit(ctx)
}

// setGameAlert sets or clears the free-form admin notice on a game. An empty
// message clears the alert (both fields NULL); otherwise variant must be a valid
// value. Audited. Returns ErrGameNotFound / ErrInvalidInput.
func setGameAlert(ctx context.Context, db *pgxpool.Pool, adminID, gameID, message, variant string) error {
	message = strings.TrimSpace(message)

	var msgArg, variantArg any
	if message == "" {
		msgArg, variantArg = nil, nil
	} else {
		if variant == "" {
			variant = "info"
		}
		if variant != "info" && variant != "warning" {
			return ErrInvalidInput
		}
		msgArg, variantArg = message, variant
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("setGameAlert begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var name string
	err = tx.QueryRow(ctx,
		"UPDATE games SET alert_message = $1, alert_variant = $2, updated_at = NOW() WHERE id = $3 RETURNING name",
		msgArg, variantArg, gameID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrGameNotFound
	}
	if err != nil {
		return fmt.Errorf("setGameAlert update: %w", err)
	}

	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionGameAlert,
		TargetType: "game",
		TargetID:   gameID,
		Metadata:   map[string]any{"name": name, "cleared": message == "", "variant": variant},
	}); err != nil {
		return fmt.Errorf("setGameAlert: %w", err)
	}
	return tx.Commit(ctx)
}

// setGameDiscount starts or stops a game's time-boxed percentage discount.
// percent in 1..99 with days > 0 opens a discount window [now, now+days); percent
// of 0 (or below) clears it immediately — this is the "stop before the deadline"
// path. Audited. Returns ErrGameNotFound / ErrInvalidInput.
func setGameDiscount(ctx context.Context, db *pgxpool.Pool, adminID, gameID string, percent, days int) error {
	clear := percent <= 0
	if !clear {
		if percent > 99 || days <= 0 {
			return ErrInvalidInput
		}
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("setGameDiscount begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var (
		name             string
		pct              *int
		startsAt, endsAt *time.Time
	)
	if !clear {
		now := time.Now().UTC()
		end := now.Add(time.Duration(days) * 24 * time.Hour)
		p := percent
		pct, startsAt, endsAt = &p, &now, &end
	}

	err = tx.QueryRow(ctx, `
		UPDATE games SET discount_pct = $1, discount_starts_at = $2, discount_ends_at = $3, updated_at = NOW()
		WHERE id = $4 RETURNING name
	`, pct, startsAt, endsAt, gameID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrGameNotFound
	}
	if err != nil {
		return fmt.Errorf("setGameDiscount update: %w", err)
	}

	meta := map[string]any{"name": name, "cleared": clear}
	if !clear {
		meta["percent"] = percent
		meta["days"] = days
		meta["ends_at"] = endsAt
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionGameDiscount,
		TargetType: "game",
		TargetID:   gameID,
		Metadata:   meta,
	}); err != nil {
		return fmt.Errorf("setGameDiscount: %w", err)
	}
	return tx.Commit(ctx)
}

// setGameReturnFee starts or stops a game's time-boxed reduced return fee. percent
// in 0..99 with days > 0 opens a window [now, now+days) during which returns of
// this game are charged that fee instead of the default 25% (a 0 fee = free return
// promo). days <= 0 clears the window. Audited. Returns ErrGameNotFound /
// ErrInvalidInput.
func setGameReturnFee(ctx context.Context, db *pgxpool.Pool, adminID, gameID string, percent, days int) error {
	clear := days <= 0
	if !clear {
		if percent < 0 || percent > 99 {
			return ErrInvalidInput
		}
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("setGameReturnFee begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var (
		name             string
		pct              *int
		startsAt, endsAt *time.Time
	)
	if !clear {
		now := time.Now().UTC()
		end := now.Add(time.Duration(days) * 24 * time.Hour)
		p := percent
		pct, startsAt, endsAt = &p, &now, &end
	}

	err = tx.QueryRow(ctx, `
		UPDATE games SET return_fee_pct = $1, return_fee_starts_at = $2, return_fee_ends_at = $3, updated_at = NOW()
		WHERE id = $4 RETURNING name
	`, pct, startsAt, endsAt, gameID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrGameNotFound
	}
	if err != nil {
		return fmt.Errorf("setGameReturnFee update: %w", err)
	}

	meta := map[string]any{"name": name, "cleared": clear}
	if !clear {
		meta["percent"] = percent
		meta["days"] = days
		meta["ends_at"] = endsAt
	}
	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionGameReturnFee,
		TargetType: "game",
		TargetID:   gameID,
		Metadata:   meta,
	}); err != nil {
		return fmt.Errorf("setGameReturnFee: %w", err)
	}
	return tx.Commit(ctx)
}

type gamePriceRow struct {
	ID         string  `json:"id"`
	Platform   string  `json:"platform"`
	Zarfiat    string  `json:"zarfiat"`
	PriceUSD   *string `json:"price_usd"`
	PriceToman *int    `json:"price_toman"`
	Slots      *int    `json:"slots"`
}

type gameRow struct {
	ID                  string         `json:"id"`
	Slug                string         `json:"slug"`
	Name                string         `json:"name"`
	CoverImage          *string        `json:"cover_image"`
	DescriptionMarkdown string         `json:"description_markdown"`
	SEOTitle            *string        `json:"seo_title"`
	SEODescription      *string        `json:"seo_description"`
	PriceMode           string         `json:"price_mode"`
	Prices              []gamePriceRow `json:"prices"`
	Active              bool           `json:"active"`
	Links               []gameLinkRow  `json:"links"`
	// Consoles the game is sold on (ps5, xbox_series, …), ordered for display.
	// Replaces the old single `platform` enum; availability is the set of consoles
	// here, and every price/base price must target one of them.
	Consoles []string `json:"consoles"`
	// Merchandising. Featured is a manual editorial flag; Tags double as genres.
	// ViewCount is incremented on each public detail view.
	Featured  bool     `json:"featured"`
	Tags      []string `json:"tags"`
	ViewCount int      `json:"view_count"`
	// Pre-order lifecycle. ReleaseStatus/ReleaseDate are the stored fields; Phase
	// and Purchasable are derived (see internal/shared/release) so the frontend
	// never re-implements the date math.
	ReleaseStatus string     `json:"release_status"`
	ReleaseDate   *time.Time `json:"release_date"`
	Phase         string     `json:"phase"`
	Purchasable   bool       `json:"purchasable"`
	// Optional free-form admin notice shown on the game page.
	AlertMessage *string `json:"alert_message"`
	AlertVariant *string `json:"alert_variant"`
	// Dynamic pricing inputs (for the admin form): one base USD price per console
	// and an optional per-game margin override. Prices above are derived from these.
	BasePrices      []gameBasePriceRow `json:"base_prices"`
	ProfitMarginPct *int               `json:"profit_margin_pct"`
	// Time-boxed percentage discount. The stored fields are all-or-nothing; Discount
	// is the derived "active right now" view the storefront applies to prices.
	DiscountPct      *int       `json:"discount_pct"`
	DiscountStartsAt *time.Time `json:"discount_starts_at"`
	DiscountEndsAt   *time.Time `json:"discount_ends_at"`
	Discount         *int       `json:"discount"`
	// Returnable is the admin's per-game buy-back switch. ReturnFee* is an optional
	// time-boxed reduced return fee (like the discount window); ReturnFee is the
	// derived "fee in effect right now" the frontend can show.
	Returnable        bool       `json:"returnable"`
	ReturnFeePct      *int       `json:"return_fee_pct"`
	ReturnFeeStartsAt *time.Time `json:"return_fee_starts_at"`
	ReturnFeeEndsAt   *time.Time `json:"return_fee_ends_at"`
	ReturnFee         *int       `json:"return_fee"`
	// TrendingScore is derived from recent sales + views (see attachTrending); it is
	// always present so the frontend can rank without re-deriving.
	TrendingScore float64   `json:"trending_score"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type gameBasePriceRow struct {
	Platform string `json:"platform"`
	BaseUSD  string `json:"base_usd"`
}

// derivePhase fills the computed Phase/Purchasable and Discount fields from the
// stored release status, date, and discount window. Call after scanning rows.
func (g *gameRow) derivePhase(now time.Time) {
	g.Phase = release.Phase(g.ReleaseStatus, g.ReleaseDate, now)
	g.Purchasable = release.Purchasable(g.Phase)
	g.Discount = activeDiscount(g.DiscountPct, g.DiscountStartsAt, g.DiscountEndsAt, now)
	// Surface the fee a return would incur right now (the override during its window,
	// else the default) so the storefront can advertise a return promo.
	fee := pricing.EffectiveReturnFeePct(g.ReturnFeePct, g.ReturnFeeStartsAt, g.ReturnFeeEndsAt, now)
	g.ReturnFee = &fee
}

// activeDiscount returns the discount percent if one is currently in effect,
// otherwise nil (for the JSON `discount` field). The window math lives in the
// pricing package so the storefront display and the checkout charge never diverge.
func activeDiscount(pct *int, startsAt, endsAt *time.Time, now time.Time) *int {
	d := pricing.ActiveDiscountPct(pct, startsAt, endsAt, now)
	if d == 0 {
		return nil
	}
	return &d
}

type gameLinkRow struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type listFilter struct {
	platform       string // a console code (ps5, xbox_series, …) the game must list on
	zarfiat        string // a capacity code — games that have any price entry for it
	search         string
	onlyActive     bool
	onlyFeatured   bool
	onlyReturnable bool
}

// gameColumns is the shared SELECT list for a game row, kept in one place so the
// list and single-game reads (and their Scan order in scanGameRow) never drift.
const gameColumns = `id, slug, name, cover_image, description_markdown, seo_title, seo_description, price_mode::text, active,
	release_status, release_date, alert_message, alert_variant, profit_margin_pct,
	featured, view_count, tags, discount_pct, discount_starts_at, discount_ends_at,
	returnable, return_fee_pct, return_fee_starts_at, return_fee_ends_at,
	created_at, updated_at`

// scanGameRow scans one row selected with gameColumns (in that exact order).
func scanGameRow(row pgx.Row, g *gameRow) error {
	return row.Scan(
		&g.ID, &g.Slug, &g.Name, &g.CoverImage, &g.DescriptionMarkdown, &g.SEOTitle, &g.SEODescription, &g.PriceMode, &g.Active,
		&g.ReleaseStatus, &g.ReleaseDate, &g.AlertMessage, &g.AlertVariant, &g.ProfitMarginPct,
		&g.Featured, &g.ViewCount, &g.Tags, &g.DiscountPct, &g.DiscountStartsAt, &g.DiscountEndsAt,
		&g.Returnable, &g.ReturnFeePct, &g.ReturnFeeStartsAt, &g.ReturnFeeEndsAt,
		&g.CreatedAt, &g.UpdatedAt,
	)
}

func listGames(ctx context.Context, db *pgxpool.Pool, filter listFilter, orderBy string, limit, offset int) ([]gameRow, int, error) {
	var conds []string
	var args []any
	n := 1

	if filter.onlyActive {
		conds = append(conds, "active = true")
	}
	if filter.onlyFeatured {
		conds = append(conds, "featured = true")
	}
	if filter.onlyReturnable {
		conds = append(conds, "returnable = true AND EXISTS (SELECT 1 FROM game_consoles WHERE game_id = games.id AND console_code IN ('ps4', 'ps5'))")
	}
	platformParam := 0
	if filter.platform != "" {
		platformParam = n
		conds = append(conds, fmt.Sprintf(
			"EXISTS (SELECT 1 FROM game_consoles WHERE game_id = games.id AND console_code = $%d)", n,
		))
		args = append(args, filter.platform)
		n++
	}
	if filter.zarfiat != "" {
		conds = append(conds, sellableCapacityCondition(platformParam, n))
		args = append(args, filter.zarfiat)
		n++
	}
	if filter.search != "" {
		conds = append(conds, fmt.Sprintf("name ILIKE $%d", n))
		args = append(args, "%"+filter.search+"%")
		n++
	}

	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	var total int
	if err := db.QueryRow(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM games %s", where),
		args...,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count games: %w", err)
	}

	rows, err := db.Query(ctx, fmt.Sprintf(`
		SELECT %s
		FROM games %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, gameColumns, where, orderBy, n, n+1), append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list games: %w", err)
	}
	defer rows.Close()

	now := time.Now().UTC()
	result := make([]gameRow, 0)
	for rows.Next() {
		var g gameRow
		if err := scanGameRow(rows, &g); err != nil {
			return nil, 0, fmt.Errorf("scan game: %w", err)
		}
		g.Prices = []gamePriceRow{}
		g.Links = []gameLinkRow{}
		g.Consoles = []string{}
		g.derivePhase(now)
		result = append(result, g)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	if err := attachConsoles(ctx, db, result); err != nil {
		return nil, 0, err
	}
	if err := attachPrices(ctx, db, result); err != nil {
		return nil, 0, err
	}
	if err := attachLinks(ctx, db, result); err != nil {
		return nil, 0, err
	}
	if err := attachTrending(ctx, db, result, now); err != nil {
		return nil, 0, err
	}
	return result, total, nil
}

// sellableCapacityCondition matches the actual console+capacity pair a customer
// can buy across both pricing models. Fixed games store that pair in game_prices;
// dynamic games store a base price per console and either an explicit capacity
// allow-list or an empty list meaning every catalog capacity. When a console is
// selected, both branches constrain the capacity to that same console—separate
// EXISTS clauses would incorrectly let PS4 + Xbox Home match one game.
func sellableCapacityCondition(platformParam, capacityParam int) string {
	fixedPlatform := ""
	dynamicPlatform := ""
	if platformParam > 0 {
		fixedPlatform = fmt.Sprintf(" AND gp.platform = $%d", platformParam)
		dynamicPlatform = fmt.Sprintf(" AND gbp.platform = $%d", platformParam)
	}

	return fmt.Sprintf(`(
		(games.price_mode = 'fixed' AND EXISTS (
			SELECT 1 FROM game_prices gp
			WHERE gp.game_id = games.id
			  AND gp.zarfiat = $%d%s
		))
		OR
		(games.price_mode = 'dynamic' AND EXISTS (
			SELECT 1
			FROM game_base_prices gbp
			JOIN capacities cp
			  ON cp.console_code = gbp.platform
			 AND cp.code = $%d
			WHERE gbp.game_id = games.id%s
			  AND (cardinality(gbp.capacities) = 0 OR $%d = ANY(gbp.capacities))
		))
	)`, capacityParam, fixedPlatform, capacityParam, dynamicPlatform, capacityParam)
}

// getGameByID looks up a single game by its id. See getGame for the lookup that
// also accepts a slug.
func getGameByID(ctx context.Context, db *pgxpool.Pool, id string, onlyActive bool) (*gameRow, error) {
	return getGame(ctx, db, "id = $1", id, onlyActive)
}

// getGame resolves a single game by an identifier that may be either its id or its
// slug. Slugs and ids never overlap in practice (slugs contain hyphens / words,
// ids are 24-char base36), so matching on either is unambiguous and lets URLs use
// slugs while the cart keeps referencing games by id.
func getGameByIDOrSlug(ctx context.Context, db *pgxpool.Pool, idOrSlug string, onlyActive bool) (*gameRow, error) {
	return getGame(ctx, db, "(id = $1 OR slug = $1)", idOrSlug, onlyActive)
}

func getGame(ctx context.Context, db *pgxpool.Pool, cond, arg string, onlyActive bool) (*gameRow, error) {
	if onlyActive {
		cond += " AND active = true"
	}
	var g gameRow
	err := scanGameRow(db.QueryRow(ctx, fmt.Sprintf(`
		SELECT %s FROM games WHERE %s LIMIT 1
	`, gameColumns, cond), arg), &g)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get game: %w", err)
	}

	now := time.Now().UTC()
	g.Prices = []gamePriceRow{}
	g.Links = []gameLinkRow{}
	g.Consoles = []string{}
	g.derivePhase(now)

	games := []gameRow{g}
	if err := attachConsoles(ctx, db, games); err != nil {
		return nil, err
	}
	if err := attachPrices(ctx, db, games); err != nil {
		return nil, err
	}
	if err := attachLinks(ctx, db, games); err != nil {
		return nil, err
	}
	if err := attachTrending(ctx, db, games, now); err != nil {
		return nil, err
	}
	return &games[0], nil
}

// listRelatedGames ranks active alternatives by shared tags and consoles, then
// uses editorial prominence and recency as deterministic fallbacks. The result is
// hydrated exactly like the main catalog so pricing and availability stay current.
func listRelatedGames(ctx context.Context, db *pgxpool.Pool, source gameRow, limit int) ([]gameRow, error) {
	rows, err := db.Query(ctx, fmt.Sprintf(`
		SELECT %s
		FROM games
		WHERE active = true AND id <> $1
		ORDER BY
			cardinality(ARRAY(SELECT unnest(tags) INTERSECT SELECT unnest($2::text[]))) DESC,
			(SELECT COUNT(*) FROM game_consoles gc
			 WHERE gc.game_id = games.id AND gc.console_code = ANY($3::text[])) DESC,
			featured DESC,
			updated_at DESC,
			id
		LIMIT $4
	`, gameColumns), source.ID, source.Tags, source.Consoles, limit)
	if err != nil {
		return nil, fmt.Errorf("query related games: %w", err)
	}
	defer rows.Close()

	now := time.Now().UTC()
	result := make([]gameRow, 0, limit)
	for rows.Next() {
		var g gameRow
		if err := scanGameRow(rows, &g); err != nil {
			return nil, fmt.Errorf("scan related game: %w", err)
		}
		g.Prices = []gamePriceRow{}
		g.Links = []gameLinkRow{}
		g.Consoles = []string{}
		g.derivePhase(now)
		result = append(result, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("related games rows: %w", err)
	}
	if err := attachConsoles(ctx, db, result); err != nil {
		return nil, err
	}
	if err := attachPrices(ctx, db, result); err != nil {
		return nil, err
	}
	if err := attachLinks(ctx, db, result); err != nil {
		return nil, err
	}
	if err := attachTrending(ctx, db, result, now); err != nil {
		return nil, err
	}
	return result, nil
}

// attachPrices fills each game's Prices (and BasePrices for dynamic games).
// Fixed games read their stored per-tier Toman prices; dynamic games derive a
// per-tier USD price from their base price + margin + the global split, so the
// response keeps the same per-tier `price_usd` shape the storefront understands.
func attachPrices(ctx context.Context, db *pgxpool.Pool, games []gameRow) error {
	if len(games) == 0 {
		return nil
	}

	catalog, err := pricing.LoadCatalog(ctx, db)
	if err != nil {
		return err
	}

	ids := make([]string, len(games))
	idx := make(map[string]int, len(games))
	for i := range games {
		ids[i] = games[i].ID
		idx[games[i].ID] = i
		games[i].Prices = []gamePriceRow{}
		games[i].BasePrices = []gameBasePriceRow{}
	}

	// Fixed games: stored per-tier Toman prices.
	rows, err := db.Query(ctx, `
		SELECT gp.id, gp.game_id, gp.platform, gp.zarfiat, gp.price_usd::text, gp.price_toman, gp.slots
		FROM game_prices gp JOIN games g ON g.id = gp.game_id
		WHERE gp.game_id = ANY($1) AND g.price_mode = 'fixed'
		ORDER BY gp.platform, gp.zarfiat
	`, ids)
	if err != nil {
		return fmt.Errorf("get game prices: %w", err)
	}
	for rows.Next() {
		var p gamePriceRow
		var gameID string
		if err := rows.Scan(&p.ID, &gameID, &p.Platform, &p.Zarfiat, &p.PriceUSD, &p.PriceToman, &p.Slots); err != nil {
			rows.Close()
			return fmt.Errorf("scan price: %w", err)
		}
		if i, ok := idx[gameID]; ok {
			games[i].Prices = append(games[i].Prices, p)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return fmt.Errorf("prices rows error: %w", err)
	}

	// Dynamic games: one base USD price per console, tiers derived from it. Only the
	// capacities listed in gbp.capacities are sold (empty list = all of them).
	brows, err := db.Query(ctx, `
		SELECT gbp.game_id, gbp.platform, gbp.base_usd::float8, gbp.capacities
		FROM game_base_prices gbp JOIN games g ON g.id = gbp.game_id
		WHERE gbp.game_id = ANY($1) AND g.price_mode = 'dynamic'
		ORDER BY gbp.platform
	`, ids)
	if err != nil {
		return fmt.Errorf("get base prices: %w", err)
	}
	defer brows.Close()
	for brows.Next() {
		var gameID, platform string
		var baseUSD float64
		var capacities []string
		if err := brows.Scan(&gameID, &platform, &baseUSD, &capacities); err != nil {
			return fmt.Errorf("scan base price: %w", err)
		}
		i, ok := idx[gameID]
		if !ok {
			continue
		}
		games[i].BasePrices = append(games[i].BasePrices, gameBasePriceRow{
			Platform: platform,
			BaseUSD:  strconv.FormatFloat(baseUSD, 'f', -1, 64),
		})
		cn, ok := catalog.Console(platform)
		if !ok {
			continue
		}
		// Empty list means every capacity is sold (back-compat).
		enabledAll := len(capacities) == 0
		enabled := make(map[string]bool, len(capacities))
		for _, code := range capacities {
			enabled[code] = true
		}
		margin := cn.Margin(games[i].ProfitMarginPct)
		for _, cp := range cn.Capacities {
			if !enabledAll && !enabled[cp.Code] {
				continue
			}
			usd := strconv.FormatFloat(pricing.TierUSD(baseUSD, margin, cp.SplitPct), 'f', 2, 64)
			usdCopy := usd
			games[i].Prices = append(games[i].Prices, gamePriceRow{
				Platform: platform,
				Zarfiat:  cp.Code,
				PriceUSD: &usdCopy,
			})
		}
	}
	return brows.Err()
}

// pricingResponse is the public "exchange_rate" object: the USD→Toman rate (null
// until set) plus the console/capacity catalog (labels + split/margin) the
// storefront and admin screens render from.
type pricingResponse struct {
	USDToToman *int              `json:"usd_to_toman"`
	Consoles   []pricing.Console `json:"consoles"`
}

func getPricingResponse(ctx context.Context, db *pgxpool.Pool) (pricingResponse, error) {
	rate, err := pricing.LoadRate(ctx, db)
	if err != nil {
		return pricingResponse{}, fmt.Errorf("get pricing response rate: %w", err)
	}
	catalog, err := pricing.LoadCatalog(ctx, db)
	if err != nil {
		return pricingResponse{}, fmt.Errorf("get pricing response catalog: %w", err)
	}
	// A valid rate is always > 0; 0 means "not set yet" → expose as null, matching
	// the previous behaviour when no exchange_rate row existed.
	var usd *int
	if rate > 0 {
		usd = &rate
	}
	return pricingResponse{USDToToman: usd, Consoles: catalog.Consoles}, nil
}

// attachConsoles fills each game's Consoles list from game_consoles, ordered by the
// console catalog's sort order so the storefront shows them consistently.
func attachConsoles(ctx context.Context, db *pgxpool.Pool, games []gameRow) error {
	if len(games) == 0 {
		return nil
	}

	ids := make([]string, len(games))
	idx := make(map[string]int, len(games))
	for i := range games {
		ids[i] = games[i].ID
		idx[games[i].ID] = i
		games[i].Consoles = []string{}
	}

	rows, err := db.Query(ctx, `
		SELECT gc.game_id, gc.console_code
		FROM game_consoles gc
		JOIN consoles c ON c.code = gc.console_code
		WHERE gc.game_id = ANY($1)
		ORDER BY c.sort_order, c.code
	`, ids)
	if err != nil {
		return fmt.Errorf("get game consoles: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var gameID, console string
		if err := rows.Scan(&gameID, &console); err != nil {
			return fmt.Errorf("scan game console: %w", err)
		}
		if i, ok := idx[gameID]; ok {
			games[i].Consoles = append(games[i].Consoles, console)
		}
	}
	return rows.Err()
}

func attachLinks(ctx context.Context, db *pgxpool.Pool, games []gameRow) error {
	if len(games) == 0 {
		return nil
	}

	ids := make([]string, len(games))
	for i, g := range games {
		ids[i] = g.ID
	}

	rows, err := db.Query(ctx,
		"SELECT id, game_id, url FROM game_links WHERE game_id = ANY($1)",
		ids,
	)
	if err != nil {
		return fmt.Errorf("get game links: %w", err)
	}
	defer rows.Close()

	linkMap := make(map[string][]gameLinkRow)
	for rows.Next() {
		var id, gameID, url string
		if err := rows.Scan(&id, &gameID, &url); err != nil {
			return fmt.Errorf("scan link: %w", err)
		}
		linkMap[gameID] = append(linkMap[gameID], gameLinkRow{ID: id, URL: url})
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("links rows error: %w", err)
	}

	for i := range games {
		if links := linkMap[games[i].ID]; links != nil {
			games[i].Links = links
		}
	}
	return nil
}

const (
	// trendingWindow is how far back paid orders count toward the trending score.
	trendingWindow = 14 * 24 * time.Hour
	// trendingViewWeight keeps all-time views a soft tiebreaker so they never
	// overwhelm recent sales — sales are the dominant signal.
	trendingViewWeight = 0.02
)

// attachTrending fills each game's TrendingScore: units sold over the recent
// window (the dominant signal) plus a small all-time view component. It is one
// grouped query over the whole batch, mirroring attachPrices/attachLinks.
func attachTrending(ctx context.Context, db *pgxpool.Pool, games []gameRow, now time.Time) error {
	if len(games) == 0 {
		return nil
	}

	ids := make([]string, len(games))
	for i := range games {
		ids[i] = games[i].ID
	}

	rows, err := db.Query(ctx, `
		SELECT oi.game_id, COALESCE(SUM(oi.quantity), 0)
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE oi.game_id = ANY($1)
		  AND o.status IN ('paid', 'fulfilled')
		  AND o.created_at >= $2
		GROUP BY oi.game_id
	`, ids, now.Add(-trendingWindow))
	if err != nil {
		return fmt.Errorf("get trending: %w", err)
	}
	defer rows.Close()

	recentUnits := make(map[string]int, len(games))
	for rows.Next() {
		var gameID string
		var units int
		if err := rows.Scan(&gameID, &units); err != nil {
			return fmt.Errorf("scan trending: %w", err)
		}
		recentUnits[gameID] = units
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("trending rows error: %w", err)
	}

	for i := range games {
		games[i].TrendingScore =
			float64(recentUnits[games[i].ID]) + trendingViewWeight*float64(games[i].ViewCount)
	}
	return nil
}

// bumpViewCount increments a game's all-time view counter, matching on id or slug.
// Best-effort: a missing game (no rows) is not an error.
func bumpViewCount(ctx context.Context, db *pgxpool.Pool, idOrSlug string) error {
	_, err := db.Exec(ctx,
		"UPDATE games SET view_count = view_count + 1 WHERE id = $1 OR slug = $1",
		idOrSlug)
	if err != nil {
		return fmt.Errorf("bump view count: %w", err)
	}
	return nil
}

// slugTaken reports whether slug already belongs to a game other than excludeID
// (pass "" when creating). Powers the admin live-uniqueness check; the unique
// index remains the authoritative guard at write time.
func slugTaken(ctx context.Context, db *pgxpool.Pool, slug, excludeID string) (bool, error) {
	var exists bool
	err := db.QueryRow(ctx,
		"SELECT EXISTS (SELECT 1 FROM games WHERE slug = $1 AND id <> $2)",
		slug, excludeID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("slug taken: %w", err)
	}
	return exists, nil
}
