import { describe, expect, it } from "vitest"

import type {
  ConsolePlatform,
  ExchangeRate,
  Game,
  GamePrice,
  Zarfiat,
} from "@/features/games"
import { cartTotal } from "./total"
import type { GamePricing } from "./total"
import type { CartItem } from "./types"

const RATE: ExchangeRate = {
  usd_to_toman: 100_000,
  z1_pct: 15,
  z2_pct: 60,
  z3_pct: 25,
  default_margin_pct: 10,
}

function priceEntry(
  platform: ConsolePlatform,
  zarfiat: Zarfiat,
  opts: { usd?: string | null; toman?: number | null } = {}
): GamePrice {
  return {
    id: `${platform}-${zarfiat}`,
    platform,
    zarfiat,
    price_usd: opts.usd ?? null,
    price_toman: opts.toman ?? null,
    slots: null,
  }
}

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "g1",
    name: "Test Game",
    cover_image: null,
    platform: "ps5",
    price_mode: "dynamic",
    prices: [],
    base_prices: [],
    profit_margin_pct: null,
    active: true,
    links: [],
    release_status: "released",
    release_date: null,
    phase: "released",
    purchasable: true,
    alert_message: null,
    alert_variant: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

function line(overrides: Partial<CartItem> = {}): CartItem {
  return {
    gameId: "g1",
    gameName: "Test Game",
    coverImage: null,
    platform: "ps5",
    zarfiat: "z2",
    quantity: 1,
    ...overrides,
  }
}

function pricing(game: Game, rate: ExchangeRate = RATE): Map<string, GamePricing> {
  return new Map([[game.id, { game, exchange_rate: rate }]])
}

describe("cartTotal", () => {
  it("is 0 for an empty cart", () => {
    expect(cartTotal([], new Map())).toBe(0)
  })

  it("multiplies a dynamic price by quantity (usd * rate)", () => {
    const game = makeGame({ prices: [priceEntry("ps5", "z2", { usd: "5" })] })
    // 5 * 100_000 = 500_000, x2 = 1_000_000
    expect(cartTotal([line({ quantity: 2 })], pricing(game))).toBe(1_000_000)
  })

  it("uses the toman price for fixed games (rate irrelevant)", () => {
    const game = makeGame({
      price_mode: "fixed",
      prices: [priceEntry("ps5", "z2", { toman: 300_000 })],
    })
    expect(cartTotal([line({ quantity: 3 })], pricing(game, null))).toBe(900_000)
  })

  it("sums multiple lines of the same game (different tiers)", () => {
    const game = makeGame({
      prices: [
        priceEntry("ps5", "z2", { usd: "5" }), // 500_000
        priceEntry("ps5", "z3", { usd: "3" }), // 300_000
      ],
    })
    const total = cartTotal(
      [line({ zarfiat: "z2", quantity: 2 }), line({ zarfiat: "z3", quantity: 1 })],
      pricing(game)
    )
    expect(total).toBe(2 * 500_000 + 300_000)
  })

  it("excludes an inactive game", () => {
    const game = makeGame({ active: false, prices: [priceEntry("ps5", "z2", { usd: "5" })] })
    expect(cartTotal([line()], pricing(game))).toBe(0)
  })

  it("excludes a non-purchasable game (e.g. pre-order closing window)", () => {
    const game = makeGame({ purchasable: false, prices: [priceEntry("ps5", "z2", { usd: "5" })] })
    expect(cartTotal([line()], pricing(game))).toBe(0)
  })

  it("excludes a line whose platform/zarfiat has no price entry", () => {
    const game = makeGame({ prices: [priceEntry("ps5", "z2", { usd: "5" })] })
    // line asks for z3, which isn't priced
    expect(cartTotal([line({ zarfiat: "z3" })], pricing(game))).toBe(0)
  })

  it("excludes a line whose game isn't in the pricing map", () => {
    const game = makeGame({ prices: [priceEntry("ps5", "z2", { usd: "5" })] })
    expect(cartTotal([line({ gameId: "unknown" })], pricing(game))).toBe(0)
  })

  it("excludes a dynamic line with no USD value", () => {
    const game = makeGame({ prices: [priceEntry("ps5", "z2", { usd: null })] })
    expect(cartTotal([line()], pricing(game))).toBe(0)
  })

  it("excludes a dynamic line when there is no exchange rate", () => {
    const game = makeGame({ prices: [priceEntry("ps5", "z2", { usd: "5" })] })
    expect(cartTotal([line()], pricing(game, null))).toBe(0)
  })

  it("counts only the billable lines in a mixed cart", () => {
    const valid = makeGame({ id: "g1", prices: [priceEntry("ps5", "z2", { usd: "5" })] })
    const dead = makeGame({ id: "g2", active: false, prices: [priceEntry("ps5", "z2", { usd: "9" })] })
    const map = new Map<string, GamePricing>([
      ["g1", { game: valid, exchange_rate: RATE }],
      ["g2", { game: dead, exchange_rate: RATE }],
    ])
    const total = cartTotal(
      [line({ gameId: "g1", quantity: 2 }), line({ gameId: "g2", quantity: 5 })],
      map
    )
    expect(total).toBe(1_000_000) // only g1: 500_000 x2
  })
})
