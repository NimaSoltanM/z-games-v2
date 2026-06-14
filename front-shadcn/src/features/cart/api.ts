import { apiFetch } from "@/lib/api-client"
import type { ConsolePlatform, Zarfiat } from "@/features/games"

export type ServerCartItem = {
  id: string
  game_id: string
  game_name: string
  cover_image: string | null
  platform: ConsolePlatform
  zarfiat: Zarfiat
  quantity: number
}

export type ServerCartResponse = { items: ServerCartItem[] }

type ItemKey = { game_id: string; platform: ConsolePlatform; zarfiat: Zarfiat }
type ItemPayload = ItemKey & { quantity: number }

export function addServerCartItem(payload: ItemPayload) {
  return apiFetch<{ message: string }>("/cart/items", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateServerCartItem(payload: ItemPayload) {
  return apiFetch<{ message: string }>("/cart/items", {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function removeServerCartItem(payload: ItemKey) {
  return apiFetch<{ message: string }>("/cart/items", {
    method: "DELETE",
    body: JSON.stringify(payload),
  })
}

export function clearServerCart() {
  return apiFetch<{ message: string }>("/cart/", { method: "DELETE" })
}

export function mergeServerCart(items: ItemPayload[]) {
  return apiFetch<{ message: string }>("/cart/merge", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}
