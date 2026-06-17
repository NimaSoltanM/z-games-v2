import { queryOptions } from "@tanstack/react-query"
import { getAdminOrdersFn, getAdminOrderFn } from "./server-fns"
import type { AdminOrdersQuery } from "./types"

export const adminOrdersQueryOptions = (query: AdminOrdersQuery = {}) =>
  queryOptions({
    queryKey: ["admin", "orders", "list", query],
    queryFn: () => getAdminOrdersFn({ data: query }),
  })

export const adminOrderQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["admin", "orders", id],
    queryFn: () => getAdminOrderFn({ data: id }),
  })
