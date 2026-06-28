package orders

import (
	"testing"

	"github.com/soltanmohammdi/z-games/internal/shared/pricing"
)

func TestUnitPrice(t *testing.T) {
	tmn := func(v int) *int { return &v }
	usd := func(v float64) *float64 { return &v }
	pct := func(v int) *int { return &v }

	// ps5 default margin 10%, z1/z2/z3 = 15/60/25; xbox_series margin 20%, home/switch = 60/40.
	catalog := pricing.Catalog{Consoles: []pricing.Console{
		{Code: "ps5", DefaultMarginPct: 10, Capacities: []pricing.Capacity{
			{Code: "z1", SplitPct: 15}, {Code: "z2", SplitPct: 60}, {Code: "z3", SplitPct: 25},
		}},
		{Code: "xbox_series", DefaultMarginPct: 20, Capacities: []pricing.Capacity{
			{Code: "home", SplitPct: 60}, {Code: "switch", SplitPct: 40},
		}},
	}}

	cases := []struct {
		name     string
		active   bool
		mode     string
		base     *float64
		margin   *int
		tmn      *int
		rate     int
		console  string
		capacity string
		want     int
		ok       bool
	}{
		{"inactive is never priceable", false, "fixed", nil, nil, tmn(1000), 95000, "ps5", "z2", 0, false},
		{"fixed uses stored toman", true, "fixed", nil, nil, tmn(1000), 0, "ps5", "z2", 1000, true},
		{"fixed nil rejected", true, "fixed", nil, nil, nil, 0, "ps5", "z2", 0, false},
		{"fixed zero rejected", true, "fixed", nil, nil, tmn(0), 0, "ps5", "z2", 0, false},
		// 8 * (1+10%) * 60% * 95000 = 501,600
		{"dynamic z2 default margin", true, "dynamic", usd(8), nil, nil, 95000, "ps5", "z2", 501600, true},
		// 8 * 1.10 * 15% * 95000 = 125,400
		{"dynamic z1", true, "dynamic", usd(8), nil, nil, 95000, "ps5", "z1", 125400, true},
		// 8 * 1.10 * 25% * 95000 = 209,000
		{"dynamic z3", true, "dynamic", usd(8), nil, nil, 95000, "ps5", "z3", 209000, true},
		// per-game 30% margin: 8 * 1.30 * 60% * 95000 = 592,800
		{"dynamic margin override", true, "dynamic", usd(8), pct(30), nil, 95000, "ps5", "z2", 592800, true},
		// xbox switch, console default margin 20%: 8 * 1.20 * 40% * 95000 = 364,800
		{"dynamic xbox switch", true, "dynamic", usd(8), nil, nil, 95000, "xbox_series", "switch", 364800, true},
		// xbox home: 8 * 1.20 * 60% * 95000 = 547,200
		{"dynamic xbox home", true, "dynamic", usd(8), nil, nil, 95000, "xbox_series", "home", 547200, true},
		{"dynamic nil base rejected", true, "dynamic", nil, nil, nil, 95000, "ps5", "z2", 0, false},
		{"dynamic zero rate rejected", true, "dynamic", usd(8), nil, nil, 0, "ps5", "z2", 0, false},
		{"dynamic unknown console rejected", true, "dynamic", usd(8), nil, nil, 95000, "steam", "z2", 0, false},
		{"dynamic unknown capacity rejected", true, "dynamic", usd(8), nil, nil, 95000, "ps5", "home", 0, false},
	}

	for _, tc := range cases {
		got, ok := unitPrice(tc.active, tc.mode, tc.base, tc.margin, tc.tmn, tc.rate, catalog, tc.console, tc.capacity)
		if ok != tc.ok {
			t.Errorf("%s: ok = %v, want %v", tc.name, ok, tc.ok)
			continue
		}
		if ok && got != tc.want {
			t.Errorf("%s: price = %d, want %d", tc.name, got, tc.want)
		}
	}
}
