import { describe, expect, it } from "vitest"

import { usableImageDimensions } from "./image-utils"

describe("usableImageDimensions", () => {
  it("reports the pixels remaining after a portrait 3:4 crop", () => {
    expect(usableImageDimensions(177, 265, 3 / 4)).toEqual({
      width: 177,
      height: 236,
    })
  })

  it("reports the pixels remaining after a landscape 3:4 crop", () => {
    expect(usableImageDimensions(1920, 1080, 3 / 4)).toEqual({
      width: 810,
      height: 1080,
    })
  })

  it("keeps an exact 3:4 cover unchanged", () => {
    expect(usableImageDimensions(600, 800, 3 / 4)).toEqual({
      width: 600,
      height: 800,
    })
  })

  it("keeps the source dimensions when no crop is requested", () => {
    expect(usableImageDimensions(1200, 700)).toEqual({
      width: 1200,
      height: 700,
    })
  })
})
