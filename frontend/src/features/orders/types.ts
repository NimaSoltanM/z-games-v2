import type { ConsolePlatform, Zarfiat } from "@/features/games"

export type OrderStatus = "pending" | "paid" | "failed"

export type OrderItem = {
  game_id: string
  game_name: string
  platform: ConsolePlatform
  zarfiat: Zarfiat
  quantity: number
}

export type Order = {
  id: string
  amount: number
  status: OrderStatus
  created_at: string
  items: OrderItem[]
}
