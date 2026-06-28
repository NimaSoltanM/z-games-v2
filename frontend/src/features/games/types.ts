export type Platform = "ps4" | "ps5" | "ps4_ps5"
export type PriceMode = "dynamic" | "fixed"
export type Zarfiat = "z1" | "z2" | "z3"
export type ConsolePlatform = "ps4" | "ps5"

// Stored release status vs. the phase the backend derives from it + the release
// date. The frontend reads `phase`/`purchasable`; it never re-derives the dates.
export type ReleaseStatus = "released" | "pre_order"
export type GamePhase = "released" | "pre_order" | "closing_soon"
export type AlertVariant = "info" | "warning"

export type GameLink = {
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

export type GameBasePrice = {
  platform: ConsolePlatform
  base_usd: string
}

export type Game = {
  id: string
  slug: string
  name: string
  cover_image: string | null
  platform: Platform
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

// Global pricing config (capacity split + default margin), returned alongside the
// USD→Toman rate. The whole object is always present; usd_to_toman may be null.
export type PricingConfig = {
  z1_pct: number
  z2_pct: number
  z3_pct: number
  default_margin_pct: number
}

export type ExchangeRate =
  | ({
      usd_to_toman: number | null
    } & PricingConfig)
  | null

export type GamesParams = {
  page?: number
  platform?: string
  zarfiat?: string
  search?: string
  sort?: string
  featured?: boolean
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
}

// The full game payload an admin submits from the form. `active` doubles as the
// draft (false) / published (true) flag. Dynamic games send base_prices (+ an
// optional margin override); fixed games send per-tier prices.
export type GameFormPayload = {
  name: string
  slug: string
  platform: Platform
  price_mode: PriceMode
  cover_image: string | null
  active: boolean
  featured: boolean
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
// cover falls back to a deterministic placeholder.
export function gameCoverSrc(coverImage: string | null, id: string): string {
  if (!coverImage) return `https://picsum.photos/seed/${id}/300/400`
  if (/^https?:\/\//i.test(coverImage)) return coverImage
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3002"
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

export const PLATFORM_LABEL: Record<Platform, string> = {
  ps4: "PS4",
  ps5: "PS5",
  ps4_ps5: "PS4 & PS5",
}

export const ZARFIAT_LABEL: Record<Zarfiat, string> = {
  z1: "ظرفیت ۱",
  z2: "ظرفیت ۲",
  z3: "ظرفیت ۳",
}

export const ZARFIATS: Zarfiat[] = ["z1", "z2", "z3"]
export const CONSOLE_PLATFORMS: ConsolePlatform[] = ["ps4", "ps5"]

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
export const PLATFORM_BADGE_CLASS: Record<string, string> = {
  ps4: "bg-blue-600/15 text-blue-400 border-blue-600/30",
  ps5: "bg-black/8 text-zinc-200 border-dark/15",
  ps4_ps5:
    "bg-gradient-to-r from-blue-600/15 to-white/8 text-blue-300 border-blue-400/20",
  xbox_one: "bg-green-400/15 text-green-300 border-green-400/30",
  xbox_series: "bg-green-700/15 text-green-500 border-green-700/30",
}

// Used for glow effects (detail page cover)
export const PLATFORM_GLOW_CLASS: Record<string, string> = {
  ps4: "bg-blue-600",
  ps5: "bg-white",
  ps4_ps5: "bg-blue-400",
  xbox_one: "bg-green-400",
  xbox_series: "bg-green-700",
}

// Used for accent borders (cart items)
export const PLATFORM_ACCENT_CLASS: Record<string, string> = {
  ps4: "border-r-blue-500/70",
  ps5: "border-r-white/25",
  xbox_one: "border-r-green-400/70",
  xbox_series: "border-r-green-600/40",
}
