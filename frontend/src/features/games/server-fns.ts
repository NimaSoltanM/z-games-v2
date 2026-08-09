import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type { AdminGame, AdminGamesResponse, AdminPricingConfig } from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

// Cookie-forwarding server fns so the admin game pages can prefetch during SSR
// with the admin's session (a plain server-side fetch carries no browser cookie).

export const getAdminGamesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/games/admin/all`, {
      headers: cookie ? { cookie } : {},
    })
    if (!res.ok) throw new Error("FETCH_ADMIN_GAMES_FAILED")
    return (await res.json()) as AdminGamesResponse
  }
)

export const getAdminGameFn = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/games/admin/${id}`, {
      headers: cookie ? { cookie } : {},
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error("FETCH_ADMIN_GAME_FAILED")
    return (await res.json()) as { game: AdminGame }
  })

// The global pricing config (rate + split + default margin), for the form preview.
export const getAdminPricingFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/games/admin/exchange-rate`, {
      headers: cookie ? { cookie } : {},
    })
    if (!res.ok) throw new Error("FETCH_ADMIN_PRICING_FAILED")
    return (await res.json()) as AdminPricingConfig
  }
)
