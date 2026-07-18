import type { Pagination } from "@/features/orders"

export type VerificationRequestStatus = "pending" | "delivered" | "expired"

export type AdminVerificationRequest = {
  id: string
  status: VerificationRequestStatus
  code: string | null
  requested_at: string
  delivered_at: string | null
  expires_at: string | null
  order_item_id: string
  order_id: string
  order_number: number
  game_name: string
  platform: string
  capacity: string
  user_id: string
  user_name: string
  user_phone: string
}

export type VerificationRequestsPage = {
  requests: AdminVerificationRequest[]
  pagination: Pagination
}

export type VerificationRequestsQuery = {
  page?: number
  status?: VerificationRequestStatus | ""
  search?: string
}

export type VerificationCodeMatch = {
  request_id: string
  order_id: string
  order_number: number
  game_name: string
  user_name: string
  user_phone: string
}

export type DuplicateVerificationCodeError = {
  code: "DUPLICATE_VERIFICATION_CODE"
  message: string
  matches: VerificationCodeMatch[]
}
