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
  consoles: [],
}

function priceEntry(
  platform: ConsolePlatform,
  zarfiat: Zarfiat,
  toman: number | null
): GamePrice {
  return {
    platform,
    zarfiat,
    price_toman: toman,
  }
}

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "g1",
    slug: "g1",
    name: "Test Game",
    cover_image: null,
    description_markdown: "",
    seo_title: null,
    seo_description: null,
    consoles: ["ps5"],
    prices: [],
    active: true,
    links: [],
    release_date: null,
    phase: "released",
    purchasable: true,
    alert_message: null,
    alert_variant: null,
    returnable: true,
    tags: [],
    discount: null,
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

function pricing(
  game: Game,
  rate: ExchangeRate = RATE
): Map<string, GamePricing> {
  return new Map([[game.id, { game, exchange_rate: rate }]])
}

describe("cartTotal", () => {
  it("is 0 for an empty cart", () => {
    expect(cartTotal([], new Map())).toBe(0)
  })

  it("multiplies the server-calculated Toman price by quantity", () => {
    const game = makeGame({ prices: [priceEntry("ps5", "z2", 500_000)] })
    expect(cartTotal([line({ quantity: 2 })], pricing(game))).toBe(1_000_000)
  })

  it("uses the final Toman price without an exchange-rate response", () => {
    const game = makeGame({
      prices: [priceEntry("ps5", "z2", 300_000)],
    })
    expect(cartTotal([line({ quantity: 3 })], pricing(game, null))).toBe(
      900_000
    )
  })

  it("sums multiple lines of the same game (different tiers)", () => {
    const game = makeGame({
      prices: [
        priceEntry("ps5", "z2", 500_000),
        priceEntry("ps5", "z3", 300_000),
      ],
    })
    const total = cartTotal(
      [
        line({ zarfiat: "z2", quantity: 2 }),
        line({ zarfiat: "z3", quantity: 1 }),
      ],
      pricing(game)
    )
    expect(total).toBe(2 * 500_000 + 300_000)
  })

  it("excludes an inactive game", () => {
    const game = makeGame({
      active: false,
      prices: [priceEntry("ps5", "z2", 500_000)],
    })
    expect(cartTotal([line()], pricing(game))).toBe(0)
  })

  it("excludes a non-purchasable game (e.g. pre-order closing window)", () => {
    const game = makeGame({
      purchasable: false,
      prices: [priceEntry("ps5", "z2", 500_000)],
    })
    expect(cartTotal([line()], pricing(game))).toBe(0)
  })

  it("excludes a line whose platform/zarfiat has no price entry", () => {
    const game = makeGame({ prices: [priceEntry("ps5", "z2", 500_000)] })
    // line asks for z3, which isn't priced
    expect(cartTotal([line({ zarfiat: "z3" })], pricing(game))).toBe(0)
  })

  it("excludes a line whose game isn't in the pricing map", () => {
    const game = makeGame({ prices: [priceEntry("ps5", "z2", 500_000)] })
    expect(cartTotal([line({ gameId: "unknown" })], pricing(game))).toBe(0)
  })

  it("excludes a line whose server-calculated price is unavailable", () => {
    const game = makeGame({ prices: [priceEntry("ps5", "z2", null)] })
    expect(cartTotal([line()], pricing(game))).toBe(0)
  })

  it("counts only the billable lines in a mixed cart", () => {
    const valid = makeGame({
      id: "g1",
      prices: [priceEntry("ps5", "z2", 500_000)],
    })
    const dead = makeGame({
      id: "g2",
      active: false,
      prices: [priceEntry("ps5", "z2", 900_000)],
    })
    const map = new Map<string, GamePricing>([
      ["g1", { game: valid, exchange_rate: RATE }],
      ["g2", { game: dead, exchange_rate: RATE }],
    ])
    const total = cartTotal(
      [
        line({ gameId: "g1", quantity: 2 }),
        line({ gameId: "g2", quantity: 5 }),
      ],
      map
    )
    expect(total).toBe(1_000_000) // only g1: 500_000 x2
  })
})
