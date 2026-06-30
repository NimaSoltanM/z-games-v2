import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type { AuditActor, AuditPage, AuditQuery } from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

// Cookie-forwarding server fns so the audit page can prefetch during SSR with
// the admin's session (a plain server-side fetch carries no browser cookie).
export const getAuditFn = createServerFn({ method: "GET" })
  .validator((q: AuditQuery) => q)
  .handler(async ({ data }) => {
    const params = new URLSearchParams()
    if (data.page) params.set("page", String(data.page))
    if (data.action) params.set("action", data.action)
    if (data.admin_id) params.set("admin_id", data.admin_id)
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/admin/audit?${params}`, {
      headers: cookie ? { cookie } : {},
    })
    if (!res.ok) throw new Error("FETCH_AUDIT_FAILED")
    return (await res.json()) as AuditPage
  })

export const getAuditActorsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/admin/audit/admins`, {
      headers: cookie ? { cookie } : {},
    })
    if (!res.ok) throw new Error("FETCH_AUDIT_ACTORS_FAILED")
    return (await res.json()) as { actors: AuditActor[] }
  }
)
