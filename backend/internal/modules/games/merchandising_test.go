package games

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func TestCreateGame_SlugLookupAndUniqueness(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Cyberpunk 2077", Slug: "cyberpunk-2077", Consoles: []string{"ps5"}, PriceMode: "dynamic",
		Active: true, Featured: true, Tags: []string{"اکشن", "آنلاین"},
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 60}},
	})
	if err != nil {
		t.Fatal(err)
	}

	// Resolvable by slug and by id; both return the same game with merchandising set.
	bySlug, err := getGameByIDOrSlug(ctx, db, "cyberpunk-2077", true)
	if err != nil || bySlug == nil {
		t.Fatalf("by slug: %v / %v", bySlug, err)
	}
	byID, err := getGameByIDOrSlug(ctx, db, id, true)
	if err != nil || byID == nil || byID.ID != bySlug.ID {
		t.Fatalf("by id mismatch: %v / %v", byID, err)
	}
	if bySlug.Slug != "cyberpunk-2077" || !bySlug.Featured || len(bySlug.Tags) != 2 {
		t.Fatalf("merchandising not loaded: %+v", bySlug)
	}

	// A second game claiming the same slug is rejected.
	_, err = createGame(ctx, db, "a1", normalizedGame{
		Name: "Other", Slug: "cyberpunk-2077", Consoles: []string{"ps5"}, PriceMode: "dynamic",
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 10}},
	})
	if !errors.Is(err, ErrDuplicateSlug) {
		t.Fatalf("duplicate slug: got %v, want ErrDuplicateSlug", err)
	}
}

func TestUpdateGame_DuplicateSlug(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	mk := func(name, slug string) string {
		id, err := createGame(ctx, db, "a1", normalizedGame{
			Name: name, Slug: slug, Consoles: []string{"ps5"}, PriceMode: "dynamic",
			BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 10}},
		})
		if err != nil {
			t.Fatal(err)
		}
		return id
	}
	mk("First", "first")
	second := mk("Second", "second")

	// Renaming the second game onto the first's slug must fail.
	err := updateGame(ctx, db, "a1", second, normalizedGame{
		Name: "Second", Slug: "first", Consoles: []string{"ps5"}, PriceMode: "dynamic",
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 10}},
	})
	if !errors.Is(err, ErrDuplicateSlug) {
		t.Fatalf("got %v, want ErrDuplicateSlug", err)
	}
}

func TestSetGameDiscount(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Deal", Slug: "deal", Consoles: []string{"ps5"}, PriceMode: "dynamic",
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}},
	})
	if err != nil {
		t.Fatal(err)
	}

	// Start a 20% discount for 7 days.
	if err := setGameDiscount(ctx, db, "a1", id, 20, 7); err != nil {
		t.Fatal(err)
	}
	g, _ := getGameByID(ctx, db, id, false)
	if g.Discount == nil || *g.Discount != 20 {
		t.Fatalf("active discount = %v, want 20", g.Discount)
	}
	if g.DiscountEndsAt == nil || g.DiscountEndsAt.Before(time.Now()) {
		t.Fatalf("discount end not in the future: %v", g.DiscountEndsAt)
	}

	// Stop it before the deadline.
	if err := setGameDiscount(ctx, db, "a1", id, 0, 0); err != nil {
		t.Fatal(err)
	}
	g, _ = getGameByID(ctx, db, id, false)
	if g.Discount != nil || g.DiscountPct != nil || g.DiscountEndsAt != nil {
		t.Fatalf("discount not cleared: %+v", g)
	}

	// Invalid inputs are rejected.
	if err := setGameDiscount(ctx, db, "a1", id, 150, 7); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("over-100%%: got %v, want ErrInvalidInput", err)
	}
	if err := setGameDiscount(ctx, db, "a1", id, 20, 0); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("zero days: got %v, want ErrInvalidInput", err)
	}
	if err := setGameDiscount(ctx, db, "a1", "missing", 20, 7); !errors.Is(err, ErrGameNotFound) {
		t.Fatalf("missing game: got %v, want ErrGameNotFound", err)
	}
}

func TestActiveDiscount(t *testing.T) {
	now := time.Date(2026, 6, 27, 12, 0, 0, 0, time.UTC)
	pct := 25
	earlier := now.Add(-time.Hour)
	later := now.Add(time.Hour)

	cases := []struct {
		name             string
		pct              *int
		startsAt, endsAt *time.Time
		want             *int
	}{
		{"no discount", nil, nil, nil, nil},
		{"active window", &pct, &earlier, &later, &pct},
		{"not started", &pct, &later, &later, nil},
		{"already ended", &pct, &earlier, &earlier, nil},
		{"ends exactly now is over", &pct, &earlier, &now, nil},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := activeDiscount(c.pct, c.startsAt, c.endsAt, now)
			if (got == nil) != (c.want == nil) || (got != nil && *got != *c.want) {
				t.Fatalf("got %v, want %v", got, c.want)
			}
		})
	}
}

func TestTrendingScore(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Hot", Slug: "hot", Consoles: []string{"ps5"}, PriceMode: "dynamic",
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}},
	})
	if err != nil {
		t.Fatal(err)
	}

	var orderID string
	if err := db.QueryRow(ctx,
		"INSERT INTO orders (user_id, amount, status) VALUES ('a1', 1000, 'paid') RETURNING id",
	).Scan(&orderID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx,
		"INSERT INTO order_items (order_id, game_id, game_name, platform, zarfiat, quantity) VALUES ($1, $2, 'Hot', 'ps5', 'z2', 3)",
		orderID, id,
	); err != nil {
		t.Fatal(err)
	}

	g, err := getGameByID(ctx, db, id, false)
	if err != nil {
		t.Fatal(err)
	}
	// 3 recent units; no views yet.
	if g.TrendingScore != 3 {
		t.Fatalf("trending score = %v, want 3", g.TrendingScore)
	}

	// A pending (unpaid) order must not count toward trending.
	var pending string
	db.QueryRow(ctx, "INSERT INTO orders (user_id, amount, status) VALUES ('a1', 1000, 'pending') RETURNING id").Scan(&pending)
	db.Exec(ctx, "INSERT INTO order_items (order_id, game_id, game_name, platform, zarfiat, quantity) VALUES ($1, $2, 'Hot', 'ps5', 'z2', 5)", pending, id)
	g, _ = getGameByID(ctx, db, id, false)
	if g.TrendingScore != 3 {
		t.Fatalf("pending order leaked into trending: %v", g.TrendingScore)
	}
}

func TestBumpViewCountAndSlugTaken(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "Viewed", Slug: "viewed", Consoles: []string{"ps5"}, PriceMode: "dynamic",
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 50}},
	})
	if err != nil {
		t.Fatal(err)
	}

	// Bumping by slug and by id both count.
	if err := bumpViewCount(ctx, db, "viewed"); err != nil {
		t.Fatal(err)
	}
	if err := bumpViewCount(ctx, db, id); err != nil {
		t.Fatal(err)
	}
	g, _ := getGameByID(ctx, db, id, false)
	if g.ViewCount != 2 {
		t.Fatalf("view count = %d, want 2", g.ViewCount)
	}
	// A non-existent identifier is a no-op, not an error.
	if err := bumpViewCount(ctx, db, "nope"); err != nil {
		t.Fatalf("missing bump should be a no-op: %v", err)
	}

	taken, err := slugTaken(ctx, db, "viewed", "")
	if err != nil || !taken {
		t.Fatalf("slug taken: %v / %v", taken, err)
	}
	// Excluding the owning game frees the slug (the edit-self case).
	taken, _ = slugTaken(ctx, db, "viewed", id)
	if taken {
		t.Fatal("slug should be free when excluding its own game")
	}
	taken, _ = slugTaken(ctx, db, "free-slug", "")
	if taken {
		t.Fatal("unused slug reported as taken")
	}
}

func TestValidateGameInput_SlugTagsFeatured(t *testing.T) {
	// Slug is normalized from a messy admin value; tags are trimmed + deduped.
	out, msg, ok := validateGameInput(gameInput{
		Name: "Game", Slug: "  My Cool Game! ", Consoles: []string{"ps5"}, PriceMode: "dynamic",
		Featured: true, Tags: []string{" اکشن ", "اکشن", "", "Online"},
		BasePrices: []basePriceInput{{Platform: "ps5", BaseUSD: 10}},
	}, psCatalog())
	if !ok {
		t.Fatalf("rejected valid input: %q", msg)
	}
	if out.Slug != "my-cool-game" {
		t.Fatalf("slug = %q, want my-cool-game", out.Slug)
	}
	if !out.Featured || len(out.Tags) != 2 {
		t.Fatalf("featured/tags wrong: featured=%v tags=%+v", out.Featured, out.Tags)
	}

	// Blank slug falls back to the name.
	out, _, ok = validateGameInput(gameInput{
		Name: "Fallback Name", Consoles: []string{"ps5"}, PriceMode: "dynamic",
		BasePrices: []basePriceInput{{Platform: "ps5", BaseUSD: 10}},
	}, psCatalog())
	if !ok || out.Slug != "fallback-name" {
		t.Fatalf("name fallback slug = %q, want fallback-name", out.Slug)
	}

	// A name with no latin characters and no explicit slug is rejected.
	if _, _, ok := validateGameInput(gameInput{
		Name: "بازی", Consoles: []string{"ps5"}, PriceMode: "dynamic",
		BasePrices: []basePriceInput{{Platform: "ps5", BaseUSD: 10}},
	}, psCatalog()); ok {
		t.Fatal("expected rejection when no slug can be derived")
	}
}
