package pricing

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// Querier is the subset of pgx used to load pricing data; satisfied by both
// *pgxpool.Pool and pgx.Tx so the same loaders work standalone or in a transaction.
type Querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

// LoadRate returns the USD→Toman exchange rate, or 0 if none has been set yet.
func LoadRate(ctx context.Context, q Querier) (int, error) {
	var rate int
	err := q.QueryRow(ctx, "SELECT usd_to_toman FROM exchange_rate WHERE id = 1").Scan(&rate)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("load rate: %w", err)
	}
	return rate, nil
}

// LoadCatalog loads the full console + capacity catalog, ordered for display.
func LoadCatalog(ctx context.Context, q Querier) (Catalog, error) {
	rows, err := q.Query(ctx, `
		SELECT code, family, label_fa, default_margin_pct
		FROM consoles
		ORDER BY sort_order, code
	`)
	if err != nil {
		return Catalog{}, fmt.Errorf("load consoles: %w", err)
	}
	var cat Catalog
	idx := map[string]int{}
	for rows.Next() {
		var cn Console
		if err := rows.Scan(&cn.Code, &cn.Family, &cn.LabelFA, &cn.DefaultMarginPct); err != nil {
			rows.Close()
			return Catalog{}, fmt.Errorf("scan console: %w", err)
		}
		cn.Capacities = []Capacity{}
		idx[cn.Code] = len(cat.Consoles)
		cat.Consoles = append(cat.Consoles, cn)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return Catalog{}, fmt.Errorf("consoles rows: %w", err)
	}

	crows, err := q.Query(ctx, `
		SELECT console_code, code, label_fa, split_pct, sort_order
		FROM capacities
		ORDER BY console_code, sort_order, code
	`)
	if err != nil {
		return Catalog{}, fmt.Errorf("load capacities: %w", err)
	}
	defer crows.Close()
	for crows.Next() {
		var consoleCode string
		var cp Capacity
		if err := crows.Scan(&consoleCode, &cp.Code, &cp.LabelFA, &cp.SplitPct, &cp.SortOrder); err != nil {
			return Catalog{}, fmt.Errorf("scan capacity: %w", err)
		}
		if i, ok := idx[consoleCode]; ok {
			cat.Consoles[i].Capacities = append(cat.Consoles[i].Capacities, cp)
		}
	}
	return cat, crows.Err()
}
