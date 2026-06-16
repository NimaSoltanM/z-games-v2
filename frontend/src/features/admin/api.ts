import { apiFetch } from "@/lib/api-client"
import type { AdminOrder, FulfillItem } from "./types"

// Saves the credentials for an order's items and flips it to fulfilled (once
// every item has credentials). Returns the updated order.
export function fulfillOrder(orderId: string, items: FulfillItem[]) {
  return apiFetch<AdminOrder>(`/admin/orders/${orderId}/fulfill`, {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}
