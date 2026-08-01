export type PriceMode = "dynamic" | "fixed"

// Console + capacity codes are arbitrary catalog strings now (ps5, xbox_series,
// z2, home, …), not fixed enums.
export type ConsolePlatform = string
export type Zarfiat = string

// Stored release status vs. the phase the backend derives from it + the release
// date. The frontend reads `phase`/`purchasable`; it never re-derives the dates.
export type ReleaseStatus = "released" | "pre_order"
type GamePhase = "released" | "pre_order" | "closing_soon"
export type AlertVariant = "info" | "warning"

type GameLink = {
  id: string
  url: string
}

export type GamePrice = {
  id: string
  platform: ConsolePlatform
  zarfiat: Zarfiat
  price_usd: string | null
  price_toman: number | null
  slots: number | null
}

type GameBasePrice = {
  platform: ConsolePlatform
  base_usd: string
}

export type Game = {
  id: string
  slug: string
  name: string
  cover_image: string | null
  description_markdown: string
  seo_title: string | null
  seo_description: string | null
  // Consoles the game is sold on (ps5, xbox_series, …), ordered for display.
  // Availability is this set; the old single `platform` enum is gone.
  consoles: string[]
  price_mode: PriceMode
  prices: GamePrice[]
  base_prices: GameBasePrice[]
  profit_margin_pct: number | null
  active: boolean
  links: GameLink[]
  release_status: ReleaseStatus
  release_date: string | null
  phase: GamePhase
  purchasable: boolean
  alert_message: string | null
  alert_variant: AlertVariant | null
  // Merchandising. `featured` is a manual editorial flag; `tags` double as genres.
  featured: boolean
  tags: string[]
  view_count: number
  // Buy-back: whether customers may return accounts of this game, plus the optional
  // reduced-fee window. `return_fee` is the fee percent in effect right now.
  returnable: boolean
  return_fee: number | null
  return_fee_pct: number | null
  return_fee_starts_at: string | null
  return_fee_ends_at: string | null
  // `discount` is the percent in effect right now (null when no active discount);
  // the *_at fields describe the stored window. `trending_score` is computed.
  discount: number | null
  discount_pct: number | null
  discount_starts_at: string | null
  discount_ends_at: string | null
  trending_score: number
  created_at: string
  updated_at: string
}

// A capacity (sellable slot) within a console, with its split percentage.
type Capacity = {
  code: string
  label_fa: string
  split_pct: number
  sort_order: number
}

// A console the store sells on, with its default margin and capacity catalog.
export type Console = {
  code: string
  family: string
  label_fa: string
  default_margin_pct: number
  capacities: Capacity[]
}

// The "exchange_rate" object: the USD→Toman rate (null until set) plus the live
// console/capacity catalog the storefront + admin screens read labels and pricing
// from. The catalog is always present.
export type ExchangeRate = {
  usd_to_toman: number | null
  consoles: Console[]
} | null

export type GamesParams = {
  page?: number
  limit?: number
  platform?: string
  zarfiat?: string
  search?: string
  sort?: string
  featured?: boolean
  returnable?: boolean
}

export type GamesListResponse = {
  games: Game[]
  exchange_rate: ExchangeRate
}

export type PaginatedGamesResponse = {
  games: Game[]
  exchange_rate: ExchangeRate
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export type GameDetailResponse = {
  game: Game
  exchange_rate: ExchangeRate
}

// --- admin create/edit payloads --------------------------------------------

export type GamePriceInput = {
  platform: ConsolePlatform
  zarfiat: Zarfiat
  price_toman: number | null
  slots: number | null
}

export type GameBasePriceInput = {
  platform: ConsolePlatform
  base_usd: number
  // Capacities sold for this console (dynamic). Empty = all of the console's caps.
  capacities: string[]
}

// The full game payload an admin submits from the form. `active` doubles as the
// draft (false) / published (true) flag. Dynamic games send base_prices (+ an
// optional margin override); fixed games send per-tier prices.
export type GameFormPayload = {
  name: string
  slug: string
  consoles: string[]
  price_mode: PriceMode
  cover_image: string | null
  description_markdown: string
  seo_title: string | null
  seo_description: string | null
  active: boolean
  featured: boolean
  returnable: boolean
  tags: string[]
  release_status: ReleaseStatus
  release_date: string | null
  alert_message: string | null
  alert_variant: AlertVariant | null
  profit_margin_pct: number | null
  base_prices: GameBasePriceInput[]
  prices: GamePriceInput[]
  links: string[]
}

export type AdminGamesResponse = {
  games: Game[]
  exchange_rate: ExchangeRate
}

export function calcPrice(
  game: Game,
  platform: ConsolePlatform,
  zarfiat: Zarfiat,
  rate: ExchangeRate
): number | null {
  const entry = game.prices.find(
    (p) => p.platform === platform && p.zarfiat === zarfiat
  )
  if (!entry) return null
  if (game.price_mode === "fixed") return entry.price_toman
  if (!entry.price_usd || !rate || rate.usd_to_toman == null) return null
  return Math.round(parseFloat(entry.price_usd) * rate.usd_to_toman)
}

export function cheapestPrice(game: Game, rate: ExchangeRate): number | null {
  let min: number | null = null
  for (const entry of game.prices) {
    const price = calcPrice(game, entry.platform, entry.zarfiat, rate)
    if (price !== null && (min === null || price < min)) min = price
  }
  return min
}

// Applies a game's active discount (game.discount, a percent) to a Toman price,
// rounding to the nearest Toman. Returns the price unchanged when no discount is
// active. Use alongside the original price to show a strike-through + sale price.
export function discountedPrice(
  price: number | null,
  game: Pick<Game, "discount">
): number | null {
  if (price === null || !game.discount) return price
  return Math.round(price * (1 - game.discount / 100))
}

// Mirrors the backend slugify (internal/modules/games/slug.go): lowercase,
// apostrophes dropped, runs of other non-alphanumerics collapsed to single hyphens,
// trimmed, capped at 120. Used to auto-suggest a slug from the game name.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "")
}

export function formatToman(amount: number | null): string {
  if (amount === null) return "—"
  return amount.toLocaleString("fa-IR") + " تومان"
}

// Resolves a game's cover image to a usable <img src>. A stored absolute URL is
// used as-is; a server-relative path is prefixed with the API origin; a missing
// cover falls back to the local brand image.
export function gameCoverSrc(coverImage: string | null): string {
  if (!coverImage) return "/brand/logo-64.webp"
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

  if (/^https?:\/\//i.test(coverImage)) {
    try {
      const parsed = new URL(coverImage)
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        if (parsed.pathname.startsWith("/uploads/")) {
          return `${apiUrl}${parsed.pathname}`
        }
        if (parsed.pathname === "/gta.webp") {
          return "/catalog/gta-card.webp"
        }
        return parsed.pathname
      }
    } catch {
      return coverImage
    }
    return coverImage
  }

  return `${apiUrl}${coverImage}`
}

// Whole days from now until the release date (rounded up). Never negative — a
// past date reads as 0. Used for the pre-order countdown.
export function daysUntilRelease(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

// Release date as a Persian (Jalali) calendar date.
export function formatReleaseDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Static fallback labels for known codes, used on pages that don't load the
// catalog (e.g. order/dashboard views). The API catalog (label_fa) is the source
// of truth where available — see consoleLabel/capacityLabel below.
const CONSOLE_LABEL_FALLBACK: Record<string, string | undefined> = {
  ps4: "PS4",
  ps5: "PS5",
  xbox_one: "Xbox One",
  xbox_series: "Xbox Series X|S",
}

const CAPACITY_LABEL_FALLBACK: Record<string, string | undefined> = {
  z1: "ظرفیت ۱",
  z2: "ظرفیت ۲",
  z3: "ظرفیت ۳",
  home: "Home",
  switch: "Switch",
}

// consoleLabel/capacityLabel resolve a display label, preferring the live catalog
// (label_fa) and falling back to a known static label, then the raw code. Pass the
// exchange_rate when you have it (lists/detail/cart); omit it where you don't.
export function consoleLabel(code: string, rate?: ExchangeRate): string {
  return (
    rate?.consoles.find((c) => c.code === code)?.label_fa ??
    CONSOLE_LABEL_FALLBACK[code] ??
    code
  )
}

export function capacityLabel(code: string, rate?: ExchangeRate): string {
  if (rate) {
    for (const cn of rate.consoles) {
      const cp = cn.capacities.find((c) => c.code === code)
      if (cp) return cp.label_fa
    }
  }
  return CAPACITY_LABEL_FALLBACK[code] ?? code
}

// Short, customer-facing explanation of what each capacity tier means, shown in
// the buy area so a shopper knows what they're choosing.
const CAPACITY_DESC: Record<string, string | undefined> = {
  z1: "تزریق مستقیم بازی؛ بدون گارانتی.",
  z2: "نصب دائمی روی کنسول شما؛ بازی همیشه — حتی آفلاین — در دسترس است.",
  z3: "اجرا روی اکانت ارائه‌شده؛ برای بازی باید آنلاین بمانید.",
  home: "اکانت اصلی روی کنسول شما؛ دسترسی دائمی.",
  switch: "اجرا با ورود به اکانت ارائه‌شده؛ برای بازی باید آنلاین بمانید.",
}

export function capacityDesc(code: string): string {
  return CAPACITY_DESC[code] ?? ""
}

// Label for the third delivered credential, which differs per console family:
// the PSN pass for PlayStation, the two-step verification code for Xbox. Falls
// back to a neutral term for any other console. Used on order/fulfillment views.
export function passcodeLabel(consoleCode: string): string {
  if (consoleCode.startsWith("xbox")) return "کد تأیید دومرحله‌ای"
  if (consoleCode.startsWith("ps")) return "رمز PSN"
  return "کد امنیتی"
}

// Default search params for the games list — used by every "browse games" link
// so they all land on the same unfiltered, newest-first view.
export const GAMES_DEFAULT_SEARCH = {
  page: 1,
  platform: "",
  zarfiat: "",
  search: "",
  sort: "-created_at",
} as const

// Console brand colors, keyed by console code. PlayStation = blue; Xbox = green
// (Xbox One lighter, Xbox Series X|S darker, near the real ~#107C10 brand green).
// Keyed by string so new console codes can be added as the model becomes
// data-driven; callers should fall back to a neutral style for unknown codes.
const PLATFORM_BADGE_CLASS: Record<string, string | undefined> = {
  ps4: "bg-blue-600/15 text-blue-400 border-blue-600/30",
  ps5: "bg-white/8 text-zinc-200 border-white/15",
  xbox_one: "bg-green-400/15 text-green-300 border-green-400/30",
  xbox_series: "bg-green-700/15 text-green-500 border-green-700/30",
}

// Used for accent borders (cart items)
const PLATFORM_ACCENT_CLASS: Record<string, string | undefined> = {
  ps4: "border-r-blue-500/70",
  ps5: "border-r-white/25",
  xbox_one: "border-r-green-400/70",
  xbox_series: "border-r-green-600/40",
}

// Color accessors keyed by console code, with neutral fallbacks so an unknown
// console (e.g. a freshly added one) still renders cleanly.
export function platformBadgeClass(code: string): string {
  return (
    PLATFORM_BADGE_CLASS[code] ?? "bg-muted text-muted-foreground border-border"
  )
}

export function platformAccentClass(code: string): string {
  return PLATFORM_ACCENT_CLASS[code] ?? "border-r-border"
}

// A game can list on up to four consoles; rather than render four badges, we group
// them into one badge per console family (PlayStation / Xbox) with a brand gradient.
const FAMILY_LABEL: Record<string, string | undefined> = {
  playstation: "PlayStation",
  xbox: "Xbox",
}

const FAMILY_BADGE_CLASS: Record<string, string | undefined> = {
  playstation:
    "bg-gradient-to-r from-blue-600/15 to-white/10 text-blue-300 border-blue-400/25",
  xbox: "bg-gradient-to-r from-green-400/15 to-green-700/20 text-green-400 border-green-600/30",
}

// Solid brand color per family — used for the cover glow halo (one per family).
const FAMILY_GLOW_CLASS: Record<string, string | undefined> = {
  playstation: "bg-blue-500",
  xbox: "bg-green-500",
}

// Brand text color per family — used for filter group headers / accents.
const FAMILY_TEXT_CLASS: Record<string, string | undefined> = {
  playstation: "text-blue-400",
  xbox: "text-green-400",
}

function familyFromCode(code: string): string {
  if (code.startsWith("xbox")) return "xbox"
  if (code.startsWith("ps")) return "playstation"
  return code
}

export function familyTextClass(family: string): string {
  return FAMILY_TEXT_CLASS[family] ?? "text-muted-foreground"
}

// Brand dot color per family — a small filled circle used as a quiet console cue.
export function familyDotClass(family: string): string {
  return FAMILY_GLOW_CLASS[family] ?? "bg-muted-foreground"
}

export type FamilyBadge = {
  family: string
  label: string
  className: string
  glow: string
}

// gameFamilies maps a game's console list to its distinct families (in first-seen
// order), each with a display label, a brand gradient (badge) and a solid glow
// color. Prefers the catalog for the family, falling back to the code prefix.
export function gameFamilies(
  consoles: string[],
  rate?: ExchangeRate
): FamilyBadge[] {
  const order: string[] = []
  const seen = new Set<string>()
  for (const code of consoles) {
    const fam =
      rate?.consoles.find((c) => c.code === code)?.family ??
      familyFromCode(code)
    if (!seen.has(fam)) {
      seen.add(fam)
      order.push(fam)
    }
  }
  return order.map((fam) => ({
    family: fam,
    label: FAMILY_LABEL[fam] ?? fam,
    className:
      FAMILY_BADGE_CLASS[fam] ?? "bg-muted text-muted-foreground border-border",
    glow: FAMILY_GLOW_CLASS[fam] ?? "bg-muted-foreground",
  }))
}
