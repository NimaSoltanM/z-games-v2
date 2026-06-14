import { queryOptions } from "@tanstack/react-query"
import { getMeFn } from "./server-fns"

// Auth state changes only on explicit login/logout (we invalidate ["me"] then),
// so a long staleTime avoids needless refetches on every navigation.
export const meQueryOptions = () =>
  queryOptions({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 5 * 60 * 1000,
  })
