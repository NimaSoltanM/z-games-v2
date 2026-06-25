package games

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/audit"
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

	var tag pgconn.CommandTag
	if updateDate {
		tag, err = tx.Exec(ctx,
			"UPDATE games SET release_status = $1, release_date = $2, updated_at = NOW() WHERE id = $3",
			status, releaseDate, gameID)
	} else {
		// Leave release_date exactly as-is — this is the pause/resume path.
		tag, err = tx.Exec(ctx,
			"UPDATE games SET release_status = $1, updated_at = NOW() WHERE id = $2",
			status, gameID)
	}
	if err != nil {
		return fmt.Errorf("setGamePreorder update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrGameNotFound
	}

	meta := map[string]any{"release_status": status, "date_updated": updateDate}
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

	tag, err := tx.Exec(ctx,
		"UPDATE games SET alert_message = $1, alert_variant = $2, updated_at = NOW() WHERE id = $3",
		msgArg, variantArg, gameID)
	if err != nil {
		return fmt.Errorf("setGameAlert update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrGameNotFound
	}

	if err := audit.Record(ctx, tx, audit.Entry{
		AdminID:    adminID,
		Action:     audit.ActionGameAlert,
		TargetType: "game",
		TargetID:   gameID,
		Metadata:   map[string]any{"cleared": message == "", "variant": variant},
	}); err != nil {
		return fmt.Errorf("setGameAlert: %w", err)
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
	Name       string         `json:"name"`
	CoverImage *string        `json:"cover_image"`
	Platform   string         `json:"platform"`
	PriceMode  string         `json:"price_mode"`
	Prices     []gamePriceRow `json:"prices"`
	Active     bool           `json:"active"`
	Links      []gameLinkRow  `json:"links"`
	// Pre-order lifecycle. ReleaseStatus/ReleaseDate are the stored fields; Phase
	// and Purchasable are derived (see internal/shared/release) so the frontend
	// never re-implements the date math.
	ReleaseStatus string     `json:"release_status"`
	ReleaseDate   *time.Time `json:"release_date"`
	Phase         string     `json:"phase"`
	Purchasable   bool       `json:"purchasable"`
	// Optional free-form admin notice shown on the game page.
	AlertMessage *string   `json:"alert_message"`
	AlertVariant *string   `json:"alert_variant"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// derivePhase fills the computed Phase/Purchasable fields from the stored release
// status and date. Call after scanning rows from the DB.
func (g *gameRow) derivePhase(now time.Time) {
	g.Phase = release.Phase(g.ReleaseStatus, g.ReleaseDate, now)
	g.Purchasable = release.Purchasable(g.Phase)
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
	platform   string
	zarfiat    string // "z1", "z2", or "z3" — games that have any price entry for this zarfiat
	search     string
	onlyActive bool
}

func listGames(ctx context.Context, db *pgxpool.Pool, filter listFilter, orderBy string, limit, offset int) ([]gameRow, int, error) {
	var conds []string
	var args []any
	n := 1

	if filter.onlyActive {
		conds = append(conds, "active = true")
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
		SELECT id, name, cover_image, platform::text, price_mode::text, active,
		       release_status, release_date, alert_message, alert_variant, created_at, updated_at
		FROM games %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, where, orderBy, n, n+1), append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list games: %w", err)
	}
	defer rows.Close()

	now := time.Now().UTC()
	result := make([]gameRow, 0)
	for rows.Next() {
		var g gameRow
		if err := rows.Scan(
			&g.ID, &g.Name, &g.CoverImage, &g.Platform, &g.PriceMode, &g.Active,
			&g.ReleaseStatus, &g.ReleaseDate, &g.AlertMessage, &g.AlertVariant,
			&g.CreatedAt, &g.UpdatedAt,
		); err != nil {
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
	return result, total, nil
}

func getGameByID(ctx context.Context, db *pgxpool.Pool, id string, onlyActive bool) (*gameRow, error) {
	cond := "id = $1"
	if onlyActive {
		cond += " AND active = true"
	}
	var g gameRow
	err := db.QueryRow(ctx, fmt.Sprintf(`
		SELECT id, name, cover_image, platform::text, price_mode::text, active,
		       release_status, release_date, alert_message, alert_variant, created_at, updated_at
		FROM games WHERE %s LIMIT 1
	`, cond), id).Scan(
		&g.ID, &g.Name, &g.CoverImage, &g.Platform, &g.PriceMode, &g.Active,
		&g.ReleaseStatus, &g.ReleaseDate, &g.AlertMessage, &g.AlertVariant,
		&g.CreatedAt, &g.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get game: %w", err)
	}

	g.Prices = []gamePriceRow{}
	g.Links = []gameLinkRow{}
	g.derivePhase(time.Now().UTC())

	games := []gameRow{g}
	if err := attachPrices(ctx, db, games); err != nil {
		return nil, err
	}
	if err := attachLinks(ctx, db, games); err != nil {
		return nil, err
	}
	return &games[0], nil
}

func attachPrices(ctx context.Context, db *pgxpool.Pool, games []gameRow) error {
	if len(games) == 0 {
		return nil
	}

	ids := make([]string, len(games))
	for i, g := range games {
		ids[i] = g.ID
	}

	rows, err := db.Query(ctx, `
		SELECT id, game_id, platform, zarfiat, price_usd::text, price_toman, slots
		FROM game_prices WHERE game_id = ANY($1)
		ORDER BY platform, zarfiat
	`, ids)
	if err != nil {
		return fmt.Errorf("get game prices: %w", err)
	}
	defer rows.Close()

	priceMap := make(map[string][]gamePriceRow)
	for rows.Next() {
		var p gamePriceRow
		var gameID string
		if err := rows.Scan(&p.ID, &gameID, &p.Platform, &p.Zarfiat, &p.PriceUSD, &p.PriceToman, &p.Slots); err != nil {
			return fmt.Errorf("scan price: %w", err)
		}
		priceMap[gameID] = append(priceMap[gameID], p)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("prices rows error: %w", err)
	}

	for i := range games {
		if prices := priceMap[games[i].ID]; prices != nil {
			games[i].Prices = prices
		}
	}
	return nil
}

func getExchangeRate(ctx context.Context, db *pgxpool.Pool) (*exchangeRateRow, error) {
	var r exchangeRateRow
	err := db.QueryRow(ctx,
		"SELECT id, usd_to_toman, updated_at FROM exchange_rate WHERE id = 1 LIMIT 1",
	).Scan(&r.ID, &r.USDToToman, &r.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get exchange rate: %w", err)
	}
	return &r, nil
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
