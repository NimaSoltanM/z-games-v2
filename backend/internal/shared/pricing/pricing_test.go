package pricing

import "testing"

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
