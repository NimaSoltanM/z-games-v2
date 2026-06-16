package orders

import "testing"

func TestUnitPrice(t *testing.T) {
	tmn := func(v int) *int { return &v }
	usd := func(v float64) *float64 { return &v }

	cases := []struct {
		name   string
		active bool
		mode   string
		usd    *float64
		tmn    *int
		rate   int
		want   int
		ok     bool
	}{
		{"inactive game is never priceable", false, "fixed", nil, tmn(1000), 95000, 0, false},
		{"fixed price", true, "fixed", nil, tmn(1000), 0, 1000, true},
		{"fixed with nil price rejected", true, "fixed", nil, nil, 0, 0, false},
		{"fixed with zero price rejected", true, "fixed", nil, tmn(0), 0, 0, false},
		{"dynamic price = usd * rate", true, "dynamic", usd(8), nil, 95000, 760000, true},
		{"dynamic rounds to nearest toman", true, "dynamic", usd(5.5), nil, 95000, 522500, true},
		{"dynamic with nil usd rejected", true, "dynamic", nil, nil, 95000, 0, false},
		{"dynamic with zero rate rejected", true, "dynamic", usd(8), nil, 0, 0, false},
	}

	for _, tc := range cases {
		got, ok := unitPrice(tc.active, tc.mode, tc.usd, tc.tmn, tc.rate)
		if ok != tc.ok {
			t.Errorf("%s: ok = %v, want %v", tc.name, ok, tc.ok)
			continue
		}
		if ok && got != tc.want {
			t.Errorf("%s: price = %d, want %d", tc.name, got, tc.want)
		}
	}
}
