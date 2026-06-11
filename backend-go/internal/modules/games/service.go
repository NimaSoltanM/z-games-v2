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

type gameRow struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	CoverImage   *string       `json:"cover_image"`
	Platform     string        `json:"platform"`
	PriceMode    string        `json:"price_mode"`
	Z2PriceUSD   *string       `json:"z2_price_usd"`
	Z3PriceUSD   *string       `json:"z3_price_usd"`
	Z2PriceToman *int          `json:"z2_price_toman"`
	Z3PriceToman *int          `json:"z3_price_toman"`
	Z2Slots      *int          `json:"z2_slots"`
	Z3Slots      *int          `json:"z3_slots"`
	Active       bool          `json:"active"`
	Links        []gameLinkRow `json:"links"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
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
	priceMode  string
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
	if filter.priceMode != "" {
		conds = append(conds, fmt.Sprintf("price_mode::text = $%d", n))
		args = append(args, filter.priceMode)
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
		SELECT id, name, cover_image, platform::text, price_mode::text,
		       z2_price_usd::text, z3_price_usd::text,
		       z2_price_toman, z3_price_toman,
		       z2_slots, z3_slots, active, created_at, updated_at
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
			&g.ID, &g.Name, &g.CoverImage, &g.Platform, &g.PriceMode,
			&g.Z2PriceUSD, &g.Z3PriceUSD,
			&g.Z2PriceToman, &g.Z3PriceToman,
			&g.Z2Slots, &g.Z3Slots, &g.Active,
			&g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan game: %w", err)
		}
		result = append(result, g)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
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
		SELECT id, name, cover_image, platform::text, price_mode::text,
		       z2_price_usd::text, z3_price_usd::text,
		       z2_price_toman, z3_price_toman,
		       z2_slots, z3_slots, active, created_at, updated_at
		FROM games WHERE %s LIMIT 1
	`, cond), id).Scan(
		&g.ID, &g.Name, &g.CoverImage, &g.Platform, &g.PriceMode,
		&g.Z2PriceUSD, &g.Z3PriceUSD,
		&g.Z2PriceToman, &g.Z3PriceToman,
		&g.Z2Slots, &g.Z3Slots, &g.Active,
		&g.CreatedAt, &g.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get game: %w", err)
	}

	games := []gameRow{g}
	if err := attachLinks(ctx, db, games); err != nil {
		return nil, err
	}
	return &games[0], nil
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
		} else {
			games[i].Links = []gameLinkRow{}
		}
	}
	return nil
}
