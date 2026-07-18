import type { Order, Pagination } from "@/features/orders"

// A returned account available to reuse for an order item (same game + console +
// capacity), offered on the fulfillment screen.
export type InventoryAccount = {
  return_id: string
  returned_at: string
}

export type AdminOrder = Order & {
  user_phone: string
  user_name: string
  authority: string | null
  // Keyed by undelivered item id → returned accounts that can fill it. A key is
  // absent (undefined) for items with no matching stock.
  inventory: Record<string, InventoryAccount[] | undefined>
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
  passcode: string
}

export type CredentialMatch = {
  order_id: string
  order_number: number
  item_id: string
  game_name: string
  console: string
  capacity: string
}

export type CredentialWarning = {
  item_id: string
  email: string
  matches: CredentialMatch[]
}

export type DuplicateCredentialsError = {
  code: "DUPLICATE_CREDENTIALS"
  message: string
  warnings: CredentialWarning[]
}
