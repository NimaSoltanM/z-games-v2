import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type { AdminOrder, AdminOrdersPage, AdminOrdersQuery } from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

// Cookie-forwarding server fns so the admin pages can prefetch during SSR with
// the admin's session (a plain server-side fetch has no browser cookie).
export const getAdminOrdersFn = createServerFn({ method: "GET" })
  .validator((q: AdminOrdersQuery) => q)
  .handler(async ({ data }) => {
    const params = new URLSearchParams()
    if (data.page) params.set("page", String(data.page))
    if (data.status) params.set("status", data.status)
    if (data.search) params.set("search", data.search)
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/admin/orders?${params}`, {
      headers: cookie ? { cookie } : {},
    })
    if (!res.ok) throw new Error("FETCH_ADMIN_ORDERS_FAILED")
    return (await res.json()) as AdminOrdersPage
  })

export const getAdminOrderFn = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/admin/orders/${id}`, {
      headers: cookie ? { cookie } : {},
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error("FETCH_ADMIN_ORDER_FAILED")
    return (await res.json()) as AdminOrder
  })
