import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type {
  AdminReturnDetail,
  AdminReturnsPage,
  AdminReturnsQuery,
  MyReturnsPage,
  OwnedItem,
  OwnedPage,
  ReturnedAccountsPage,
  ReturnedAccountsQuery,
  Wallet,
} from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

// Cookie-forwarding server fns so pages can prefetch during SSR with the user's
// session (a plain server-side fetch has no browser cookie).
function cookieHeader(): Record<string, string> {
  const cookie = getRequestHeader("cookie")
  return cookie ? { cookie } : {}
}

export const getOwnedFn = createServerFn({ method: "GET" })
  .validator((page: number) => page)
  .handler(async ({ data: page }) => {
    const res = await fetch(`${API_URL}/returns/owned?page=${page}`, {
      headers: cookieHeader(),
    })
    if (!res.ok) throw new Error("FETCH_OWNED_FAILED")
    return (await res.json()) as OwnedPage
  })

export const getOwnedItemFn = createServerFn({ method: "GET" })
  .validator((itemId: string) => itemId)
  .handler(async ({ data: itemId }) => {
    const res = await fetch(`${API_URL}/returns/owned/${itemId}`, {
      headers: cookieHeader(),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error("FETCH_OWNED_ITEM_FAILED")
    return (await res.json()) as OwnedItem
  })

export const getMyReturnsFn = createServerFn({ method: "GET" })
  .validator((page: number) => page)
  .handler(async ({ data: page }) => {
    const res = await fetch(`${API_URL}/returns/mine?page=${page}`, {
      headers: cookieHeader(),
    })
    if (!res.ok) throw new Error("FETCH_RETURNS_FAILED")
    return (await res.json()) as MyReturnsPage
  })

export const getWalletFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const res = await fetch(`${API_URL}/wallet`, { headers: cookieHeader() })
    if (!res.ok) throw new Error("FETCH_WALLET_FAILED")
    return (await res.json()) as Wallet
  }
)

export const getAdminReturnsFn = createServerFn({ method: "GET" })
  .validator((q: AdminReturnsQuery) => q)
  .handler(async ({ data }) => {
    const params = new URLSearchParams()
    if (data.page) params.set("page", String(data.page))
    if (data.status) params.set("status", data.status)
    if (data.search) params.set("search", data.search)
    const res = await fetch(`${API_URL}/admin/returns?${params}`, {
      headers: cookieHeader(),
    })
    if (!res.ok) throw new Error("FETCH_ADMIN_RETURNS_FAILED")
    return (await res.json()) as AdminReturnsPage
  })

export const getAdminReturnFn = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const res = await fetch(`${API_URL}/admin/returns/${id}`, {
      headers: cookieHeader(),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error("FETCH_ADMIN_RETURN_FAILED")
    return (await res.json()) as AdminReturnDetail
  })

export const getReturnedAccountsFn = createServerFn({ method: "GET" })
  .validator((q: ReturnedAccountsQuery) => q)
  .handler(async ({ data }) => {
    const params = new URLSearchParams()
    if (data.page) params.set("page", String(data.page))
    if (data.status) params.set("status", data.status)
    if (data.search) params.set("search", data.search)
    const res = await fetch(`${API_URL}/admin/returned-accounts?${params}`, {
      headers: cookieHeader(),
    })
    if (!res.ok) throw new Error("FETCH_RETURNED_ACCOUNTS_FAILED")
    return (await res.json()) as ReturnedAccountsPage
  })
