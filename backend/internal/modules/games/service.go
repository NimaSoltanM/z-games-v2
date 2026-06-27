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

type gamePriceRow struct {
	ID         string  `json:"id"`
	Platform   string  `json:"platform"`
	Zarfiat    string  `json:"zarfiat"`
	PriceUSD   *string `json:"price_usd"`
	PriceToman *int    `json:"price_toman"`
	Slots      *int    `json:"slots"`
}

type gameRow struct {
	ID         string         `json:"id"`
	Slug       string         `json:"slug"`
	Name       string         `json:"name"`
	CoverImage *string        `json:"cover_image"`
	Platform   string         `json:"platform"`
	PriceMode  string         `json:"price_mode"`
	Prices     []gamePriceRow `json:"prices"`
	Active     bool           `json:"active"`
	Links      []gameLinkRow  `json:"links"`
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

type exchangeRateRow struct {
	ID         int       `json:"id"`
	USDToToman int       `json:"usd_to_toman"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type listFilter struct {
	platform     string
	zarfiat      string // "z1", "z2", or "z3" — games that have any price entry for this zarfiat
	search       string
	onlyActive   bool
	onlyFeatured bool
}

// gameColumns is the shared SELECT list for a game row, kept in one place so the
// list and single-game reads (and their Scan order in scanGameRow) never drift.
const gameColumns = `id, slug, name, cover_image, platform::text, price_mode::text, active,
	release_status, release_date, alert_message, alert_variant, profit_margin_pct,
	featured, view_count, tags, discount_pct, discount_starts_at, discount_ends_at,
	created_at, updated_at`

// scanGameRow scans one row selected with gameColumns (in that exact order).
func scanGameRow(row pgx.Row, g *gameRow) error {
	return row.Scan(
		&g.ID, &g.Slug, &g.Name, &g.CoverImage, &g.Platform, &g.PriceMode, &g.Active,
		&g.ReleaseStatus, &g.ReleaseDate, &g.AlertMessage, &g.AlertVariant, &g.ProfitMarginPct,
		&g.Featured, &g.ViewCount, &g.Tags, &g.DiscountPct, &g.DiscountStartsAt, &g.DiscountEndsAt,
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
	if filter.platform != "" {
		conds = append(conds, fmt.Sprintf("platform::text = $%d", n))
		args = append(args, filter.platform)
		n++
	}
	if filter.zarfiat != "" {
		conds = append(conds, fmt.Sprintf(
			"EXISTS (SELECT 1 FROM game_prices WHERE game_id = games.id AND zarfiat = $%d)", n,
		))
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
		g.derivePhase(now)
		result = append(result, g)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
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
	g.derivePhase(now)

	games := []gameRow{g}
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

// attachPrices fills each game's Prices (and BasePrices for dynamic games).
// Fixed games read their stored per-tier Toman prices; dynamic games derive a
// per-tier USD price from their base price + margin + the global split, so the
// response keeps the same per-tier `price_usd` shape the storefront understands.
func attachPrices(ctx context.Context, db *pgxpool.Pool, games []gameRow) error {
	if len(games) == 0 {
		return nil
	}

	cfg, err := getPricingConfig(ctx, db)
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

	// Dynamic games: one base USD price per console, tiers derived from it.
	brows, err := db.Query(ctx, `
		SELECT gbp.game_id, gbp.platform, gbp.base_usd::float8
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
		if err := brows.Scan(&gameID, &platform, &baseUSD); err != nil {
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
		margin := cfg.Margin(games[i].ProfitMarginPct)
		for _, z := range pricing.Zarfiats {
			usd := strconv.FormatFloat(cfg.TierUSD(baseUSD, margin, z), 'f', 2, 64)
			usdCopy := usd
			games[i].Prices = append(games[i].Prices, gamePriceRow{
				Platform: platform,
				Zarfiat:  z,
				PriceUSD: &usdCopy,
			})
		}
	}
	return brows.Err()
}

// getPricingConfig loads the global capacity split + default margin, falling back
// to defaults before any config has been saved.
func getPricingConfig(ctx context.Context, db *pgxpool.Pool) (pricing.Config, error) {
	var c pricing.Config
	err := db.QueryRow(ctx,
		"SELECT z1_pct, z2_pct, z3_pct, default_margin_pct FROM exchange_rate WHERE id = 1",
	).Scan(&c.Z1Pct, &c.Z2Pct, &c.Z3Pct, &c.DefaultMarginPct)
	if errors.Is(err, pgx.ErrNoRows) {
		return pricing.DefaultConfig, nil
	}
	if err != nil {
		return pricing.Config{}, fmt.Errorf("get pricing config: %w", err)
	}
	return c, nil
}

// pricingResponse is the public "exchange_rate" object: the rate (null until set)
// plus the global pricing config.
type pricingResponse struct {
	USDToToman *int `json:"usd_to_toman"`
	pricing.Config
}

func getPricingResponse(ctx context.Context, db *pgxpool.Pool) (pricingResponse, error) {
	var rate int
	var c pricing.Config
	err := db.QueryRow(ctx,
		"SELECT usd_to_toman, z1_pct, z2_pct, z3_pct, default_margin_pct FROM exchange_rate WHERE id = 1",
	).Scan(&rate, &c.Z1Pct, &c.Z2Pct, &c.Z3Pct, &c.DefaultMarginPct)
	if errors.Is(err, pgx.ErrNoRows) {
		return pricingResponse{Config: pricing.DefaultConfig}, nil
	}
	if err != nil {
		return pricingResponse{}, fmt.Errorf("get pricing response: %w", err)
	}
	return pricingResponse{USDToToman: &rate, Config: c}, nil
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
