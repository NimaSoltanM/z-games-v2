import { queryOptions } from "@tanstack/react-query"
import { getOrdersFn, getOrderFn } from "./server-fns"
import type { OrdersQuery } from "./types"

export const ordersQueryOptions = (query: OrdersQuery = {}) =>
  queryOptions({
    queryKey: ["orders", "list", query],
    queryFn: () => getOrdersFn({ data: query }),
  })

export const orderQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["orders", id],
    queryFn: () => getOrderFn({ data: id }),
  })
