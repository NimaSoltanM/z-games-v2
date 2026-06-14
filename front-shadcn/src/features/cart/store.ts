import { createStore } from "@tanstack/react-store"
import type { CartState, CartItem } from "./types"
import type { ConsolePlatform, Zarfiat } from "@/features/games"

const STORAGE_KEY = "z-games-cart"
const MAX_QTY = 10 // mirrors the server-side per-item cap

function key(gameId: string, platform: ConsolePlatform, zarfiat: Zarfiat) {
  return `${gameId}:${platform}:${zarfiat}`
}

function isValidCartState(val: unknown): val is CartState {
  return (
    typeof val === "object" &&
    val !== null &&
    Array.isArray((val as CartState).items) &&
    (val as CartState).items.every(
      (i) =>
        typeof i.gameId === "string" &&
        typeof i.gameName === "string" &&
        typeof i.platform === "string" &&
        typeof i.zarfiat === "string" &&
        typeof i.quantity === "number" &&
        i.quantity > 0,
    )
  )
}

// Always start empty — avoid SSR/client hydration mismatch.
// localStorage is loaded client-side after hydration (see below).
export const cartStore = createStore<CartState>({ items: [] })

if (typeof window !== "undefined") {
  let loading = false

  cartStore.subscribe(() => {
    if (loading) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartStore.state))
    } catch {
      // storage quota exceeded or private browsing — fail silently
    }
  })

  // Defer localStorage read until after React hydration completes.
  // setTimeout(0) ensures we don't cause a hydration mismatch.
  setTimeout(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isValidCartState(parsed) && parsed.items.length > 0) {
          loading = true
          cartStore.setState(() => parsed)
          loading = false
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, 0)
}

export function addToCart(item: Omit<CartItem, "quantity">) {
  cartStore.setState((s) => {
    const k = key(item.gameId, item.platform, item.zarfiat)
    const exists = s.items.some((i) => key(i.gameId, i.platform, i.zarfiat) === k)
    if (exists) {
      return {
        ...s,
        items: s.items.map((i) =>
          key(i.gameId, i.platform, i.zarfiat) === k
            ? { ...i, quantity: Math.min(i.quantity + 1, MAX_QTY) }
            : i,
        ),
      }
    }
    return { ...s, items: [...s.items, { ...item, quantity: 1 }] }
  })
}

export function removeFromCart(gameId: string, platform: ConsolePlatform, zarfiat: Zarfiat) {
  const k = key(gameId, platform, zarfiat)
  cartStore.setState((s) => ({
    ...s,
    items: s.items.filter((i) => key(i.gameId, i.platform, i.zarfiat) !== k),
  }))
}

export function setQuantity(
  gameId: string,
  platform: ConsolePlatform,
  zarfiat: Zarfiat,
  quantity: number,
) {
  if (quantity <= 0) {
    removeFromCart(gameId, platform, zarfiat)
    return
  }
  const k = key(gameId, platform, zarfiat)
  const capped = Math.min(quantity, MAX_QTY)
  cartStore.setState((s) => ({
    ...s,
    items: s.items.map((i) =>
      key(i.gameId, i.platform, i.zarfiat) === k ? { ...i, quantity: capped } : i,
    ),
  }))
}

export function clearCart() {
  cartStore.setState(() => ({ items: [] }))
}
