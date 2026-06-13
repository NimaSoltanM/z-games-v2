export type Platform = "ps4" | "ps5" | "ps4_ps5"
export type PriceMode = "dynamic" | "fixed"
export type Zarfiat = "z1" | "z2" | "z3"
export type ConsolePlatform = "ps4" | "ps5"

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

export function calcPrice(
  game: Game,
  platform: ConsolePlatform,
  zarfiat: Zarfiat,
  rate: ExchangeRate,
): number | null {
  const entry = game.prices.find((p) => p.platform === platform && p.zarfiat === zarfiat)
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
