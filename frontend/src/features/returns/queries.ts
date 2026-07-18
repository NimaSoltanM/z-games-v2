import { queryOptions } from "@tanstack/react-query"
import {
  getAdminReturnFn,
  getAdminReturnsFn,
  getMyReturnsFn,
  getOwnedFn,
  getOwnedItemFn,
  getWalletFn,
  getReturnedAccountsFn,
} from "./server-fns"
import type { AdminReturnsQuery, ReturnedAccountsQuery } from "./types"

export const ownedQueryOptions = (page = 1) =>
  queryOptions({
    queryKey: ["returns", "owned", page],
    queryFn: () => getOwnedFn({ data: page }),
  })

export const ownedItemQueryOptions = (itemId: string) =>
  queryOptions({
    queryKey: ["returns", "owned-item", itemId],
    queryFn: () => getOwnedItemFn({ data: itemId }),
  })

export const myReturnsQueryOptions = (page = 1) =>
  queryOptions({
    queryKey: ["returns", "mine", page],
    queryFn: () => getMyReturnsFn({ data: page }),
  })

export const walletQueryOptions = () =>
  queryOptions({
    queryKey: ["wallet"],
    queryFn: () => getWalletFn(),
  })

export const adminReturnsQueryOptions = (query: AdminReturnsQuery = {}) =>
  queryOptions({
    queryKey: ["admin", "returns", "list", query],
    queryFn: () => getAdminReturnsFn({ data: query }),
  })

export const adminReturnQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["admin", "returns", id],
    queryFn: () => getAdminReturnFn({ data: id }),
  })

export const returnedAccountsQueryOptions = (
  query: ReturnedAccountsQuery = {}
) =>
  queryOptions({
    queryKey: ["admin", "returned-accounts", "list", query],
    queryFn: () => getReturnedAccountsFn({ data: query }),
  })
