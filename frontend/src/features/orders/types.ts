import type { ConsolePlatform, Zarfiat } from "@/features/games"

export type OrderStatus = "pending" | "paid" | "failed" | "fulfilled"

export type OrderItem = {
  id: string
  game_id: string
  game_name: string
  platform: ConsolePlatform
  zarfiat: Zarfiat
  quantity: number
  email: string | null
  password: string | null
  psn_pass: string | null
}

export type Order = {
  id: string
  amount: number
  status: OrderStatus
  created_at: string
  items: OrderItem[]
}
