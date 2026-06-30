import { apiFetch } from "@/lib/api-client"

// Result of a checkout: either a ZarinPal gateway URL to redirect to, or — when the
// user's wallet fully covered the order — `paid: true` with the new order number
// (no gateway step).
export type CheckoutResult = {
  payment_url?: string
  paid?: boolean
  order_number?: number
}

// Creates an order from the current server cart, applying any wallet balance and
// starting a ZarinPal payment for the remainder (skipped if the wallet covers it).
export function checkoutOrder(input: { referral_code?: string }) {
  return apiFetch<CheckoutResult>("/orders/checkout", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
