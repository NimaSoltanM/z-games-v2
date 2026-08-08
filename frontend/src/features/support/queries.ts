import { queryOptions } from "@tanstack/react-query"
import {
  getAdminSupportTicketFn,
  getAdminSupportTicketsFn,
  getMySupportTicketFn,
  getMySupportTicketsFn,
} from "./server-fns"
import type { AdminSupportQuery } from "./types"

const LIST_REFRESH_MS = 15_000
const DETAIL_REFRESH_MS = 7_500

export const mySupportTicketsQueryOptions = (page = 1) =>
  queryOptions({
    queryKey: ["support", "mine", "list", page],
    queryFn: () => getMySupportTicketsFn({ data: page }),
    refetchInterval: LIST_REFRESH_MS,
  })

export const mySupportTicketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["support", "mine", id],
    queryFn: () => getMySupportTicketFn({ data: id }),
    refetchInterval: DETAIL_REFRESH_MS,
  })

export const adminSupportTicketsQueryOptions = (
  query: AdminSupportQuery = {}
) =>
  queryOptions({
    queryKey: ["admin", "support", "list", query],
    queryFn: () => getAdminSupportTicketsFn({ data: query }),
    refetchInterval: LIST_REFRESH_MS,
  })

export const adminSupportTicketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["admin", "support", id],
    queryFn: () => getAdminSupportTicketFn({ data: id }),
    refetchInterval: DETAIL_REFRESH_MS,
  })
