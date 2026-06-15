import { apiFetch } from "@/lib/api-client"

// Creates an order from the current server cart and starts a ZarinPal payment.
// Returns the gateway URL the browser should be sent to.
export function checkoutOrder(input: { referral_code?: string }) {
  return apiFetch<{ payment_url: string }>("/orders/checkout", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
