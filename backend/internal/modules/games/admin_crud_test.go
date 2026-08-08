package games

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
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

func hasConsole(consoles []string, code string) bool {
	for _, c := range consoles {
		if c == code {
			return true
		}
	}
	return false
}

// psCatalog is a literal PS4/PS5 catalog for pure (no-DB) validation tests.
func psCatalog() pricing.Catalog {
	caps := []pricing.Capacity{{Code: "z1"}, {Code: "z2"}, {Code: "z3"}}
	return pricing.Catalog{Consoles: []pricing.Console{
		{Code: "ps4", Capacities: caps},
		{Code: "ps5", Capacities: caps},
	}}
}

func TestSetGameReturnFee(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "RF Game", Consoles: []string{"ps5"}, PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}},
		Links:      []string{"https://store.example.com/rf"},
	})
	if err != nil {
		t.Fatal(err)
	}

	// Start a 7-day reduced fee of 10%.
	if err := setGameReturnFee(ctx, db, "a1", id, 10, 7); err != nil {
		t.Fatal(err)
	}
	var pct *int
	var starts, ends *time.Time
	if err := db.QueryRow(ctx,
		"SELECT return_fee_pct, return_fee_starts_at, return_fee_ends_at FROM games WHERE id=$1", id,
	).Scan(&pct, &starts, &ends); err != nil {
		t.Fatal(err)
	}
	if pct == nil || *pct != 10 || starts == nil || ends == nil || !ends.After(*starts) {
		t.Fatalf("window not set: pct=%v starts=%v ends=%v", pct, starts, ends)
	}
	// The window the real code writes must be active immediately — guards the
	// Go-UTC write / pgx read round-trip the storefront estimate relies on.
	if got := pricing.EffectiveReturnFeePct(pct, starts, ends, time.Now().UTC()); got != 10 {
		t.Fatalf("freshly-set window not active now: EffectiveReturnFeePct = %d, want 10", got)
	}
	var audits int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM admin_actions WHERE action='game.return_fee' AND target_id=$1", id,
	).Scan(&audits); err != nil {
		t.Fatal(err)
	}
	if audits != 1 {
		t.Fatalf("audit rows = %d, want 1", audits)
	}

	// A zero-fee promo is valid (free returns) and still opens a window.
	if err := setGameReturnFee(ctx, db, "a1", id, 0, 3); err != nil {
		t.Fatalf("zero-fee window: %v", err)
	}
	if err := db.QueryRow(ctx, "SELECT return_fee_pct FROM games WHERE id=$1", id).Scan(&pct); err != nil {
		t.Fatal(err)
	}
	if pct == nil || *pct != 0 {
		t.Fatalf("zero-fee pct = %v, want 0", pct)
	}

	// days <= 0 clears the window.
	if err := setGameReturnFee(ctx, db, "a1", id, 0, 0); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, "SELECT return_fee_pct FROM games WHERE id=$1", id).Scan(&pct); err != nil {
		t.Fatal(err)
	}
	if pct != nil {
		t.Fatalf("window not cleared: %v", *pct)
	}

	// Out-of-range percent and unknown game are rejected.
	if err := setGameReturnFee(ctx, db, "a1", id, 100, 7); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("percent 100: want ErrInvalidInput, got %v", err)
	}
	if err := setGameReturnFee(ctx, db, "a1", "no-such-game", 10, 7); !errors.Is(err, ErrGameNotFound) {
		t.Fatalf("unknown game: want ErrGameNotFound, got %v", err)
	}
}

func TestCreateGame_Dynamic(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	margin := 20
	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "New Game", Consoles: []string{"ps4", "ps5"}, PriceMode: "dynamic", Active: true,
		CoverImage:          sptr("/uploads/cover.jpg"),
		DescriptionMarkdown: "## Story\n\nOriginal product copy.",
		SEOTitle:            sptr("Custom search title"),
		SEODescription:      sptr("Custom search description"),
		ProfitMarginPct:     &margin,
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
	if g.DescriptionMarkdown != "## Story\n\nOriginal product copy." ||
		g.SEOTitle == nil || *g.SEOTitle != "Custom search title" ||
		g.SEODescription == nil || *g.SEODescription != "Custom search description" {
		t.Fatalf("editorial fields did not round-trip: description=%q title=%v descriptionMeta=%v", g.DescriptionMarkdown, g.SEOTitle, g.SEODescription)
	}
	if len(g.Consoles) != 2 || !hasConsole(g.Consoles, "ps4") || !hasConsole(g.Consoles, "ps5") {
		t.Fatalf("consoles = %v, want [ps4 ps5]", g.Consoles)
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

func TestCreateGame_PreorderReleaseDateFromJSONRoundTrips(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	// Start with the exact JSON shape sent by the admin create form. This guards
	// the DTO field name, YYYY-MM-DD parsing, INSERT binding, and response model.
	var input gameInput
	if err := json.Unmarshal([]byte(`{
		"name":"EA SPORTS FC 27",
		"slug":"ea-sports-fc-27",
		"consoles":["ps5"],
		"price_mode":"dynamic",
		"active":true,
		"release_status":"pre_order",
		"release_date":"2026-09-25",
		"base_prices":[{"platform":"ps5","base_usd":70}],
		"links":["https://store.example.com/fc-27"]
	}`), &input); err != nil {
		t.Fatal(err)
	}
	norm, msg, ok := validateGameInput(input, psCatalog())
	if !ok {
		t.Fatalf("validateGameInput rejected create payload: %s", msg)
	}

	id, err := createGame(ctx, db, "a1", norm)
	if err != nil {
		t.Fatal(err)
	}
	want := time.Date(2026, time.September, 25, 0, 0, 0, 0, time.UTC)

	var storedStatus string
	var storedDate *time.Time
	if err := db.QueryRow(ctx,
		"SELECT release_status, release_date FROM games WHERE id = $1", id,
	).Scan(&storedStatus, &storedDate); err != nil {
		t.Fatal(err)
	}
	if storedStatus != release.StatusPreOrder || storedDate == nil || !storedDate.Equal(want) {
		t.Fatalf("stored preorder = (%q, %v), want (%q, %v)", storedStatus, storedDate, release.StatusPreOrder, want)
	}

	adminGame, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	publicGame, err := getGameByIDOrSlug(ctx, db, input.Slug, true)
	if err != nil {
		t.Fatal(err)
	}
	for view, game := range map[string]*gameRow{"admin": adminGame, "public": publicGame} {
		if game == nil || game.ReleaseDate == nil || !game.ReleaseDate.Equal(want) {
			t.Fatalf("%s response release_date = %v, want %v", view, game, want)
		}
	}

	encoded, err := json.Marshal(adminGame)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(encoded), `"release_date":"2026-09-25T00:00:00Z"`) {
		t.Fatalf("admin response does not contain an HTML-date-compatible timestamp: %s", encoded)
	}
}

func TestCreateGame_ReleasedWithoutDateStoresNull(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Published Game", Slug: "published-game", Consoles: []string{"ps5"},
		PriceMode: "dynamic", Active: true, ReleaseStatus: release.StatusReleased,
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 40}},
		Links:      []string{"https://store.example.com/published-game"},
	})
	if err != nil {
		t.Fatal(err)
	}

	var storedDate *time.Time
	if err := db.QueryRow(ctx, "SELECT release_date FROM games WHERE id = $1", id).Scan(&storedDate); err != nil {
		t.Fatal(err)
	}
	if storedDate != nil {
		t.Fatalf("release_date = %v, want NULL", storedDate)
	}
	game, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	if game == nil || game.ReleaseDate != nil {
		t.Fatalf("admin response release_date = %v, want nil", game)
	}
}

func TestCreateGame_Xbox(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	// A game on both PS5 (3 capacities) and Xbox Series (2 capacities) at once.
	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Cross Gen", Consoles: []string{"ps5", "xbox_series"}, PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{
			{Platform: "ps5", BaseUSD: 60},
			{Platform: "xbox_series", BaseUSD: 60},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	g, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	// ps5: z1/z2/z3 (3) + xbox_series: home/switch (2) = 5 derived prices.
	if len(g.Prices) != 5 {
		t.Fatalf("derived prices = %d, want 5", len(g.Prices))
	}
	// xbox_series home = 60 * (1+20%) * 60% = 43.20 (default xbox margin 20%).
	if p := findPrice(g.Prices, "xbox_series", "home"); p == nil || p.PriceUSD == nil || *p.PriceUSD != "43.20" {
		t.Fatalf("xbox_series home derived price = %v, want 43.20", p)
	}
	// switch split 40%: 60 * 1.20 * 40% = 28.80.
	if p := findPrice(g.Prices, "xbox_series", "switch"); p == nil || p.PriceUSD == nil || *p.PriceUSD != "28.80" {
		t.Fatalf("xbox_series switch derived price = %v, want 28.80", p)
	}
}

func TestCreateGame_DynamicDisabledCapacity(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	// ps5 base price selling only z2 + z3 (z1 disabled).
	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Partial", Consoles: []string{"ps5"}, PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{
			{Platform: "ps5", BaseUSD: 50, Capacities: []string{"z2", "z3"}},
		},
		Links: []string{"https://store.example.com/partial"},
	})
	if err != nil {
		t.Fatal(err)
	}
	g, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	// Only the two enabled capacities are derived/sold.
	if len(g.Prices) != 2 {
		t.Fatalf("derived prices = %d, want 2 (z1 disabled)", len(g.Prices))
	}
	if findPrice(g.Prices, "ps5", "z1") != nil {
		t.Fatal("z1 should be disabled but a price was derived for it")
	}
	if findPrice(g.Prices, "ps5", "z2") == nil ||
		findPrice(g.Prices, "ps5", "z3") == nil {
		t.Fatalf("z2/z3 should be sold: %+v", g.Prices)
	}
}

func TestCreateGame_Fixed(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Fixed Game", Consoles: []string{"ps5"}, PriceMode: "fixed", Active: true,
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
		Name: "Dyn", Consoles: []string{"ps5"}, PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}},
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Fix", Consoles: []string{"ps5"}, PriceMode: "fixed", Active: true,
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

func TestListGames_FilterByConsole(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	if _, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "PS only", Consoles: []string{"ps5"}, PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}},
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Xbox only", Consoles: []string{"xbox_series"}, PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{{Platform: "xbox_series", BaseUSD: 50}},
	}); err != nil {
		t.Fatal(err)
	}

	games, total, err := listGames(ctx, db, listFilter{platform: "xbox_series"}, "created_at DESC", 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 || len(games) != 1 || games[0].Name != "Xbox only" {
		t.Fatalf("xbox filter = %d games (total %d), want just 'Xbox only'", len(games), total)
	}
}

func TestListGames_FilterReturnable(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	for _, game := range []normalizedGame{
		{Name: "Returnable", Consoles: []string{"ps5"}, PriceMode: "dynamic", Active: true, Returnable: true,
			BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}}},
		{Name: "Final sale", Consoles: []string{"ps5"}, PriceMode: "dynamic", Active: true, Returnable: false,
			BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}}},
	} {
		if _, err := createGame(ctx, db, "a1", game); err != nil {
			t.Fatal(err)
		}
	}

	got, total, err := listGames(ctx, db, listFilter{onlyActive: true, onlyReturnable: true}, "created_at DESC", 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 || len(got) != 1 || got[0].Name != "Returnable" {
		t.Fatalf("returnable filter = %#v (total %d), want only Returnable", got, total)
	}
}

func TestListRelatedGames_PrefersSharedTagsAndConsole(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	ids := map[string]string{}
	for _, game := range []normalizedGame{
		{Name: "Source", Consoles: []string{"ps5"}, PriceMode: "dynamic", Active: true, Tags: []string{"اکشن", "داستانی"}, BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}}},
		{Name: "Best match", Consoles: []string{"ps5"}, PriceMode: "dynamic", Active: true, Tags: []string{"اکشن", "داستانی"}, BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 40}}},
		{Name: "Other", Consoles: []string{"xbox_series"}, PriceMode: "dynamic", Active: true, Tags: []string{"ورزشی"}, BasePrices: []normalizedBasePrice{{Platform: "xbox_series", BaseUSD: 30}}},
	} {
		id, err := createGame(ctx, db, "a1", game)
		if err != nil {
			t.Fatal(err)
		}
		ids[game.Name] = id
	}

	source, err := getGameByID(ctx, db, ids["Source"], true)
	if err != nil || source == nil {
		t.Fatalf("get source: game=%v err=%v", source, err)
	}
	related, err := listRelatedGames(ctx, db, *source, 4)
	if err != nil {
		t.Fatal(err)
	}
	if len(related) != 2 || related[0].Name != "Best match" {
		t.Fatalf("related order = %#v, want Best match first", related)
	}
}

func TestListGames_FilterBySellableConsoleCapacityPair(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	price := 1_000_000
	games := []normalizedGame{
		{
			Name: "PS4 Z1 dynamic", Consoles: []string{"ps4"}, PriceMode: "dynamic", Active: true,
			BasePrices: []normalizedBasePrice{{Platform: "ps4", BaseUSD: 50, Capacities: []string{"z1"}}},
		},
		{
			Name: "PS4 Z2 dynamic", Consoles: []string{"ps4"}, PriceMode: "dynamic", Active: true,
			BasePrices: []normalizedBasePrice{{Platform: "ps4", BaseUSD: 50, Capacities: []string{"z2"}}},
		},
		{
			Name: "Xbox Home fixed", Consoles: []string{"xbox_series"}, PriceMode: "fixed", Active: true,
			Prices: []normalizedPrice{{Platform: "xbox_series", Zarfiat: "home", PriceToman: price}},
		},
		{
			// This is the important cross-console case: both products are valid for
			// the game, but PS4+Home and Xbox+Z1 are not valid products.
			Name: "PS4 and Xbox mixed", Consoles: []string{"ps4", "xbox_series"}, PriceMode: "fixed", Active: true,
			Prices: []normalizedPrice{
				{Platform: "ps4", Zarfiat: "z1", PriceToman: price},
				{Platform: "xbox_series", Zarfiat: "home", PriceToman: price},
			},
		},
	}
	for _, game := range games {
		if _, err := createGame(ctx, db, "a1", game); err != nil {
			t.Fatalf("create %q: %v", game.Name, err)
		}
	}

	assertNames := func(filter listFilter, want ...string) {
		t.Helper()
		got, total, err := listGames(ctx, db, filter, "created_at DESC", 50, 0)
		if err != nil {
			t.Fatal(err)
		}
		if total != len(want) || len(got) != len(want) {
			t.Fatalf("filter %+v = %d games (total %d), want %d", filter, len(got), total, len(want))
		}
		gotNames := make(map[string]bool, len(got))
		for _, game := range got {
			gotNames[game.Name] = true
		}
		for _, name := range want {
			if !gotNames[name] {
				t.Errorf("filter %+v missing %q; got %#v", filter, name, gotNames)
			}
		}
	}

	// Dynamic capacity allow-lists must participate in filtering.
	assertNames(listFilter{platform: "ps4", zarfiat: "z1", onlyActive: true},
		"PS4 Z1 dynamic", "PS4 and Xbox mixed")
	assertNames(listFilter{platform: "ps4", zarfiat: "z2", onlyActive: true},
		"PS4 Z2 dynamic")
	assertNames(listFilter{zarfiat: "z1", onlyActive: true},
		"PS4 Z1 dynamic", "PS4 and Xbox mixed")

	// A capacity on another console must never satisfy the selected pair, even
	// when the same game independently sells products for both consoles.
	assertNames(listFilter{platform: "ps4", zarfiat: "home", onlyActive: true})
	assertNames(listFilter{platform: "xbox_series", zarfiat: "z1", onlyActive: true})
	assertNames(listFilter{platform: "xbox_series", zarfiat: "home", onlyActive: true},
		"Xbox Home fixed", "PS4 and Xbox mixed")
}

func TestCreateGame_DuplicateLink(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	base := normalizedGame{Name: "G", Consoles: []string{"ps5"}, PriceMode: "dynamic",
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
		Name: "Original", Consoles: []string{"ps4", "ps5"}, PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{{Platform: "ps4", BaseUSD: 20}, {Platform: "ps5", BaseUSD: 25}},
		Links:      []string{"https://a.example.com"},
	})
	if err != nil {
		t.Fatal(err)
	}

	// Switch to a fixed-price PS5 game, set pre-order + alert.
	releaseDate := time.Now().UTC().Add(10 * 24 * time.Hour).Truncate(time.Second)
	err = updateGame(ctx, db, "a1", id, normalizedGame{
		Name: "Renamed", Consoles: []string{"ps5"}, PriceMode: "fixed", Active: false,
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
	if g.Name != "Renamed" || len(g.Consoles) != 1 || g.Consoles[0] != "ps5" || g.PriceMode != "fixed" || g.Active {
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

func TestUpdateGame_ReplacesAndClearsPreorderDate(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	firstDate := time.Date(2026, time.September, 25, 0, 0, 0, 0, time.UTC)
	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Preorder", Slug: "preorder", Consoles: []string{"ps5"},
		PriceMode: "dynamic", Active: true, ReleaseStatus: release.StatusPreOrder,
		ReleaseDate: &firstDate,
		BasePrices:  []normalizedBasePrice{{Platform: "ps5", BaseUSD: 70}},
		Links:       []string{"https://store.example.com/preorder"},
	})
	if err != nil {
		t.Fatal(err)
	}

	replacement := time.Date(2026, time.October, 2, 0, 0, 0, 0, time.UTC)
	input := normalizedGame{
		Name: "Preorder", Slug: "preorder", Consoles: []string{"ps5"},
		PriceMode: "dynamic", Active: true, ReleaseStatus: release.StatusPreOrder,
		ReleaseDate: &replacement,
		BasePrices:  []normalizedBasePrice{{Platform: "ps5", BaseUSD: 70}},
		Links:       []string{"https://store.example.com/preorder"},
	}
	if err := updateGame(ctx, db, "a1", id, input); err != nil {
		t.Fatal(err)
	}
	game, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	if game.ReleaseDate == nil || !game.ReleaseDate.Equal(replacement) {
		t.Fatalf("replacement release_date = %v, want %v", game.ReleaseDate, replacement)
	}

	input.ReleaseDate = nil
	if err := updateGame(ctx, db, "a1", id, input); err != nil {
		t.Fatal(err)
	}
	game, err = getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	if game.ReleaseDate != nil {
		t.Fatalf("cleared release_date = %v, want nil", game.ReleaseDate)
	}
}

func TestUpdateGame_NotFound(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")
	err := updateGame(ctx, db, "a1", "missing", normalizedGame{Name: "X", Consoles: []string{"ps5"}, PriceMode: "dynamic"})
	if !errors.Is(err, ErrGameNotFound) {
		t.Fatalf("got %v, want ErrGameNotFound", err)
	}
}

func TestDeleteGame(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Doomed", Consoles: []string{"ps5"}, PriceMode: "dynamic",
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

	var bases, links, consoles int
	db.QueryRow(ctx, "SELECT COUNT(*) FROM game_base_prices WHERE game_id = $1", id).Scan(&bases)
	db.QueryRow(ctx, "SELECT COUNT(*) FROM game_links WHERE game_id = $1", id).Scan(&links)
	db.QueryRow(ctx, "SELECT COUNT(*) FROM game_consoles WHERE game_id = $1", id).Scan(&consoles)
	if bases != 0 || links != 0 || consoles != 0 {
		t.Fatalf("children not cascaded: bases=%d links=%d consoles=%d", bases, links, consoles)
	}

	if err := deleteGame(ctx, db, "a1", id); !errors.Is(err, ErrGameNotFound) {
		t.Fatalf("delete again: got %v, want ErrGameNotFound", err)
	}
}

func TestSetPricingConfig(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	// The seeded catalog has ps5 with z1/z2/z3. Set the rate and tweak ps5's margin.
	ps5 := []consoleConfigInput{{
		Code: "ps5", DefaultMarginPct: 12,
		Capacities: []capacityConfigInput{
			{Code: "z1", SplitPct: 15}, {Code: "z2", SplitPct: 60}, {Code: "z3", SplitPct: 25},
		},
	}}
	if err := setPricingConfig(ctx, db, "a1", 90000, ps5); err != nil {
		t.Fatal(err)
	}

	rate, err := pricing.LoadRate(ctx, db)
	if err != nil || rate != 90000 {
		t.Fatalf("rate = %d err=%v, want 90000", rate, err)
	}
	cat, err := pricing.LoadCatalog(ctx, db)
	if err != nil {
		t.Fatal(err)
	}
	cn, ok := cat.Console("ps5")
	if !ok || cn.DefaultMarginPct != 12 {
		t.Fatalf("ps5 margin = %d ok=%v, want 12", cn.DefaultMarginPct, ok)
	}

	if err := setPricingConfig(ctx, db, "a1", 0, ps5); !errors.Is(err, ErrRateInvalid) {
		t.Fatalf("zero rate: got %v, want ErrRateInvalid", err)
	}

	bad := []consoleConfigInput{{Code: "ps5", DefaultMarginPct: 10,
		Capacities: []capacityConfigInput{
			{Code: "z1", SplitPct: 10}, {Code: "z2", SplitPct: 60}, {Code: "z3", SplitPct: 25}, // sums 95
		}}}
	if err := setPricingConfig(ctx, db, "a1", 90000, bad); !errors.Is(err, ErrSplitInvalid) {
		t.Fatalf("bad split: got %v, want ErrSplitInvalid", err)
	}
}

func TestValidateGameInput(t *testing.T) {
	// A literal catalog keeps this a pure unit test (no DB).
	catalog := psCatalog()

	good := gameInput{
		Name: "Valid", Consoles: []string{"ps4", "ps5"}, PriceMode: "dynamic", Active: true,
		BasePrices: []basePriceInput{{Platform: "ps4", BaseUSD: 10}, {Platform: "ps5", BaseUSD: 12}},
		Links:      []string{"https://ok.example.com", " https://ok.example.com ", ""},
	}
	out, msg, ok := validateGameInput(good, catalog)
	if !ok {
		t.Fatalf("valid input rejected: %q", msg)
	}
	if len(out.Links) != 1 || len(out.BasePrices) != 2 || len(out.Consoles) != 2 {
		t.Fatalf("not normalized: links=%+v bases=%+v consoles=%+v", out.Links, out.BasePrices, out.Consoles)
	}

	cases := []struct {
		name string
		in   gameInput
	}{
		{"empty name", gameInput{Name: "  ", Consoles: []string{"ps5"}, PriceMode: "dynamic"}},
		{"no consoles", gameInput{Name: "X", Consoles: nil, PriceMode: "dynamic"}},
		{"bad console", gameInput{Name: "X", Consoles: []string{"switch"}, PriceMode: "dynamic"}},
		{"bad mode", gameInput{Name: "X", Consoles: []string{"ps5"}, PriceMode: "barter"}},
		{"dynamic console mismatch", gameInput{Name: "X", Consoles: []string{"ps5"}, PriceMode: "dynamic",
			BasePrices: []basePriceInput{{Platform: "ps4", BaseUSD: 10}}}},
		{"dynamic zero base", gameInput{Name: "X", Consoles: []string{"ps5"}, PriceMode: "dynamic",
			BasePrices: []basePriceInput{{Platform: "ps5", BaseUSD: 0}}}},
		{"dynamic dup console", gameInput{Name: "X", Consoles: []string{"ps5"}, PriceMode: "dynamic",
			BasePrices: []basePriceInput{{Platform: "ps5", BaseUSD: 10}, {Platform: "ps5", BaseUSD: 11}}}},
		{"fixed missing toman", gameInput{Name: "X", Consoles: []string{"ps5"}, PriceMode: "fixed",
			Prices: []priceInput{{Platform: "ps5", Zarfiat: "z2", PriceToman: nil}}}},
		{"fixed bad zarfiat", gameInput{Name: "X", Consoles: []string{"ps5"}, PriceMode: "fixed",
			Prices: []priceInput{{Platform: "ps5", Zarfiat: "z9", PriceToman: iptr(100)}}}},
		{"bad link", gameInput{Name: "X", Consoles: []string{"ps5"}, PriceMode: "dynamic",
			Links: []string{"ftp://nope"}}},
		{"seo title too long", gameInput{Name: "X", Consoles: []string{"ps5"}, PriceMode: "dynamic",
			SEOTitle: sptr(strings.Repeat("x", maxSEOTitleLen+1))}},
		{"description too long", gameInput{Name: "X", Consoles: []string{"ps5"}, PriceMode: "dynamic",
			DescriptionMarkdown: strings.Repeat("x", maxDescriptionMarkdownLen+1)}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if _, msg, ok := validateGameInput(c.in, catalog); ok {
				t.Fatalf("expected rejection, got ok (msg=%q)", msg)
			}
		})
	}
}
