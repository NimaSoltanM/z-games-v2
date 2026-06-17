import type { Order, Pagination } from "@/features/orders"

export type AdminOrder = Order & {
  user_phone: string
  user_name: string
  authority: string | null
}

export type AdminOrdersPage = {
  orders: AdminOrder[]
  pagination: Pagination
}

export type AdminOrdersQuery = {
  page?: number
  status?: "paid" | "pending" | "fulfilled" | ""
  search?: string
}

// Credentials submitted for a single order item when fulfilling.
export type FulfillItem = {
  id: string
  email: string
  password: string
  psn_pass: string
}
