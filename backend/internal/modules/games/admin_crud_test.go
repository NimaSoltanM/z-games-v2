package games

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/soltanmohammdi/z-games/internal/shared/pricing"
	"github.com/soltanmohammdi/z-games/internal/shared/release"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func sptr(s string) *string { return &s }
func iptr(i int) *int       { return &i }

func findPrice(prices []gamePriceRow, platform, zarfiat string) *gamePriceRow {
	for i := range prices {
		if prices[i].Platform == platform && prices[i].Zarfiat == zarfiat {
			return &prices[i]
		}
	}
	return nil
}

func TestCreateGame_Dynamic(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	margin := 20
	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "New Game", Platform: "ps4_ps5", PriceMode: "dynamic", Active: true,
		CoverImage:      sptr("/uploads/cover.jpg"),
		ProfitMarginPct: &margin,
		BasePrices: []normalizedBasePrice{
			{Platform: "ps4", BaseUSD: 50},
			{Platform: "ps5", BaseUSD: 60},
		},
		Links: []string{"https://store.example.com/new-game"},
	})
	if err != nil {
		t.Fatal(err)
	}

	g, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	if g.ProfitMarginPct == nil || *g.ProfitMarginPct != 20 {
		t.Fatalf("margin = %v, want 20", g.ProfitMarginPct)
	}
	if len(g.BasePrices) != 2 {
		t.Fatalf("base prices = %d, want 2", len(g.BasePrices))
	}
	// 2 consoles × 3 derived tiers.
	if len(g.Prices) != 6 {
		t.Fatalf("derived prices = %d, want 6", len(g.Prices))
	}
	// ps4 z2 = 50 * (1+20%) * 60% = 36.00 (USD; rate applied at display).
	if p := findPrice(g.Prices, "ps4", "z2"); p == nil || p.PriceUSD == nil || *p.PriceUSD != "36.00" {
		t.Fatalf("ps4 z2 derived price = %v, want 36.00", p)
	}

	var auditN int
	db.QueryRow(ctx, "SELECT COUNT(*) FROM admin_actions WHERE action = 'game.create' AND target_id = $1", id).Scan(&auditN)
	if auditN != 1 {
		t.Fatalf("audit rows = %d, want 1", auditN)
	}
}

func TestCreateGame_Fixed(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Fixed Game", Platform: "ps5", PriceMode: "fixed", Active: true,
		Prices: []normalizedPrice{{Platform: "ps5", Zarfiat: "z2", PriceToman: 1500000, Slots: iptr(2)}},
	})
	if err != nil {
		t.Fatal(err)
	}
	g, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(g.BasePrices) != 0 {
		t.Fatalf("fixed game should have no base prices, got %d", len(g.BasePrices))
	}
	if p := findPrice(g.Prices, "ps5", "z2"); p == nil || p.PriceToman == nil || *p.PriceToman != 1500000 {
		t.Fatalf("ps5 z2 toman price = %v, want 1500000", p)
	}
}

func TestListGames(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	if _, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Dyn", Platform: "ps5", PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}},
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Fix", Platform: "ps5", PriceMode: "fixed", Active: true,
		Prices: []normalizedPrice{{Platform: "ps5", Zarfiat: "z2", PriceToman: 100000}},
	}); err != nil {
		t.Fatal(err)
	}

	games, total, err := listGames(ctx, db, listFilter{onlyActive: false}, "created_at DESC", 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if total != 2 || len(games) != 2 {
		t.Fatalf("list = %d (total %d), want 2/2", len(games), total)
	}
	for _, g := range games {
		if g.PriceMode == "dynamic" && len(g.Prices) != 3 {
			t.Fatalf("dynamic game derived prices = %d, want 3", len(g.Prices))
		}
	}
}

func TestCreateGame_DuplicateLink(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	base := normalizedGame{Name: "G", Platform: "ps5", PriceMode: "dynamic",
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 10}},
		Links:      []string{"https://dup.example.com/x"}}
	if _, err := createGame(ctx, db, "a1", base); err != nil {
		t.Fatal(err)
	}
	if _, err := createGame(ctx, db, "a1", base); !errors.Is(err, ErrDuplicateLink) {
		t.Fatalf("second create: got %v, want ErrDuplicateLink", err)
	}
}

func TestUpdateGame_SwitchModeAndSetReleaseAlert(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Original", Platform: "ps4_ps5", PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{{Platform: "ps4", BaseUSD: 20}, {Platform: "ps5", BaseUSD: 25}},
		Links:      []string{"https://a.example.com"},
	})
	if err != nil {
		t.Fatal(err)
	}

	// Switch to a fixed-price PS5 game, set pre-order + alert.
	releaseDate := time.Now().UTC().Add(10 * 24 * time.Hour).Truncate(time.Second)
	err = updateGame(ctx, db, "a1", id, normalizedGame{
		Name: "Renamed", Platform: "ps5", PriceMode: "fixed", Active: false,
		ReleaseStatus: release.StatusPreOrder, ReleaseDate: &releaseDate,
		AlertMessage: sptr("نگه‌داری"), AlertVariant: sptr("warning"),
		Prices: []normalizedPrice{{Platform: "ps5", Zarfiat: "z3", PriceToman: 1500000}},
		Links:  []string{"https://b.example.com", "https://c.example.com"},
	})
	if err != nil {
		t.Fatal(err)
	}

	g, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	if g.Name != "Renamed" || g.Platform != "ps5" || g.PriceMode != "fixed" || g.Active {
		t.Fatalf("core not updated: %+v", g)
	}
	// Base prices cleared when switching to fixed; one fixed tier + two links.
	if len(g.BasePrices) != 0 {
		t.Fatalf("base prices not cleared: %d", len(g.BasePrices))
	}
	if len(g.Prices) != 1 || g.Prices[0].Zarfiat != "z3" || len(g.Links) != 2 {
		t.Fatalf("children not replaced: prices=%+v links=%d", g.Prices, len(g.Links))
	}
	if g.ReleaseStatus != release.StatusPreOrder || g.ReleaseDate == nil || !g.ReleaseDate.Equal(releaseDate) {
		t.Fatalf("pre-order not set: status=%q date=%v", g.ReleaseStatus, g.ReleaseDate)
	}
	if g.AlertMessage == nil || *g.AlertMessage != "نگه‌داری" {
		t.Fatalf("alert not set: %v", g.AlertMessage)
	}
}

func TestUpdateGame_NotFound(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	err := updateGame(ctx, db, "a1", "missing", normalizedGame{Name: "X", Platform: "ps5", PriceMode: "dynamic"})
	if !errors.Is(err, ErrGameNotFound) {
		t.Fatalf("got %v, want ErrGameNotFound", err)
	}
}

func TestDeleteGame(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Doomed", Platform: "ps5", PriceMode: "dynamic",
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 10}},
		Links:      []string{"https://d.example.com"},
	})
	if err != nil {
		t.Fatal(err)
	}

	if err := deleteGame(ctx, db, "a1", id); err != nil {
		t.Fatal(err)
	}
	g, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	if g != nil {
		t.Fatal("game still exists after delete")
	}

	var bases, links int
	db.QueryRow(ctx, "SELECT COUNT(*) FROM game_base_prices WHERE game_id = $1", id).Scan(&bases)
	db.QueryRow(ctx, "SELECT COUNT(*) FROM game_links WHERE game_id = $1", id).Scan(&links)
	if bases != 0 || links != 0 {
		t.Fatalf("children not cascaded: bases=%d links=%d", bases, links)
	}

	if err := deleteGame(ctx, db, "a1", id); !errors.Is(err, ErrGameNotFound) {
		t.Fatalf("delete again: got %v, want ErrGameNotFound", err)
	}
}

func TestSetExchangeRate(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	cfg := pricing.Config{Z1Pct: 15, Z2Pct: 60, Z3Pct: 25, DefaultMarginPct: 10}

	if err := setExchangeRate(ctx, db, "a1", 90000, cfg); err != nil {
		t.Fatal(err)
	}
	var rate int
	db.QueryRow(ctx, "SELECT usd_to_toman FROM exchange_rate WHERE id = 1").Scan(&rate)
	if rate != 90000 {
		t.Fatalf("rate = %d, want 90000", rate)
	}
	got, err := getPricingConfig(ctx, db)
	if err != nil || got != cfg {
		t.Fatalf("config = %+v err=%v, want %+v", got, err, cfg)
	}

	// Upsert to a new rate + margin.
	cfg.DefaultMarginPct = 15
	if err := setExchangeRate(ctx, db, "a1", 95000, cfg); err != nil {
		t.Fatal(err)
	}
	got, _ = getPricingConfig(ctx, db)
	if got.DefaultMarginPct != 15 {
		t.Fatalf("default margin = %d, want 15", got.DefaultMarginPct)
	}

	if err := setExchangeRate(ctx, db, "a1", 0, cfg); !errors.Is(err, ErrRateInvalid) {
		t.Fatalf("zero rate: got %v, want ErrRateInvalid", err)
	}
	bad := pricing.Config{Z1Pct: 10, Z2Pct: 60, Z3Pct: 25, DefaultMarginPct: 10} // sums 95
	if err := setExchangeRate(ctx, db, "a1", 90000, bad); !errors.Is(err, ErrSplitInvalid) {
		t.Fatalf("bad split: got %v, want ErrSplitInvalid", err)
	}
}

func TestValidateGameInput(t *testing.T) {
	good := gameInput{
		Name: "Valid", Platform: "ps4_ps5", PriceMode: "dynamic", Active: true,
		BasePrices: []basePriceInput{{Platform: "ps4", BaseUSD: 10}, {Platform: "ps5", BaseUSD: 12}},
		Links:      []string{"https://ok.example.com", " https://ok.example.com ", ""},
	}
	out, msg, ok := validateGameInput(good)
	if !ok {
		t.Fatalf("valid input rejected: %q", msg)
	}
	if len(out.Links) != 1 || len(out.BasePrices) != 2 {
		t.Fatalf("not normalized: links=%+v bases=%+v", out.Links, out.BasePrices)
	}

	cases := []struct {
		name string
		in   gameInput
	}{
		{"empty name", gameInput{Name: "  ", Platform: "ps5", PriceMode: "dynamic"}},
		{"bad platform", gameInput{Name: "X", Platform: "switch", PriceMode: "dynamic"}},
		{"bad mode", gameInput{Name: "X", Platform: "ps5", PriceMode: "barter"}},
		{"dynamic console mismatch", gameInput{Name: "X", Platform: "ps5", PriceMode: "dynamic",
			BasePrices: []basePriceInput{{Platform: "ps4", BaseUSD: 10}}}},
		{"dynamic zero base", gameInput{Name: "X", Platform: "ps5", PriceMode: "dynamic",
			BasePrices: []basePriceInput{{Platform: "ps5", BaseUSD: 0}}}},
		{"dynamic dup console", gameInput{Name: "X", Platform: "ps5", PriceMode: "dynamic",
			BasePrices: []basePriceInput{{Platform: "ps5", BaseUSD: 10}, {Platform: "ps5", BaseUSD: 11}}}},
		{"fixed missing toman", gameInput{Name: "X", Platform: "ps5", PriceMode: "fixed",
			Prices: []priceInput{{Platform: "ps5", Zarfiat: "z2", PriceToman: nil}}}},
		{"fixed bad zarfiat", gameInput{Name: "X", Platform: "ps5", PriceMode: "fixed",
			Prices: []priceInput{{Platform: "ps5", Zarfiat: "z9", PriceToman: iptr(100)}}}},
		{"bad link", gameInput{Name: "X", Platform: "ps5", PriceMode: "dynamic",
			Links: []string{"ftp://nope"}}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if _, msg, ok := validateGameInput(c.in); ok {
				t.Fatalf("expected rejection, got ok (msg=%q)", msg)
			}
		})
	}
}
