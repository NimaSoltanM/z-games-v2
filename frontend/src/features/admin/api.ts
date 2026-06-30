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

// Fulfills one order item from returned-account inventory: the chosen approved
// return's credentials are copied onto the item and that return is consumed.
// Returns the updated order (with refreshed inventory).
export function reuseReturnedAccount(
  orderId: string,
  itemId: string,
  returnId: string
) {
  return apiFetch<AdminOrder>(
    `/admin/orders/${orderId}/items/${itemId}/reuse`,
    {
      method: "POST",
      body: JSON.stringify({ return_id: returnId }),
    }
  )
}
