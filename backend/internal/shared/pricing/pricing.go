// Package pricing is the single source of truth for how a dynamic game's per-tier
// prices derive from its base USD price. A dynamic game stores one base USD price
// per console; each capacity tier's price is:
//
//	tier_toman = base_usd * usd_to_toman * (1 + margin%) * split%
//
// The capacity split (z1/z2/z3) and the default margin are global config; the
// margin can be overridden per game.
package pricing

import "math"

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
