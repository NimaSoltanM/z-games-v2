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

export type Game = {
  id: string
  name: string
  cover_image: string | null
  platform: Platform
  price_mode: PriceMode
  prices: GamePrice[]
  active: boolean
  links: GameLink[]
  release_status: ReleaseStatus
  release_date: string | null
  phase: GamePhase
  purchasable: boolean
  alert_message: string | null
  alert_variant: AlertVariant | null
  created_at: string
  updated_at: string
}

export type ExchangeRate = {
  id: number
  usd_to_toman: number
  updated_at: string
} | null

export type GamesParams = {
  page?: number
  platform?: string
  zarfiat?: string
  search?: string
  sort?: string
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
  price_usd: number | null
  price_toman: number | null
  slots: number | null
}

// The full game payload an admin submits from the form. `active` doubles as the
// draft (false) / published (true) flag.
export type GameFormPayload = {
  name: string
  platform: Platform
  price_mode: PriceMode
  cover_image: string | null
  active: boolean
  release_status: ReleaseStatus
  release_date: string | null
  alert_message: string | null
  alert_variant: AlertVariant | null
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
  if (!entry.price_usd || !rate) return null
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

// Real PlayStation brand colors
export const PLATFORM_BADGE_CLASS: Record<Platform, string> = {
  ps4: "bg-blue-600/15 text-blue-400 border-blue-600/30",
  ps5: "bg-black/8 text-zinc-200 border-dark/15",
  ps4_ps5:
    "bg-gradient-to-r from-blue-600/15 to-white/8 text-blue-300 border-blue-400/20",
}

// Used for glow effects (detail page cover)
export const PLATFORM_GLOW_CLASS: Record<Platform, string> = {
  ps4: "bg-blue-600",
  ps5: "bg-white",
  ps4_ps5: "bg-blue-400",
}

// Used for accent borders (cart items)
export const PLATFORM_ACCENT_CLASS: Record<ConsolePlatform, string> = {
  ps4: "border-r-blue-500/70",
  ps5: "border-r-white/25",
}
