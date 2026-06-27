package pricing

import (
	"testing"
	"time"
)

func TestTierToman(t *testing.T) {
	cfg := Config{Z1Pct: 15, Z2Pct: 60, Z3Pct: 25, DefaultMarginPct: 10}

	// base $8, default 10% margin, rate 95000.
	cases := []struct {
		zarfiat string
		margin  int
		want    int
	}{
		{"z1", 10, 125400}, // 8 * 1.10 * 0.15 * 95000
		{"z2", 10, 501600}, // 8 * 1.10 * 0.60 * 95000
		{"z3", 10, 209000}, // 8 * 1.10 * 0.25 * 95000
		{"z2", 30, 592800}, // 8 * 1.30 * 0.60 * 95000 (per-game override)
	}
	for _, c := range cases {
		if got := cfg.TierToman(8, c.margin, 95000, c.zarfiat); got != c.want {
			t.Errorf("TierToman(8, %d%%, %s) = %d, want %d", c.margin, c.zarfiat, got, c.want)
		}
	}
}

func TestMargin(t *testing.T) {
	cfg := Config{DefaultMarginPct: 10}
	if cfg.Margin(nil) != 10 {
		t.Fatal("nil override should use default")
	}
	thirty := 30
	if cfg.Margin(&thirty) != 30 {
		t.Fatal("override should win")
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
