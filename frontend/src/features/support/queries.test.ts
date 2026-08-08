import { describe, expect, it } from "vitest"
import {
  adminSupportTicketQueryOptions,
  adminSupportTicketsQueryOptions,
  mySupportTicketQueryOptions,
  mySupportTicketsQueryOptions,
} from "./queries"

describe("support query refresh behavior", () => {
  it("refreshes ticket details more frequently than queues", () => {
    expect(mySupportTicketQueryOptions("ticket-1").refetchInterval).toBe(7_500)
    expect(adminSupportTicketQueryOptions("ticket-1").refetchInterval).toBe(
      7_500
    )
    expect(mySupportTicketsQueryOptions(1).refetchInterval).toBe(15_000)
    expect(adminSupportTicketsQueryOptions({ page: 1 }).refetchInterval).toBe(
      15_000
    )
  })

  it("keeps customer and admin ticket caches isolated", () => {
    expect(mySupportTicketQueryOptions("same").queryKey).not.toEqual(
      adminSupportTicketQueryOptions("same").queryKey
    )
  })
})
