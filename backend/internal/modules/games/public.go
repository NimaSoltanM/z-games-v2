package games

import "time"

// Public response types are deliberately separate from the database/admin
// models. The storefront receives only final Toman prices and display metadata;
// exchange rates, base USD prices, margins, capacity splits, inventory limits,
// and merchandising metrics remain behind the admin guard.
type publicGamePrice struct {
	Platform   string `json:"platform"`
	Zarfiat    string `json:"zarfiat"`
	PriceToman *int   `json:"price_toman"`
}

type publicGameLink struct {
	URL string `json:"url"`
}

type publicGame struct {
	ID                  string            `json:"id"`
	Slug                string            `json:"slug"`
	Name                string            `json:"name"`
	CoverImage          *string           `json:"cover_image"`
	DescriptionMarkdown string            `json:"description_markdown"`
	SEOTitle            *string           `json:"seo_title"`
	SEODescription      *string           `json:"seo_description"`
	Prices              []publicGamePrice `json:"prices"`
	Active              bool              `json:"active"`
	Links               []publicGameLink  `json:"links"`
	Consoles            []string          `json:"consoles"`
	Tags                []string          `json:"tags"`
	ReleaseDate         *time.Time        `json:"release_date"`
	Phase               string            `json:"phase"`
	Purchasable         bool              `json:"purchasable"`
	AlertMessage        *string           `json:"alert_message"`
	AlertVariant        *string           `json:"alert_variant"`
	Discount            *int              `json:"discount"`
	Returnable          bool              `json:"returnable"`
	UpdatedAt           time.Time         `json:"updated_at"`
}

type publicCapacity struct {
	Code      string `json:"code"`
	LabelFA   string `json:"label_fa"`
	SortOrder int    `json:"sort_order"`
}

type publicConsole struct {
	Code       string           `json:"code"`
	Family     string           `json:"family"`
	LabelFA    string           `json:"label_fa"`
	Capacities []publicCapacity `json:"capacities"`
}

type publicPricingResponse struct {
	Consoles []publicConsole `json:"consoles"`
}

func toPublicGame(g gameRow) publicGame {
	prices := make([]publicGamePrice, 0, len(g.Prices))
	for _, price := range g.Prices {
		prices = append(prices, publicGamePrice{
			Platform:   price.Platform,
			Zarfiat:    price.Zarfiat,
			PriceToman: price.PriceToman,
		})
	}

	links := make([]publicGameLink, 0, len(g.Links))
	for _, link := range g.Links {
		links = append(links, publicGameLink{URL: link.URL})
	}

	return publicGame{
		ID:                  g.ID,
		Slug:                g.Slug,
		Name:                g.Name,
		CoverImage:          g.CoverImage,
		DescriptionMarkdown: g.DescriptionMarkdown,
		SEOTitle:            g.SEOTitle,
		SEODescription:      g.SEODescription,
		Prices:              prices,
		Active:              g.Active,
		Links:               links,
		Consoles:            g.Consoles,
		Tags:                g.Tags,
		ReleaseDate:         g.ReleaseDate,
		Phase:               g.Phase,
		Purchasable:         g.Purchasable,
		AlertMessage:        g.AlertMessage,
		AlertVariant:        g.AlertVariant,
		Discount:            g.Discount,
		Returnable:          g.Returnable,
		UpdatedAt:           g.UpdatedAt,
	}
}

func toPublicGames(games []gameRow) []publicGame {
	result := make([]publicGame, 0, len(games))
	for _, game := range games {
		result = append(result, toPublicGame(game))
	}
	return result
}

func toPublicPricing(response pricingResponse) publicPricingResponse {
	consoles := make([]publicConsole, 0, len(response.Consoles))
	for _, console := range response.Consoles {
		capacities := make([]publicCapacity, 0, len(console.Capacities))
		for _, capacity := range console.Capacities {
			capacities = append(capacities, publicCapacity{
				Code:      capacity.Code,
				LabelFA:   capacity.LabelFA,
				SortOrder: capacity.SortOrder,
			})
		}
		consoles = append(consoles, publicConsole{
			Code:       console.Code,
			Family:     console.Family,
			LabelFA:    console.LabelFA,
			Capacities: capacities,
		})
	}
	return publicPricingResponse{Consoles: consoles}
}
