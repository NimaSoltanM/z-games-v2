import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import type { ServerCartResponse } from "./api"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

// Server function so the cart can be prefetched during SSR with the user's
// cookie forwarded (a plain client fetch on the server has no browser cookie).
// On non-OK (e.g. logged out / expired) we return an empty cart instead of
// throwing, so the query never errors the page.
export const getServerCartFn = createServerFn({ method: "GET" }).handler(async () => {
  const cookie = getRequestHeader("cookie")
  const res = await fetch(`${API_URL}/cart/`, {
    headers: cookie ? { cookie } : {},
  })
  if (!res.ok) return { items: [] } satisfies ServerCartResponse
  return (await res.json()) as ServerCartResponse
})
