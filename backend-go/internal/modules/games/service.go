package games

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

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
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
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
		SELECT id, name, cover_image, platform::text, price_mode::text, active, created_at, updated_at
		FROM games %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, where, orderBy, n, n+1), append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list games: %w", err)
	}
	defer rows.Close()

	result := make([]gameRow, 0)
	for rows.Next() {
		var g gameRow
		if err := rows.Scan(
			&g.ID, &g.Name, &g.CoverImage, &g.Platform, &g.PriceMode, &g.Active,
			&g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan game: %w", err)
		}
		g.Prices = []gamePriceRow{}
		g.Links = []gameLinkRow{}
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
		SELECT id, name, cover_image, platform::text, price_mode::text, active, created_at, updated_at
		FROM games WHERE %s LIMIT 1
	`, cond), id).Scan(
		&g.ID, &g.Name, &g.CoverImage, &g.Platform, &g.PriceMode, &g.Active,
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
