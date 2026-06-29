package games

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// oldGameState is the pre-update snapshot of a game's scalar columns, used to
// compute a field-level diff for the audit log.
type oldGameState struct {
	Name            string
	CoverImage      *string
	PriceMode       string
	Active          bool
	ReleaseStatus   string
	ReleaseDate     *time.Time
	AlertMessage    *string
	AlertVariant    *string
	ProfitMarginPct *int
}

// loadOldGameState locks the row (FOR UPDATE) and returns its current scalar
// state. pgx.ErrNoRows means the game doesn't exist.
func loadOldGameState(ctx context.Context, tx pgx.Tx, id string) (oldGameState, error) {
	var s oldGameState
	err := tx.QueryRow(ctx, `
		SELECT name, cover_image, price_mode, active,
		       release_status, release_date, alert_message, alert_variant, profit_margin_pct
		FROM games WHERE id = $1 FOR UPDATE
	`, id).Scan(&s.Name, &s.CoverImage, &s.PriceMode, &s.Active,
		&s.ReleaseStatus, &s.ReleaseDate, &s.AlertMessage, &s.AlertVariant, &s.ProfitMarginPct)
	return s, err
}

// loadOldConsoles returns a game's current console codes, for the audit diff.
func loadOldConsoles(ctx context.Context, tx pgx.Tx, id string) ([]string, error) {
	rows, err := tx.Query(ctx, "SELECT console_code FROM game_consoles WHERE game_id = $1 ORDER BY console_code", id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}
		out = append(out, code)
	}
	return out, rows.Err()
}

// loadOldPrices reads a game's current prices into lookup maps: fixed prices
// keyed "platform|zarfiat" -> toman, and dynamic base prices keyed platform ->
// USD. (base_usd is cast to float8 so it scans cleanly.)
func loadOldPrices(ctx context.Context, tx pgx.Tx, id string) (fixed map[string]int, base map[string]float64, err error) {
	fixed = map[string]int{}
	base = map[string]float64{}

	rows, err := tx.Query(ctx, "SELECT platform, zarfiat, COALESCE(price_toman, 0) FROM game_prices WHERE game_id = $1", id)
	if err != nil {
		return nil, nil, err
	}
	for rows.Next() {
		var platform, zarfiat string
		var toman int
		if err := rows.Scan(&platform, &zarfiat, &toman); err != nil {
			rows.Close()
			return nil, nil, err
		}
		fixed[platform+"|"+zarfiat] = toman
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	brows, err := tx.Query(ctx, "SELECT platform, base_usd::float8 FROM game_base_prices WHERE game_id = $1", id)
	if err != nil {
		return nil, nil, err
	}
	for brows.Next() {
		var platform string
		var usd float64
		if err := brows.Scan(&platform, &usd); err != nil {
			brows.Close()
			return nil, nil, err
		}
		base[platform] = usd
	}
	brows.Close()
	return fixed, base, brows.Err()
}

// buildUpdateMetadata diffs the old game state against the incoming update and
// returns the audit metadata: the game name (so the feed reads naturally and
// survives deletion), a map of changed scalar fields ({from,to}), and a list of
// price changes. A field is present only when it actually changed.
func buildUpdateMetadata(old oldGameState, in normalizedGame, oldFixed map[string]int, oldBase map[string]float64, oldConsoles []string) map[string]any {
	changes := map[string]any{}
	set := func(field string, from, to any) { changes[field] = map[string]any{"from": from, "to": to} }

	if old.Name != in.Name {
		set("name", old.Name, in.Name)
	}
	if old.Active != in.Active {
		set("active", old.Active, in.Active)
	}
	if !sameStringSet(oldConsoles, in.Consoles) {
		set("consoles", oldConsoles, in.Consoles)
	}
	if old.PriceMode != in.PriceMode {
		set("price_mode", old.PriceMode, in.PriceMode)
	}
	if releaseStatusOrDefault(old.ReleaseStatus) != releaseStatusOrDefault(in.ReleaseStatus) {
		set("release_status", releaseStatusOrDefault(old.ReleaseStatus), releaseStatusOrDefault(in.ReleaseStatus))
	}
	if !eqIntPtr(old.ProfitMarginPct, in.ProfitMarginPct) {
		set("profit_margin_pct", ptrIntVal(old.ProfitMarginPct), ptrIntVal(in.ProfitMarginPct))
	}
	if !eqStrPtr(old.AlertMessage, in.AlertMessage) {
		set("alert_message", ptrStrVal(old.AlertMessage), ptrStrVal(in.AlertMessage))
	}
	if !eqStrPtr(old.AlertVariant, in.AlertVariant) {
		set("alert_variant", ptrStrVal(old.AlertVariant), ptrStrVal(in.AlertVariant))
	}
	if !eqTimePtr(old.ReleaseDate, in.ReleaseDate) {
		set("release_date", ptrTimeVal(old.ReleaseDate), ptrTimeVal(in.ReleaseDate))
	}
	if !eqStrPtr(old.CoverImage, in.CoverImage) {
		set("cover_image", ptrStrVal(old.CoverImage), ptrStrVal(in.CoverImage))
	}

	meta := map[string]any{"name": in.Name, "changes": changes}
	if pc := computePriceChanges(old.PriceMode, in, oldFixed, oldBase); len(pc) > 0 {
		meta["price_changes"] = pc
	}
	return meta
}

// computePriceChanges lists the per-line price differences. When the price mode
// itself changed, the cross-mode comparison is meaningless, so it returns
// nothing (the mode switch is already recorded in `changes`).
func computePriceChanges(oldMode string, in normalizedGame, oldFixed map[string]int, oldBase map[string]float64) []map[string]any {
	out := []map[string]any{}
	if oldMode != in.PriceMode {
		return out
	}

	if in.PriceMode == "dynamic" {
		newBase := map[string]float64{}
		for _, b := range in.BasePrices {
			newBase[b.Platform] = b.BaseUSD
		}
		for platform, oldV := range oldBase {
			if newV, ok := newBase[platform]; !ok {
				out = append(out, map[string]any{"platform": platform, "kind": "base_usd", "from": oldV, "to": nil})
			} else if newV != oldV {
				out = append(out, map[string]any{"platform": platform, "kind": "base_usd", "from": oldV, "to": newV})
			}
		}
		for platform, newV := range newBase {
			if _, ok := oldBase[platform]; !ok {
				out = append(out, map[string]any{"platform": platform, "kind": "base_usd", "from": nil, "to": newV})
			}
		}
		return out
	}

	newFixed := map[string]int{}
	for _, p := range in.Prices {
		newFixed[p.Platform+"|"+p.Zarfiat] = p.PriceToman
	}
	for key, oldV := range oldFixed {
		platform, zarfiat, _ := strings.Cut(key, "|")
		if newV, ok := newFixed[key]; !ok {
			out = append(out, map[string]any{"platform": platform, "zarfiat": zarfiat, "kind": "toman", "from": oldV, "to": nil})
		} else if newV != oldV {
			out = append(out, map[string]any{"platform": platform, "zarfiat": zarfiat, "kind": "toman", "from": oldV, "to": newV})
		}
	}
	for key, newV := range newFixed {
		if _, ok := oldFixed[key]; !ok {
			platform, zarfiat, _ := strings.Cut(key, "|")
			out = append(out, map[string]any{"platform": platform, "zarfiat": zarfiat, "kind": "toman", "from": nil, "to": newV})
		}
	}
	return out
}

// sameStringSet reports whether two slices contain the same elements, ignoring
// order and duplicates — used to detect a change in a game's console set.
func sameStringSet(a, b []string) bool {
	seen := make(map[string]bool, len(a))
	for _, s := range a {
		seen[s] = true
	}
	other := make(map[string]bool, len(b))
	for _, s := range b {
		other[s] = true
	}
	if len(seen) != len(other) {
		return false
	}
	for s := range seen {
		if !other[s] {
			return false
		}
	}
	return true
}

// --- nil-safe compare + unwrap helpers (nil pointer -> JSON null) ------------

func eqIntPtr(a, b *int) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func eqStrPtr(a, b *string) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func eqTimePtr(a, b *time.Time) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.Equal(*b)
}

func ptrIntVal(p *int) any {
	if p == nil {
		return nil
	}
	return *p
}

func ptrStrVal(p *string) any {
	if p == nil {
		return nil
	}
	return *p
}

func ptrTimeVal(p *time.Time) any {
	if p == nil {
		return nil
	}
	return *p
}
