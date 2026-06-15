import { queryOptions } from "@tanstack/react-query"
import { getOrdersFn, getOrderFn } from "./server-fns"

export const ordersQueryOptions = () =>
  queryOptions({
    queryKey: ["orders"],
    queryFn: () => getOrdersFn(),
  })

export const orderQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["orders", id],
    queryFn: () => getOrderFn({ data: id }),
  })
