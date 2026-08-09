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
      description_markdown: "",
      seo_title: null,
      seo_description: null,
      consoles: ["ps5"],
      prices: [
        {
          platform: "ps5",
          zarfiat: "z2",
          price_toman: 100_000,
        },
      ],
      active: true,
      links: [],
      release_date: null,
      phase: "released",
      purchasable: true,
      alert_message: null,
      alert_variant: null,
      tags: [],
      returnable: true,
      discount: null,
      updated_at: "2026-08-09T00:00:00Z",
    } satisfies Game
    const rate: ExchangeRate = {
      consoles: [
        {
          code: "ps5",
          family: "playstation",
          label_fa: "پلی‌استیشن ۵",
          capacities: [{ code: "z2", label_fa: "ظرفیت ۲", sort_order: 2 }],
        },
      ],
    }

    const schema = JSON.stringify(gameJsonLd(game, rate))
    expect(schema).toContain('"price":"1000000"')
    expect(schema).toContain('"priceCurrency":"IRR"')
    expect(schema).not.toContain("TOMAN")
  })
})
