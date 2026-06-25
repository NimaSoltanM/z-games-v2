package release

import (
	"testing"
	"time"
)

func TestPhase(t *testing.T) {
	now := time.Date(2026, 6, 25, 12, 0, 0, 0, time.UTC)
	ptr := func(t time.Time) *time.Time { return &t }

	cases := []struct {
		name        string
		status      string
		releaseDate *time.Time
		want        string
	}{
		{"released status, no date", StatusReleased, nil, PhaseReleased},
		{"released status ignores date", StatusReleased, ptr(now.Add(48 * time.Hour)), PhaseReleased},
		{"pre-order without date stays open", StatusPreOrder, nil, PhasePreOrder},
		{"pre-order far from release", StatusPreOrder, ptr(now.Add(10 * 24 * time.Hour)), PhasePreOrder},
		{"pre-order just outside buffer", StatusPreOrder, ptr(now.Add(CloseBuffer + time.Hour)), PhasePreOrder},
		{"pre-order at buffer edge closes", StatusPreOrder, ptr(now.Add(CloseBuffer)), PhaseClosingSoon},
		{"pre-order inside buffer closes", StatusPreOrder, ptr(now.Add(2 * time.Hour)), PhaseClosingSoon},
		{"pre-order at release auto-releases", StatusPreOrder, ptr(now), PhaseReleased},
		{"pre-order past release auto-releases", StatusPreOrder, ptr(now.Add(-time.Hour)), PhaseReleased},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Phase(c.status, c.releaseDate, now); got != c.want {
				t.Fatalf("Phase(%q, %v) = %q, want %q", c.status, c.releaseDate, got, c.want)
			}
		})
	}
}

func TestPurchasable(t *testing.T) {
	if Purchasable(PhaseClosingSoon) {
		t.Fatal("closing_soon must not be purchasable")
	}
	if !Purchasable(PhaseReleased) || !Purchasable(PhasePreOrder) {
		t.Fatal("released and pre_order must be purchasable")
	}
}
