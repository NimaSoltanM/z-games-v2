import { apiFetch } from "@/lib/api-client"

export function requestFreshVerificationCode(orderItemId: string) {
  return apiFetch<{ id: string; status: "pending"; requested_at: string }>(
    "/verification-code-requests",
    {
      method: "POST",
      body: JSON.stringify({ order_item_id: orderItemId }),
    }
  )
}

export function sendFreshVerificationCode(
  requestId: string,
  code: string,
  allowDuplicate = false
) {
  return apiFetch<{ message: string }>(
    `/admin/verification-code-requests/${requestId}/send`,
    {
      method: "POST",
      body: JSON.stringify({ code, allow_duplicate: allowDuplicate }),
    }
  )
}
