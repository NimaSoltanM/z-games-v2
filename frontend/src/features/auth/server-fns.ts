import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type { MeResponse } from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

export const getMeFn = createServerFn({ method: "GET" }).handler(async () => {
  const cookie = getRequestHeader("cookie")
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: cookie ? { cookie } : {},
  })
  if (res.status === 401) return null
  if (!res.ok) throw new Error("FETCH_ME_FAILED")
  return res.json() as Promise<MeResponse>
})
