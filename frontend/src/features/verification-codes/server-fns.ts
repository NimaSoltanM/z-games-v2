import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type {
  VerificationRequestsPage,
  VerificationRequestsQuery,
} from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

export const getVerificationRequestsFn = createServerFn({ method: "GET" })
  .validator((query: VerificationRequestsQuery) => query)
  .handler(async ({ data }) => {
    const params = new URLSearchParams()
    if (data.page) params.set("page", String(data.page))
    if (data.status) params.set("status", data.status)
    if (data.search) params.set("search", data.search)
    const cookie = getRequestHeader("cookie")
    const response = await fetch(
      `${API_URL}/admin/verification-code-requests?${params}`,
      { headers: cookie ? { cookie } : {} }
    )
    if (!response.ok) throw new Error("FETCH_VERIFICATION_REQUESTS_FAILED")
    return (await response.json()) as VerificationRequestsPage
  })
