import { describe, expect, it } from "vitest"
import type { ExchangeRate, Game } from "@/features/games"
import { canonicalUrl } from "./config"
import { gameJsonLd } from "./game"
import { robotsDirective } from "./meta"
import { stringifyJsonLd } from "./json-ld"

describe("SEO primitives", () => {
  it("removes query strings and fragments from canonical URLs", () => {
    expect(canonicalUrl("/games?page=2#catalog")).toBe(
      "http://localhost:3000/games"
    )
  })

  it("keeps an intentional pagination query in a canonical URL", () => {
    expect(
      canonicalUrl("/games?page=3&sort=-created_at#catalog", {
        keepSearch: true,
      })
    ).toBe("http://localhost:3000/games?page=3&sort=-created_at")
  })

  it("keeps staging and private pages out of the index", () => {
    expect(robotsDirective(false, false)).toBe("noindex, nofollow")
    expect(robotsDirective(true, true)).toBe("noindex, nofollow")
    expect(robotsDirective(false, true)).toContain("index, follow")
  })

  it("escapes script-closing content in JSON-LD", () => {
    const json = stringifyJsonLd({ name: "</script><script>alert(1)</script>" })
    expect(json).not.toContain("</script>")
    expect(JSON.parse(json)).toEqual({
      name: "</script><script>alert(1)</script>",
    })
  })

  it("publishes Toman product prices as ISO-compatible Rial offers", () => {
    const game = {
      id: "game-1",
      slug: "test-game",
      name: "Test Game",
      cover_image: null,
      consoles: ["ps5"],
      price_mode: "fixed",
      prices: [
        {
          id: "price-1",
          platform: "ps5",
          zarfiat: "z2",
          price_usd: null,
          price_toman: 100_000,
          slots: 1,
        },
      ],
      phase: "released",
      purchasable: true,
      returnable: true,
      discount: null,
    } as Game
    const rate: ExchangeRate = {
      usd_to_toman: 90_000,
      consoles: [
        {
          code: "ps5",
          family: "playstation",
          label_fa: "پلی‌استیشن ۵",
          default_margin_pct: 0,
          capacities: [
            { code: "z2", label_fa: "ظرفیت ۲", split_pct: 50, sort_order: 2 },
          ],
        },
      ],
    }

    const schema = JSON.stringify(gameJsonLd(game, rate))
    expect(schema).toContain('"price":"1000000"')
    expect(schema).toContain('"priceCurrency":"IRR"')
    expect(schema).not.toContain("TOMAN")
  })
})
