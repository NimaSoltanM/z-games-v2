import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type {
  AdminSupportQuery,
  SupportTicketDetail,
  SupportTicketsPage,
} from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

function cookieHeader(): Record<string, string> {
  const cookie = getRequestHeader("cookie")
  return cookie ? { cookie } : {}
}

export const getMySupportTicketsFn = createServerFn({ method: "GET" })
  .validator((page: number) => page)
  .handler(async ({ data: page }) => {
    const res = await fetch(`${API_URL}/support/tickets?page=${page}`, {
      headers: cookieHeader(),
    })
    if (!res.ok) throw new Error("FETCH_SUPPORT_TICKETS_FAILED")
    return (await res.json()) as SupportTicketsPage
  })

export const getMySupportTicketFn = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const res = await fetch(`${API_URL}/support/tickets/${id}`, {
      headers: cookieHeader(),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error("FETCH_SUPPORT_TICKET_FAILED")
    return (await res.json()) as SupportTicketDetail
  })

export const getAdminSupportTicketsFn = createServerFn({ method: "GET" })
  .validator((query: AdminSupportQuery) => query)
  .handler(async ({ data }) => {
    const params = new URLSearchParams()
    if (data.page) params.set("page", String(data.page))
    if (data.status) params.set("status", data.status)
    if (data.search) params.set("search", data.search)
    const res = await fetch(`${API_URL}/admin/support/tickets?${params}`, {
      headers: cookieHeader(),
    })
    if (!res.ok) throw new Error("FETCH_ADMIN_SUPPORT_TICKETS_FAILED")
    return (await res.json()) as SupportTicketsPage
  })

export const getAdminSupportTicketFn = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const res = await fetch(`${API_URL}/admin/support/tickets/${id}`, {
      headers: cookieHeader(),
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error("FETCH_ADMIN_SUPPORT_TICKET_FAILED")
    return (await res.json()) as SupportTicketDetail
  })
