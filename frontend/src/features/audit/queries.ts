import { queryOptions } from "@tanstack/react-query"
import { getAuditFn, getAuditActorsFn } from "./server-fns"
import type { AuditQuery } from "./types"

export const auditQueryOptions = (query: AuditQuery = {}) =>
  queryOptions({
    queryKey: ["admin", "audit", "list", query],
    queryFn: () => getAuditFn({ data: query }),
  })

export const auditActorsQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "audit", "actors"],
    queryFn: () => getAuditActorsFn(),
  })
