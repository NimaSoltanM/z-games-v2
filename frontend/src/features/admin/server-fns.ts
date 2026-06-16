import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type { AdminOrder } from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

// Cookie-forwarding server fns so the admin pages can prefetch during SSR with
// the admin's session (a plain server-side fetch has no browser cookie).
export const getAdminOrdersFn = createServerFn({ method: "GET" }).handler(async () => {
  const cookie = getRequestHeader("cookie")
  const res = await fetch(`${API_URL}/admin/orders`, {
    headers: cookie ? { cookie } : {},
  })
  if (!res.ok) throw new Error("FETCH_ADMIN_ORDERS_FAILED")
  return (await res.json()) as { orders: AdminOrder[] }
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
