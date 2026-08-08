import { describe, expect, it } from "vitest"

import { gameFormToPayload } from "./game-form"

type FormValues = Parameters<typeof gameFormToPayload>[0]

function formValues(overrides: Partial<FormValues> = {}): FormValues {
  return {
    name: "EA SPORTS FC 27",
    slug: "ea-sports-fc-27",
    consoles: ["ps5"],
    price_mode: "dynamic",
    cover_image: null,
    description_markdown: "",
    seo_title: "",
    seo_description: "",
    featured: false,
    returnable: true,
    tags: [],
    margin: "",
    bases: { ps5: "70" },
    enabledCaps: { ps5: ["z1", "z2", "z3"] },
    prices: [],
    links: [{ url: "https://store.example.com/fc-27" }],
    release_status: "released",
    release_date: "",
    alert_message: "",
    alert_variant: "info",
    ...overrides,
  }
}

describe("gameFormToPayload", () => {
  it("includes the selected release date when creating a preorder", () => {
    const payload = gameFormToPayload(
      formValues({
        release_status: "pre_order",
        release_date: "2026-09-25",
      }),
      true
    )

    expect(payload.release_status).toBe("pre_order")
    expect(payload.release_date).toBe("2026-09-25")
    expect(payload.active).toBe(true)
  })

  it("keeps the release date null for a published non-preorder game", () => {
    const payload = gameFormToPayload(formValues(), true)

    expect(payload.release_status).toBe("released")
    expect(payload.release_date).toBeNull()
    expect(payload.active).toBe(true)
  })
})
