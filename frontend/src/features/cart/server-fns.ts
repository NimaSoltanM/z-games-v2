import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type { ServerCartResponse } from "./api"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

// Server function so the cart can be prefetched during SSR with the user's
// cookie forwarded (a plain client fetch on the server has no browser cookie).
// Logged-out/expired sessions map to an empty cart. Real upstream failures throw
// so an outage is not silently presented as an empty cart.
export const getServerCartFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/cart/`, {
      headers: cookie ? { cookie } : {},
    })
    if (res.status === 401) return { items: [] } satisfies ServerCartResponse
    if (!res.ok) throw new Error("FETCH_CART_FAILED")
    return (await res.json()) as ServerCartResponse
  }
)
