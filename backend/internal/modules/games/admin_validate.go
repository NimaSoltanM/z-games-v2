package games

import (
	"strings"
	"time"

	"github.com/soltanmohammdi/z-games/internal/shared/release"
)

// gameInput is the raw create/update payload from an admin. Dynamic games carry
// base_prices (one USD price per console) + an optional margin override; fixed
// games carry per-tier Toman prices.
type gameInput struct {
	Name            string           `json:"name"`
	Slug            string           `json:"slug"`
	Platform        string           `json:"platform"`
	PriceMode       string           `json:"price_mode"`
	CoverImage      *string          `json:"cover_image"`
	Active          bool             `json:"active"`
	Featured        bool             `json:"featured"`
	Tags            []string         `json:"tags"`
	ReleaseStatus   string           `json:"release_status"`
	ReleaseDate     *string          `json:"release_date"`
	AlertMessage    *string          `json:"alert_message"`
	AlertVariant    *string          `json:"alert_variant"`
	ProfitMarginPct *int             `json:"profit_margin_pct"`
	BasePrices      []basePriceInput `json:"base_prices"`
	Prices          []priceInput     `json:"prices"`
	Links           []string         `json:"links"`
}

type basePriceInput struct {
	Platform string  `json:"platform"`
	BaseUSD  float64 `json:"base_usd"`
}

type priceInput struct {
	Platform   string `json:"platform"`
	Zarfiat    string `json:"zarfiat"`
	PriceToman *int   `json:"price_toman"`
	Slots      *int   `json:"slots"`
}

// normalizedGame is the cleaned, validated form ready for the DB.
type normalizedGame struct {
	Name            string
	Slug            string
	Platform        string
	PriceMode       string
	CoverImage      *string
	Active          bool
	Featured        bool
	Tags            []string
	ReleaseStatus   string
	ReleaseDate     *time.Time
	AlertMessage    *string
	AlertVariant    *string
	ProfitMarginPct *int
	BasePrices      []normalizedBasePrice // dynamic only
	Prices          []normalizedPrice     // fixed only
	Links           []string
}

type normalizedBasePrice struct {
	Platform string
	BaseUSD  float64
}

type normalizedPrice struct {
	Platform   string
	Zarfiat    string
	PriceToman int
	Slots      *int
}

const (
	maxNameLen    = 200
	maxCoverLen   = 500
	maxAlertLen   = 500
	maxLinkLen    = 500
	maxLinksCount = 20
	maxMarginPct  = 1000
	maxTagsCount  = 20
	maxTagLen     = 40
)

var validZarfiats = map[string]bool{"z1": true, "z2": true, "z3": true}

// consolesFor returns the physical consoles a game's platform can be priced on.
func consolesFor(platform string) []string {
	switch platform {
	case "ps4":
		return []string{"ps4"}
	case "ps5":
		return []string{"ps5"}
	case "ps4_ps5":
		return []string{"ps4", "ps5"}
	default:
		return nil
	}
}

// validateGameInput cleans and validates an admin payload. On failure it returns
// a Persian, user-facing message; ok is false then. The backend is the
// authoritative validator — the frontend mirrors these rules only for UX.
func validateGameInput(in gameInput) (normalizedGame, string, bool) {
	var out normalizedGame

	out.Name = strings.TrimSpace(in.Name)
	if out.Name == "" {
		return out, "نام بازی الزامی است", false
	}
	if len(out.Name) > maxNameLen {
		return out, "نام بازی بیش از حد طولانی است", false
	}

	// Slug: normalize the admin-supplied value; fall back to the name when blank.
	// slugify guarantees a well-formed result, so a remaining empty means the name
	// has no latin characters and the admin must type a slug explicitly.
	out.Slug = slugify(in.Slug)
	if out.Slug == "" {
		out.Slug = slugify(in.Name)
	}
	if out.Slug == "" {
		return out, "نامک (اسلاگ) الزامی است؛ از حروف انگلیسی استفاده کنید", false
	}

	out.Featured = in.Featured

	// Tags double as genres: trim, drop blanks, dedupe (case-insensitively).
	tagSeen := map[string]bool{}
	out.Tags = make([]string, 0, len(in.Tags))
	for _, t := range in.Tags {
		tag := strings.TrimSpace(t)
		if tag == "" {
			continue
		}
		if len(tag) > maxTagLen {
			return out, "برچسب بیش از حد طولانی است", false
		}
		key := strings.ToLower(tag)
		if tagSeen[key] {
			continue
		}
		tagSeen[key] = true
		out.Tags = append(out.Tags, tag)
	}
	if len(out.Tags) > maxTagsCount {
		return out, "تعداد برچسب‌ها بیش از حد مجاز است", false
	}

	consoles := consolesFor(in.Platform)
	if consoles == nil {
		return out, "کنسول نامعتبر است", false
	}
	out.Platform = in.Platform
	allowedConsole := map[string]bool{}
	for _, c := range consoles {
		allowedConsole[c] = true
	}

	if in.PriceMode != "dynamic" && in.PriceMode != "fixed" {
		return out, "نوع قیمت‌گذاری نامعتبر است", false
	}
	out.PriceMode = in.PriceMode

	if in.CoverImage != nil {
		cover := strings.TrimSpace(*in.CoverImage)
		if cover != "" {
			if len(cover) > maxCoverLen {
				return out, "آدرس تصویر نامعتبر است", false
			}
			out.CoverImage = &cover
		}
	}

	out.Active = in.Active

	// Release lifecycle (empty status defaults to released).
	out.ReleaseStatus = in.ReleaseStatus
	if out.ReleaseStatus == "" {
		out.ReleaseStatus = release.StatusReleased
	}
	if out.ReleaseStatus != release.StatusReleased && out.ReleaseStatus != release.StatusPreOrder {
		return out, "وضعیت انتشار نامعتبر است", false
	}
	if in.ReleaseDate != nil && strings.TrimSpace(*in.ReleaseDate) != "" {
		t, err := parseReleaseDate(*in.ReleaseDate)
		if err != nil {
			return out, "تاریخ انتشار نامعتبر است", false
		}
		out.ReleaseDate = &t
	}

	// Optional admin alert.
	if in.AlertMessage != nil && strings.TrimSpace(*in.AlertMessage) != "" {
		msg := strings.TrimSpace(*in.AlertMessage)
		if len(msg) > maxAlertLen {
			return out, "متن اعلان بیش از حد طولانی است", false
		}
		variant := "info"
		if in.AlertVariant != nil && *in.AlertVariant != "" {
			variant = *in.AlertVariant
		}
		if variant != "info" && variant != "warning" {
			return out, "نوع اعلان نامعتبر است", false
		}
		out.AlertMessage = &msg
		out.AlertVariant = &variant
	}

	// Pricing — branches on the mode.
	if in.PriceMode == "dynamic" {
		if in.ProfitMarginPct != nil {
			if *in.ProfitMarginPct < 0 || *in.ProfitMarginPct > maxMarginPct {
				return out, "درصد سود نامعتبر است", false
			}
			out.ProfitMarginPct = in.ProfitMarginPct
		}
		seen := map[string]bool{}
		out.BasePrices = make([]normalizedBasePrice, 0, len(in.BasePrices))
		for _, b := range in.BasePrices {
			if !allowedConsole[b.Platform] {
				return out, "کنسول قیمت با پلتفرم بازی همخوانی ندارد", false
			}
			if seen[b.Platform] {
				return out, "برای هر کنسول فقط یک قیمت پایه مجاز است", false
			}
			seen[b.Platform] = true
			if b.BaseUSD <= 0 {
				return out, "قیمت دلاری باید بزرگ‌تر از صفر باشد", false
			}
			out.BasePrices = append(out.BasePrices, normalizedBasePrice{Platform: b.Platform, BaseUSD: b.BaseUSD})
		}
	} else {
		seen := map[string]bool{}
		out.Prices = make([]normalizedPrice, 0, len(in.Prices))
		for _, p := range in.Prices {
			if !allowedConsole[p.Platform] {
				return out, "کنسول قیمت با پلتفرم بازی همخوانی ندارد", false
			}
			if !validZarfiats[p.Zarfiat] {
				return out, "ظرفیت نامعتبر است", false
			}
			key := p.Platform + "_" + p.Zarfiat
			if seen[key] {
				return out, "برای هر ظرفیت فقط یک قیمت مجاز است", false
			}
			seen[key] = true
			if p.PriceToman == nil || *p.PriceToman <= 0 {
				return out, "قیمت تومانی باید بزرگ‌تر از صفر باشد", false
			}
			np := normalizedPrice{Platform: p.Platform, Zarfiat: p.Zarfiat, PriceToman: *p.PriceToman}
			if p.Slots != nil {
				if *p.Slots < 0 {
					return out, "تعداد ظرفیت نامعتبر است", false
				}
				np.Slots = p.Slots
			}
			out.Prices = append(out.Prices, np)
		}
	}

	// Links: trim, drop blanks, dedupe, require http(s).
	linkSeen := map[string]bool{}
	out.Links = make([]string, 0, len(in.Links))
	for _, l := range in.Links {
		url := strings.TrimSpace(l)
		if url == "" {
			continue
		}
		if len(url) > maxLinkLen || !(strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://")) {
			return out, "آدرس لینک نامعتبر است", false
		}
		if linkSeen[url] {
			continue
		}
		linkSeen[url] = true
		out.Links = append(out.Links, url)
	}
	if len(out.Links) > maxLinksCount {
		return out, "تعداد لینک‌ها بیش از حد مجاز است", false
	}

	return out, "", true
}
