import { queryOptions } from "@tanstack/react-query"

import { getUsersFn } from "./server-fns"
import type { UsersQuery } from "./types"

export const usersQueryOptions = (query: UsersQuery = {}) =>
  queryOptions({
    queryKey: ["admin", "users", query],
    queryFn: () => getUsersFn({ data: query }),
  })
