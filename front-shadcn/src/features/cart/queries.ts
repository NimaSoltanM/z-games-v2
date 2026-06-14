import { queryOptions } from "@tanstack/react-query"
import { getServerCartFn } from "./server-fns"

export const SERVER_CART_KEY = ["cart", "server"] as const

// Short staleTime keeps navigations cheap; mutations invalidate this key so the
// cart updates immediately after any change.
export const serverCartQueryOptions = () =>
  queryOptions({
    queryKey: SERVER_CART_KEY,
    queryFn: () => getServerCartFn(),
    staleTime: 60 * 1000,
  })
