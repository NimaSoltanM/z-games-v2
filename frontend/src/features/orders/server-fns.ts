import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type { Order, OrdersPage, OrdersQuery } from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

// Cookie-forwarding server fns so the dashboard can prefetch during SSR with the
// user's session (a plain server-side fetch has no browser cookie).
export const getOrdersFn = createServerFn({ method: "GET" })
  .validator((q: OrdersQuery) => q)
  .handler(async ({ data }) => {
    const params = new URLSearchParams()
    if (data.page) params.set("page", String(data.page))
    if (data.status) params.set("status", data.status)
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/orders?${params}`, {
      headers: cookie ? { cookie } : {},
    })
    if (!res.ok) throw new Error("FETCH_ORDERS_FAILED")
    return (await res.json()) as OrdersPage
  })

export const getOrderFn = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/orders/${id}`, {
      headers: cookie ? { cookie } : {},
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error("FETCH_ORDER_FAILED")
    return (await res.json()) as Order
  })
