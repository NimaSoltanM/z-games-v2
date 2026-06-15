import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type { MeResponse } from "./types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

export const getMeFn = createServerFn({ method: "GET" }).handler(async () => {
  const cookie = getRequestHeader("cookie")
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: cookie ? { cookie } : {},
  })
  if (!res.ok) return null
  return res.json() as Promise<MeResponse>
})
