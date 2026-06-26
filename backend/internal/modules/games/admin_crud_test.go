package games

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/soltanmohammdi/z-games/internal/shared/release"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func sptr(s string) *string   { return &s }
func iptr(i int) *int         { return &i }
func fptr(f float64) *float64 { return &f }

func TestCreateGame(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	in := normalizedGame{
		Name:       "New Game",
		Platform:   "ps4_ps5",
		PriceMode:  "dynamic",
		Active:     true,
		CoverImage: sptr("/uploads/cover.jpg"),
		Prices: []normalizedPrice{
			{Platform: "ps4", Zarfiat: "z2", PriceUSD: fptr(49.99), Slots: iptr(2)},
			{Platform: "ps5", Zarfiat: "z3", PriceUSD: fptr(39.99)},
		},
		Links: []string{"https://store.example.com/new-game"},
	}
	id, err := createGame(ctx, db, "a1", in)
	if err != nil {
		t.Fatal(err)
	}

	g, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	if g.Name != "New Game" || g.Platform != "ps4_ps5" || g.PriceMode != "dynamic" || !g.Active {
		t.Fatalf("core fields wrong: %+v", g)
	}
	if g.CoverImage == nil || *g.CoverImage != "/uploads/cover.jpg" {
		t.Fatalf("cover = %v", g.CoverImage)
	}
	if len(g.Prices) != 2 || len(g.Links) != 1 {
		t.Fatalf("prices=%d links=%d, want 2/1", len(g.Prices), len(g.Links))
	}
	// A create must leave pre-order/alert at their defaults (managed elsewhere).
	if g.ReleaseStatus != release.StatusReleased || g.ReleaseDate != nil || g.AlertMessage != nil {
		t.Fatalf("create should not set release/alert: status=%q date=%v alert=%v",
			g.ReleaseStatus, g.ReleaseDate, g.AlertMessage)
	}

	var auditN int
	if err := db.QueryRow(ctx,
		"SELECT COUNT(*) FROM admin_actions WHERE action = 'game.create' AND target_id = $1", id,
	).Scan(&auditN); err != nil {
		t.Fatal(err)
	}
	if auditN != 1 {
		t.Fatalf("audit rows = %d, want 1", auditN)
	}
}

func TestCreateGame_DuplicateLink(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	base := normalizedGame{Name: "G", Platform: "ps5", PriceMode: "dynamic",
		Links: []string{"https://dup.example.com/x"}}
	if _, err := createGame(ctx, db, "a1", base); err != nil {
		t.Fatal(err)
	}
	if _, err := createGame(ctx, db, "a1", base); !errors.Is(err, ErrDuplicateLink) {
		t.Fatalf("second create: got %v, want ErrDuplicateLink", err)
	}
}

func TestUpdateGame_ReplacesChildrenAndSetsReleaseAlert(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Original", Platform: "ps4_ps5", PriceMode: "dynamic", Active: true,
		Prices: []normalizedPrice{{Platform: "ps4", Zarfiat: "z2", PriceUSD: fptr(20)}},
		Links:  []string{"https://a.example.com"},
	})
	if err != nil {
		t.Fatal(err)
	}

	// The form carries the full state, so an edit sets the game's release lifecycle
	// and alert alongside its definition (children fully replaced).
	releaseDate := time.Now().UTC().Add(10 * 24 * time.Hour).Truncate(time.Second)
	err = updateGame(ctx, db, "a1", id, normalizedGame{
		Name: "Renamed", Platform: "ps5", PriceMode: "fixed", Active: false,
		ReleaseStatus: release.StatusPreOrder, ReleaseDate: &releaseDate,
		AlertMessage: sptr("نگه‌داری"), AlertVariant: sptr("warning"),
		Prices: []normalizedPrice{{Platform: "ps5", Zarfiat: "z3", PriceToman: iptr(1500000)}},
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
	if len(g.Prices) != 1 || g.Prices[0].Zarfiat != "z3" || len(g.Links) != 2 {
		t.Fatalf("children not replaced: prices=%+v links=%d", g.Prices, len(g.Links))
	}
	if g.ReleaseStatus != release.StatusPreOrder || g.ReleaseDate == nil || !g.ReleaseDate.Equal(releaseDate) {
		t.Fatalf("pre-order not set: status=%q date=%v", g.ReleaseStatus, g.ReleaseDate)
	}
	if g.AlertMessage == nil || *g.AlertMessage != "نگه‌داری" || g.AlertVariant == nil || *g.AlertVariant != "warning" {
		t.Fatalf("alert not set: msg=%v variant=%v", g.AlertMessage, g.AlertVariant)
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
		Prices: []normalizedPrice{{Platform: "ps5", Zarfiat: "z2", PriceUSD: fptr(10)}},
		Links:  []string{"https://d.example.com"},
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

	// Children cascade away.
	var prices, links int
	db.QueryRow(ctx, "SELECT COUNT(*) FROM game_prices WHERE game_id = $1", id).Scan(&prices)
	db.QueryRow(ctx, "SELECT COUNT(*) FROM game_links WHERE game_id = $1", id).Scan(&links)
	if prices != 0 || links != 0 {
		t.Fatalf("children not cascaded: prices=%d links=%d", prices, links)
	}

	if err := deleteGame(ctx, db, "a1", id); !errors.Is(err, ErrGameNotFound) {
		t.Fatalf("delete again: got %v, want ErrGameNotFound", err)
	}
}

func TestSetExchangeRate(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	if err := setExchangeRate(ctx, db, "a1", 90000); err != nil {
		t.Fatal(err)
	}
	r, _ := getExchangeRate(ctx, db)
	if r == nil || r.USDToToman != 90000 {
		t.Fatalf("rate = %v, want 90000", r)
	}
	// Upsert to a new value.
	if err := setExchangeRate(ctx, db, "a1", 95000); err != nil {
		t.Fatal(err)
	}
	r, _ = getExchangeRate(ctx, db)
	if r.USDToToman != 95000 {
		t.Fatalf("rate = %d, want 95000", r.USDToToman)
	}
	if err := setExchangeRate(ctx, db, "a1", 0); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("zero rate: got %v, want ErrInvalidInput", err)
	}
}

func TestValidateGameInput(t *testing.T) {
	good := gameInput{
		Name: "Valid", Platform: "ps4_ps5", PriceMode: "dynamic", Active: true,
		Prices: []priceInput{{Platform: "ps4", Zarfiat: "z2", PriceUSD: fptr(10)}},
		Links:  []string{"https://ok.example.com", " https://ok.example.com ", ""},
	}
	out, msg, ok := validateGameInput(good)
	if !ok {
		t.Fatalf("valid input rejected: %q", msg)
	}
	if len(out.Links) != 1 { // trimmed + deduped + blank dropped
		t.Fatalf("links not normalized: %+v", out.Links)
	}

	cases := []struct {
		name string
		in   gameInput
	}{
		{"empty name", gameInput{Name: "  ", Platform: "ps5", PriceMode: "dynamic"}},
		{"bad platform", gameInput{Name: "X", Platform: "switch", PriceMode: "dynamic"}},
		{"bad mode", gameInput{Name: "X", Platform: "ps5", PriceMode: "barter"}},
		{"console mismatch", gameInput{Name: "X", Platform: "ps5", PriceMode: "dynamic",
			Prices: []priceInput{{Platform: "ps4", Zarfiat: "z2", PriceUSD: fptr(10)}}}},
		{"bad zarfiat", gameInput{Name: "X", Platform: "ps5", PriceMode: "dynamic",
			Prices: []priceInput{{Platform: "ps5", Zarfiat: "z9", PriceUSD: fptr(10)}}}},
		{"dup cell", gameInput{Name: "X", Platform: "ps5", PriceMode: "dynamic",
			Prices: []priceInput{
				{Platform: "ps5", Zarfiat: "z2", PriceUSD: fptr(10)},
				{Platform: "ps5", Zarfiat: "z2", PriceUSD: fptr(11)},
			}}},
		{"dynamic missing usd", gameInput{Name: "X", Platform: "ps5", PriceMode: "dynamic",
			Prices: []priceInput{{Platform: "ps5", Zarfiat: "z2", PriceToman: iptr(100)}}}},
		{"fixed missing toman", gameInput{Name: "X", Platform: "ps5", PriceMode: "fixed",
			Prices: []priceInput{{Platform: "ps5", Zarfiat: "z2", PriceUSD: fptr(10)}}}},
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
