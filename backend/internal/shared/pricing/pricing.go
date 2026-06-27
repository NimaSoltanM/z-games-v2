// Package pricing is the single source of truth for how a dynamic game's per-tier
// prices derive from its base USD price. A dynamic game stores one base USD price
// per console; each capacity tier's price is:
//
//	tier_toman = base_usd * usd_to_toman * (1 + margin%) * split%
//
// The capacity split (z1/z2/z3) and the default margin are global config; the
// margin can be overridden per game.
package pricing

import (
	"math"
	"time"
)

// Config is the global pricing config — the capacity split and default margin.
type Config struct {
	Z1Pct            int `json:"z1_pct"`
	Z2Pct            int `json:"z2_pct"`
	Z3Pct            int `json:"z3_pct"`
	DefaultMarginPct int `json:"default_margin_pct"`
}

// DefaultConfig is used before any config has been saved.
var DefaultConfig = Config{Z1Pct: 15, Z2Pct: 60, Z3Pct: 25, DefaultMarginPct: 10}

// Zarfiats are the capacity tiers a dynamic base price derives prices for.
var Zarfiats = []string{"z1", "z2", "z3"}

// SplitPct returns the share of the full price a tier costs (0 for unknown).
func (c Config) SplitPct(zarfiat string) int {
	switch zarfiat {
	case "z1":
		return c.Z1Pct
	case "z2":
		return c.Z2Pct
	case "z3":
		return c.Z3Pct
	default:
		return 0
	}
}

// Margin resolves the effective margin: a per-game override, else the default.
func (c Config) Margin(override *int) int {
	if override != nil {
		return *override
	}
	return c.DefaultMarginPct
}

// TierUSD is a tier's derived USD price (base scaled by margin + split). Multiply
// by the exchange rate to get Toman; kept separate so responses can expose the
// same per-tier `price_usd` shape the storefront already understands.
func (c Config) TierUSD(baseUSD float64, marginPct int, zarfiat string) float64 {
	return baseUSD * (1 + float64(marginPct)/100) * (float64(c.SplitPct(zarfiat)) / 100)
}

// TierToman is a tier's final Toman price for a dynamic game.
func (c Config) TierToman(baseUSD float64, marginPct, rate int, zarfiat string) int {
	return int(math.Round(c.TierUSD(baseUSD, marginPct, zarfiat) * float64(rate)))
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
