import type { Order } from "@/features/orders"

export type AdminOrder = Order & {
  user_phone: string
  user_name: string
}

// Credentials submitted for a single order item when fulfilling.
export type FulfillItem = {
  id: string
  email: string
  password: string
  psn_pass: string
}
