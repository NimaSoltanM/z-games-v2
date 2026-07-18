import { queryOptions } from "@tanstack/react-query"
import { getVerificationRequestsFn } from "./server-fns"
import type { VerificationRequestsQuery } from "./types"

export const verificationRequestsQueryOptions = (
  query: VerificationRequestsQuery = {}
) =>
  queryOptions({
    queryKey: ["admin", "verification-code-requests", query],
    queryFn: () => getVerificationRequestsFn({ data: query }),
  })
