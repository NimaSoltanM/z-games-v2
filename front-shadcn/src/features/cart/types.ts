import type { ConsolePlatform, Zarfiat } from "@/features/games"

export type CartItem = {
  gameId: string
  gameName: string
  coverImage: string | null
  platform: ConsolePlatform
  zarfiat: Zarfiat
  quantity: number
}

export type CartState = {
  items: CartItem[]
}
