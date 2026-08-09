package games

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/soltanmohammdi/z-games/internal/shared/pricing"
)

func TestPublicGameOmitsInternalPricingAndMerchandisingFields(t *testing.T) {
	price := 1_250_000
	baseUSD := "19.99"
	margin := 12
	viewCount := 500
	game := gameRow{
		ID:                  "public-game-id",
		Slug:                "test-game",
		Name:                "Test Game",
		DescriptionMarkdown: "description",
		PriceMode:           "dynamic",
		Prices: []gamePriceRow{{
			ID:         "internal-price-id",
			Platform:   "ps5",
			Zarfiat:    "z2",
			PriceUSD:   &baseUSD,
			PriceToman: &price,
			Slots:      &viewCount,
		}},
		Links:           []gameLinkRow{{ID: "internal-link-id", URL: "https://example.com/game"}},
		BasePrices:      []gameBasePriceRow{{Platform: "ps5", BaseUSD: baseUSD}},
		ProfitMarginPct: &margin,
		ViewCount:       viewCount,
		TrendingScore:   42,
	}

	body, err := json.Marshal(toPublicGame(game))
	if err != nil {
		t.Fatal(err)
	}
	jsonBody := string(body)
	for _, key := range []string{
		"price_mode",
		"price_usd",
		"base_prices",
		"profit_margin_pct",
		"slots",
		"view_count",
		"trending_score",
		"discount_pct",
		"discount_starts_at",
		"discount_ends_at",
		"return_fee_pct",
		"return_fee_starts_at",
		"return_fee_ends_at",
		"return_fee",
	} {
		if strings.Contains(jsonBody, `"`+key+`"`) {
			t.Errorf("public game JSON contains internal key %q: %s", key, jsonBody)
		}
	}
	if strings.Contains(jsonBody, "internal-price-id") || strings.Contains(jsonBody, "internal-link-id") {
		t.Fatalf("public game JSON contains nested internal identifiers: %s", jsonBody)
	}
	if !strings.Contains(jsonBody, `"price_toman":1250000`) {
		t.Fatalf("public game JSON does not contain the final Toman price: %s", jsonBody)
	}
}

func TestPublicPricingOmitsRateMarginsAndSplits(t *testing.T) {
	rate := 190_000
	response := pricingResponse{
		USDToToman: &rate,
		Consoles: []pricing.Console{{
			Code:             "ps5",
			Family:           "playstation",
			LabelFA:          "پلی‌استیشن ۵",
			DefaultMarginPct: 12,
			Capacities: []pricing.Capacity{{
				Code:      "z2",
				LabelFA:   "ظرفیت ۲",
				SplitPct:  60,
				SortOrder: 2,
			}},
		}},
	}

	body, err := json.Marshal(toPublicPricing(response))
	if err != nil {
		t.Fatal(err)
	}
	jsonBody := string(body)
	for _, key := range []string{"usd_to_toman", "default_margin_pct", "split_pct"} {
		if strings.Contains(jsonBody, `"`+key+`"`) {
			t.Errorf("public pricing JSON contains internal key %q: %s", key, jsonBody)
		}
	}
	if !strings.Contains(jsonBody, `"label_fa":"پلی‌استیشن ۵"`) {
		t.Fatalf("public pricing JSON lost display metadata: %s", jsonBody)
	}
}
