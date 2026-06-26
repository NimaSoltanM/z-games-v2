package orders

import (
	"testing"

	"github.com/soltanmohammdi/z-games/internal/shared/pricing"
)

func TestUnitPrice(t *testing.T) {
	tmn := func(v int) *int { return &v }
	usd := func(v float64) *float64 { return &v }
	pct := func(v int) *int { return &v }
	cfg := pricing.DefaultConfig // z1=15 z2=60 z3=25, default margin 10

	cases := []struct {
		name    string
		active  bool
		mode    string
		base    *float64
		margin  *int
		tmn     *int
		rate    int
		zarfiat string
		want    int
		ok      bool
	}{
		{"inactive is never priceable", false, "fixed", nil, nil, tmn(1000), 95000, "z2", 0, false},
		{"fixed uses stored toman", true, "fixed", nil, nil, tmn(1000), 0, "z2", 1000, true},
		{"fixed nil rejected", true, "fixed", nil, nil, nil, 0, "z2", 0, false},
		{"fixed zero rejected", true, "fixed", nil, nil, tmn(0), 0, "z2", 0, false},
		// 8 * (1+10%) * 60% * 95000 = 501,600
		{"dynamic z2 default margin", true, "dynamic", usd(8), nil, nil, 95000, "z2", 501600, true},
		// 8 * 1.10 * 15% * 95000 = 125,400
		{"dynamic z1", true, "dynamic", usd(8), nil, nil, 95000, "z1", 125400, true},
		// 8 * 1.10 * 25% * 95000 = 209,000
		{"dynamic z3", true, "dynamic", usd(8), nil, nil, 95000, "z3", 209000, true},
		// per-game 30% margin: 8 * 1.30 * 60% * 95000 = 592,800
		{"dynamic margin override", true, "dynamic", usd(8), pct(30), nil, 95000, "z2", 592800, true},
		{"dynamic nil base rejected", true, "dynamic", nil, nil, nil, 95000, "z2", 0, false},
		{"dynamic zero rate rejected", true, "dynamic", usd(8), nil, nil, 0, "z2", 0, false},
	}

	for _, tc := range cases {
		got, ok := unitPrice(tc.active, tc.mode, tc.base, tc.margin, tc.tmn, tc.rate, cfg, tc.zarfiat)
		if ok != tc.ok {
			t.Errorf("%s: ok = %v, want %v", tc.name, ok, tc.ok)
			continue
		}
		if ok && got != tc.want {
			t.Errorf("%s: price = %d, want %d", tc.name, got, tc.want)
		}
	}
}
