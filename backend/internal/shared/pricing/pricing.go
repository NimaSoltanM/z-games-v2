// Package pricing is the single source of truth for how a dynamic game's per-tier
// prices derive from its base USD price. A dynamic game stores one base USD price
// per console; each capacity's price is:
//
//	tier_toman = base_usd * usd_to_toman * (1 + margin%) * split%
//
// The capacity split and the default margin are per-console config (the catalog);
// the margin can be overridden per game. The catalog is loaded from the DB (see
// load.go) so adding a console or capacity is data, not code.
package pricing

import (
	"math"
	"time"
)

// Capacity is one sellable slot for a console (e.g. z2, home), carrying the share
// of the full price it costs.
type Capacity struct {
	Code      string `json:"code"`
	LabelFA   string `json:"label_fa"`
	SplitPct  int    `json:"split_pct"`
	SortOrder int    `json:"sort_order"`
}

// Console is one device the store sells on, with its own default profit margin and
// capacity set. A game's per-tier prices derive from a base USD price per console.
type Console struct {
	Code             string     `json:"code"`
	Family           string     `json:"family"`
	LabelFA          string     `json:"label_fa"`
	DefaultMarginPct int        `json:"default_margin_pct"`
	Capacities       []Capacity `json:"capacities"`
}

// Margin resolves the effective margin for a console: a per-game override, else the
// console's default.
func (cn Console) Margin(override *int) int {
	if override != nil {
		return *override
	}
	return cn.DefaultMarginPct
}

// Catalog is the full console + capacity pricing catalog.
type Catalog struct {
	Consoles []Console `json:"consoles"`
}

// Console returns the console with the given code.
func (cat Catalog) Console(code string) (Console, bool) {
	for _, cn := range cat.Consoles {
		if cn.Code == code {
			return cn, true
		}
	}
	return Console{}, false
}

// Capacity returns a console's capacity by code.
func (cat Catalog) Capacity(console, capacity string) (Capacity, bool) {
	cn, ok := cat.Console(console)
	if !ok {
		return Capacity{}, false
	}
	for _, cp := range cn.Capacities {
		if cp.Code == capacity {
			return cp, true
		}
	}
	return Capacity{}, false
}

// TierUSD is a capacity's derived USD price: the base scaled by margin and the
// capacity split. Multiply by the exchange rate to get Toman; kept separate so
// responses can expose the same per-tier `price_usd` shape the storefront uses.
func TierUSD(baseUSD float64, marginPct, splitPct int) float64 {
	return baseUSD * (1 + float64(marginPct)/100) * (float64(splitPct) / 100)
}

// TierToman is a capacity's final Toman price for a dynamic game.
func TierToman(baseUSD float64, marginPct, splitPct, rate int) int {
	return int(math.Round(TierUSD(baseUSD, marginPct, splitPct) * float64(rate)))
}

// TierTomanFor derives a dynamic game's Toman price for one console+capacity from
// its base USD price, applying the console's margin (or a per-game override) and
// the capacity split from the catalog. It returns false when the console/capacity
// isn't in the catalog or the inputs can't yield a positive price — the single
// source of truth both checkout and returns use to price one slot.
func (cat Catalog) TierTomanFor(console, capacity string, baseUSD float64, marginOverride *int, rate int) (int, bool) {
	if rate <= 0 || baseUSD <= 0 {
		return 0, false
	}
	cn, ok := cat.Console(console)
	if !ok {
		return 0, false
	}
	cp, ok := cat.Capacity(console, capacity)
	if !ok {
		return 0, false
	}
	p := TierToman(baseUSD, cn.Margin(marginOverride), cp.SplitPct, rate)
	if p <= 0 {
		return 0, false
	}
	return p, true
}

// ActiveDiscountPct returns the discount percent in effect at `now` for a stored
// discount window, or 0 when no discount is active. The fields are all-or-nothing
// and the window is half-open [startsAt, endsAt), so a discount disappears exactly
// at its deadline. This is the single source of truth for "is a discount live".
func ActiveDiscountPct(pct *int, startsAt, endsAt *time.Time, now time.Time) int {
	if pct == nil || startsAt == nil || endsAt == nil {
		return 0
	}
	if now.Before(*startsAt) || !now.Before(*endsAt) {
		return 0
	}
	return *pct
}

// ApplyDiscount reduces a Toman price by pct percent, rounded to the nearest Toman.
// A non-positive pct leaves the price unchanged.
func ApplyDiscount(price, pct int) int {
	if pct <= 0 {
		return price
	}
	return int(math.Round(float64(price) * (1 - float64(pct)/100)))
}

// DefaultReturnFeePct is the share of a game's current store price the business
// keeps when crediting a return (so the customer's wallet gets the remaining
// 100−25 = 75%). A per-game reduced-fee window can lower this temporarily; see
// EffectiveReturnFeePct.
const DefaultReturnFeePct = 25

// EffectiveReturnFeePct is the return fee percent that applies to a game at `now`:
// the per-game override when its window is live, otherwise DefaultReturnFeePct.
// The window fields are all-or-nothing and half-open [startsAt, endsAt), reusing
// the same "is it live" logic as ActiveDiscountPct. An override of 0 is honored
// (a free-return promo), so this checks the window directly rather than treating
// a 0 result as "inactive".
func EffectiveReturnFeePct(override *int, startsAt, endsAt *time.Time, now time.Time) int {
	if override == nil || startsAt == nil || endsAt == nil {
		return DefaultReturnFeePct
	}
	if now.Before(*startsAt) || !now.Before(*endsAt) {
		return DefaultReturnFeePct
	}
	return *override
}
