import { describe, expect, it } from "vitest"

import { gameCoverSrc } from "./types"

describe("gameCoverSrc", () => {
  it("uses the optimized brand fallback when a game has no cover", () => {
    expect(gameCoverSrc(null)).toBe("/brand/logo-64.webp")
  })

  it("keeps real external cover URLs unchanged", () => {
    const cover = "https://cdn.example.com/covers/game.webp"
    expect(gameCoverSrc(cover)).toBe(cover)
  })

  it("turns a legacy local frontend URL into a deployable public path", () => {
    expect(gameCoverSrc("http://localhost:3000/gta.webp")).toBe(
      "/catalog/gta-card.webp"
    )
  })

  it("moves a legacy local upload URL onto the configured API origin", () => {
    expect(gameCoverSrc("http://127.0.0.1:3002/uploads/example.jpg")).toBe(
      "http://localhost:3002/uploads/example.jpg"
    )
  })

  it("does not crash on malformed absolute data", () => {
    expect(gameCoverSrc("http://")).toBe("http://")
  })
})
