import { apiFetch } from "@/lib/api-client"
import type {
  SupportCategory,
  SupportStatus,
  SupportTicketDetail,
} from "./types"

export function createSupportTicket(input: {
  subject: string
  category: SupportCategory
  body: string
}) {
  return apiFetch<{ id: string }>("/support/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function replyToSupportTicket(id: string, body: string) {
  return apiFetch<SupportTicketDetail>(`/support/tickets/${id}/replies`, {
    method: "POST",
    body: JSON.stringify({ body }),
  })
}

export function replyToSupportTicketAsAdmin(id: string, body: string) {
  return apiFetch<SupportTicketDetail>(`/admin/support/tickets/${id}/replies`, {
    method: "POST",
    body: JSON.stringify({ body }),
  })
}

export function setSupportTicketStatus(id: string, status: SupportStatus) {
  return apiFetch<SupportTicketDetail>(`/admin/support/tickets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}
