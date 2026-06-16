import { queryOptions } from "@tanstack/react-query"
import { getAdminOrdersFn, getAdminOrderFn } from "./server-fns"

export const adminOrdersQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "orders"],
    queryFn: () => getAdminOrdersFn(),
  })

export const adminOrderQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["admin", "orders", id],
    queryFn: () => getAdminOrderFn({ data: id }),
  })
