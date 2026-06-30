import { beforeEach, describe, expect, it } from "vitest"

import {
  addToCart,
  cartStore,
  clearCart,
  removeFromCart,
  setQuantity,
} from "./store"
import type { CartItem } from "./types"

// A complete cart line minus quantity (quantity is owned by the store).
function line(
  overrides: Partial<Omit<CartItem, "quantity">> = {}
): Omit<CartItem, "quantity"> {
  return {
    gameId: "g1",
    gameName: "Test Game",
    coverImage: null,
    platform: "ps5",
    zarfiat: "z2",
    ...overrides,
  }
}

function items() {
  return cartStore.state.items
}

beforeEach(() => {
  clearCart()
  localStorage.clear()
})

describe("addToCart", () => {
  it("adds a new line at quantity 1", () => {
    addToCart(line())
    expect(items()).toHaveLength(1)
    expect(items()[0].quantity).toBe(1)
    expect(items()[0].gameId).toBe("g1")
  })

  it("increments quantity when the same line is added again", () => {
    addToCart(line())
    addToCart(line())
    addToCart(line())
    expect(items()).toHaveLength(1)
    expect(items()[0].quantity).toBe(3)
  })

  it("caps quantity at 10 no matter how many times it is added", () => {
    for (let i = 0; i < 15; i++) addToCart(line())
    expect(items()).toHaveLength(1)
    expect(items()[0].quantity).toBe(10)
  })

  it("keeps different platform/zarfiat as separate lines", () => {
    addToCart(line({ platform: "ps5", zarfiat: "z2" }))
    addToCart(line({ platform: "ps4", zarfiat: "z2" }))
    addToCart(line({ platform: "ps5", zarfiat: "z3" }))
    expect(items()).toHaveLength(3)
    expect(items().every((i) => i.quantity === 1)).toBe(true)
  })

  it("treats different games as separate lines", () => {
    addToCart(line({ gameId: "g1" }))
    addToCart(line({ gameId: "g2" }))
    expect(items()).toHaveLength(2)
  })
})

describe("setQuantity", () => {
  it("sets an exact quantity", () => {
    addToCart(line())
    setQuantity("g1", "ps5", "z2", 5)
    expect(items()[0].quantity).toBe(5)
  })

  it("caps the set quantity at 10", () => {
    addToCart(line())
    setQuantity("g1", "ps5", "z2", 99)
    expect(items()[0].quantity).toBe(10)
  })

  it("removes the line when quantity is set to 0 or below", () => {
    addToCart(line())
    setQuantity("g1", "ps5", "z2", 0)
    expect(items()).toHaveLength(0)
  })

  it("only touches the matching line", () => {
    addToCart(line({ gameId: "g1" }))
    addToCart(line({ gameId: "g2" }))
    setQuantity("g1", "ps5", "z2", 4)
    expect(items().find((i) => i.gameId === "g1")?.quantity).toBe(4)
    expect(items().find((i) => i.gameId === "g2")?.quantity).toBe(1)
  })
})

describe("removeFromCart", () => {
  it("removes only the matching line", () => {
    addToCart(line({ gameId: "g1" }))
    addToCart(line({ gameId: "g2" }))
    removeFromCart("g1", "ps5", "z2")
    expect(items()).toHaveLength(1)
    expect(items()[0].gameId).toBe("g2")
  })

  it("is a no-op when the line is not present", () => {
    addToCart(line({ gameId: "g1" }))
    removeFromCart("g1", "ps4", "z2") // same game, different platform
    expect(items()).toHaveLength(1)
  })
})

describe("clearCart", () => {
  it("empties the cart", () => {
    addToCart(line({ gameId: "g1" }))
    addToCart(line({ gameId: "g2" }))
    clearCart()
    expect(items()).toHaveLength(0)
  })
})
