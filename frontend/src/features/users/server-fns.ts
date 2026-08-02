import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"

import type { UsersPage, UsersQuery } from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

export const getUsersFn = createServerFn({ method: "GET" })
  .validator((query: UsersQuery) => query)
  .handler(async ({ data }) => {
    const params = new URLSearchParams()
    if (data.page) params.set("page", String(data.page))

    const cookie = getRequestHeader("cookie")
    const res = await fetch(`${API_URL}/admin/users?${params}`, {
      headers: cookie ? { cookie } : {},
    })
    if (!res.ok) throw new Error("FETCH_USERS_FAILED")
    return (await res.json()) as UsersPage
  })
