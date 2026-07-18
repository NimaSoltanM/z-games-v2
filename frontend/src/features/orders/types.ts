import type { ConsolePlatform, Zarfiat } from "@/features/games"

export type OrderStatus = "pending" | "paid" | "failed" | "fulfilled"

export type OrderItem = {
  id: string
  game_id: string
  game_name: string
  platform: ConsolePlatform
  zarfiat: Zarfiat
  quantity: number
  pre_order: boolean
  credentials_returned: boolean
  email: string | null
  password: string | null
  passcode: string | null
  verification_code: {
    eligible: boolean
    can_request: boolean
    blocked_reason?: "pending" | "active" | "cooldown"
    next_request_at: string | null
    request: {
      id: string
      status: "pending" | "delivered" | "expired"
      code: string | null
      requested_at: string
      delivered_at: string | null
      expires_at: string | null
    } | null
  } | null
}

export type Order = {
  id: string
  order_number: number
  amount: number
  status: OrderStatus
  created_at: string
  items: OrderItem[]
}

export type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

export type OrdersPage = {
  orders: Order[]
  pagination: Pagination
}

export type OrdersQuery = {
  page?: number
  status?: OrderStatus | ""
}
