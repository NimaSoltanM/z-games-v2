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
  email: string | null
  password: string | null
  psn_pass: string | null
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
