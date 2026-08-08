export type SupportCategory =
  | "order"
  | "account"
  | "payment"
  | "return"
  | "other"
export type SupportStatus = "awaiting_admin" | "awaiting_customer" | "resolved"

export type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

export type SupportTicketRow = {
  id: string
  ticket_number: number
  subject: string
  category: SupportCategory
  status: SupportStatus
  message_count: number
  last_message: string
  created_at: string
  updated_at: string
  user_name?: string
  user_phone?: string
}

export type SupportMessage = {
  id: string
  author_id: string
  author_role: "user" | "admin" | "super_admin"
  author_name: string
  body: string
  created_at: string
}

export type SupportTicketDetail = SupportTicketRow & {
  messages: SupportMessage[]
}

export type SupportTicketsPage = {
  tickets: SupportTicketRow[]
  pagination: Pagination
}

export type AdminSupportQuery = {
  page?: number
  status?: SupportStatus | ""
  search?: string
}
