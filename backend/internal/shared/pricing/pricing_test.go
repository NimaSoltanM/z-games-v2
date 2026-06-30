package pricing

import (
	"testing"
	"time"
)

func TestTierToman(t *testing.T) {
	// base $8, rate 95000; split + margin vary per case.
	cases := []struct {
		split  int
		margin int
		want   int
	}{
		{15, 10, 125400}, // 8 * 1.10 * 0.15 * 95000
		{60, 10, 501600}, // 8 * 1.10 * 0.60 * 95000
		{25, 10, 209000}, // 8 * 1.10 * 0.25 * 95000
		{60, 30, 592800}, // 8 * 1.30 * 0.60 * 95000 (per-game override)
		{40, 20, 364800}, // xbox switch: 8 * 1.20 * 0.40 * 95000
	}
	for _, c := range cases {
		if got := TierToman(8, c.margin, c.split, 95000); got != c.want {
			t.Errorf("TierToman(8, margin %d%%, split %d%%) = %d, want %d", c.margin, c.split, got, c.want)
		}
	}
}

func TestConsoleMargin(t *testing.T) {
	cn := Console{DefaultMarginPct: 10}
	if cn.Margin(nil) != 10 {
		t.Fatal("nil override should use default")
	}
	thirty := 30
	if cn.Margin(&thirty) != 30 {
		t.Fatal("override should win")
	}
}

func TestCatalogLookup(t *testing.T) {
	cat := Catalog{Consoles: []Console{
		{Code: "ps5", DefaultMarginPct: 10, Capacities: []Capacity{{Code: "z2", SplitPct: 60}}},
		{Code: "xbox_series", DefaultMarginPct: 20, Capacities: []Capacity{
			{Code: "home", SplitPct: 60}, {Code: "switch", SplitPct: 40},
		}},
	}}

	if _, ok := cat.Console("ps5"); !ok {
		t.Fatal("ps5 should exist")
	}
	if _, ok := cat.Console("steam"); ok {
		t.Fatal("steam should not exist")
	}

	cp, ok := cat.Capacity("xbox_series", "switch")
	if !ok || cp.SplitPct != 40 {
		t.Fatalf("xbox_series/switch split = %d, ok = %v; want 40, true", cp.SplitPct, ok)
	}
	if _, ok := cat.Capacity("ps5", "home"); ok {
		t.Fatal("ps5 has no home capacity")
	}
	if _, ok := cat.Capacity("steam", "z2"); ok {
		t.Fatal("unknown console has no capacities")
	}
}

func TestActiveDiscountPct(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	pct := 20
	earlier := now.Add(-time.Hour)
	later := now.Add(time.Hour)

	cases := []struct {
		name             string
		pct              *int
		startsAt, endsAt *time.Time
		want             int
	}{
		{"none", nil, nil, nil, 0},
		{"active", &pct, &earlier, &later, 20},
		{"not started", &pct, &later, &later, 0},
		{"ended", &pct, &earlier, &earlier, 0},
		{"ends now is over", &pct, &earlier, &now, 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := ActiveDiscountPct(c.pct, c.startsAt, c.endsAt, now); got != c.want {
				t.Fatalf("got %d, want %d", got, c.want)
			}
		})
	}
}

func TestEffectiveReturnFeePct(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	earlier := now.Add(-time.Hour)
	later := now.Add(time.Hour)
	ten := 10
	zero := 0

	cases := []struct {
		name             string
		override         *int
		startsAt, endsAt *time.Time
		want             int
	}{
		{"no override → default", nil, nil, nil, DefaultReturnFeePct},
		{"override but no window → default", &ten, nil, nil, DefaultReturnFeePct},
		{"active window → override", &ten, &earlier, &later, 10},
		{"zero fee honored when active", &zero, &earlier, &later, 0},
		{"not started → default", &ten, &later, &later, DefaultReturnFeePct},
		{"ended → default", &ten, &earlier, &earlier, DefaultReturnFeePct},
		{"ends exactly now → default", &ten, &earlier, &now, DefaultReturnFeePct},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := EffectiveReturnFeePct(c.override, c.startsAt, c.endsAt, now); got != c.want {
				t.Fatalf("got %d, want %d", got, c.want)
			}
		})
	}
}

func TestTierTomanFor(t *testing.T) {
	cat := Catalog{Consoles: []Console{
		{Code: "ps5", DefaultMarginPct: 10, Capacities: []Capacity{{Code: "z2", SplitPct: 60}}},
	}}
	margin30 := 30

	// Happy path: matches TierToman(8, 10, 60, 95000).
	if got, ok := cat.TierTomanFor("ps5", "z2", 8, nil, 95000); !ok || got != 501600 {
		t.Fatalf("ps5/z2 = (%d, %v), want (501600, true)", got, ok)
	}
	// Per-game margin override flows through.
	if got, ok := cat.TierTomanFor("ps5", "z2", 8, &margin30, 95000); !ok || got != TierToman(8, 30, 60, 95000) {
		t.Fatalf("override margin = (%d, %v)", got, ok)
	}
	// Rejections: unknown console/capacity, non-positive rate/price.
	for _, c := range []struct {
		name              string
		console, capacity string
		base              float64
		rate              int
	}{
		{"unknown console", "steam", "z2", 8, 95000},
		{"unknown capacity", "ps5", "home", 8, 95000},
		{"zero rate", "ps5", "z2", 8, 0},
		{"zero base", "ps5", "z2", 0, 95000},
	} {
		t.Run(c.name, func(t *testing.T) {
			if got, ok := cat.TierTomanFor(c.console, c.capacity, c.base, nil, c.rate); ok || got != 0 {
				t.Fatalf("got (%d, %v), want (0, false)", got, ok)
			}
		})
	}
}

func TestApplyDiscount(t *testing.T) {
	cases := []struct {
		price, pct, want int
	}{
		{100_000, 0, 100_000}, // no discount
		{100_000, 20, 80_000}, // 20% off
		{99_999, 10, 89_999},  // 89999.1 → rounds to 89999
		{1_000_000, 33, 670_000},
	}
	for _, c := range cases {
		if got := ApplyDiscount(c.price, c.pct); got != c.want {
			t.Fatalf("ApplyDiscount(%d, %d) = %d, want %d", c.price, c.pct, got, c.want)
		}
	}
}
