export type ReturnStatus = "pending" | "approved" | "rejected" | "refused"

export type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

// The money preview for a return. `available` is false when the game/capacity is
// delisted — then no numbers are shown and the admin sets the credit by hand.
// `promo` is true when a reduced-fee window is live (net_credit > normal_credit).
export type CreditEstimate = {
  available: boolean
  current_price: number
  fee_pct: number
  net_credit: number
  normal_fee_pct: number
  normal_credit: number
  promo: boolean
}

// One delivered account the user holds, with whether it can be returned and the
// credit they'd get back.
export type OwnedItem = {
  item_id: string
  game_id: string
  game_name: string
  console: string
  capacity: string
  order_number: number
  purchased_at: string
  pre_order: boolean
  returnable: boolean
  return_id: string | null
  return_status: ReturnStatus | null
  return_reason: string | null
  credit_amount: number | null
  estimate: CreditEstimate
}

export type OwnedPage = {
  items: OwnedItem[]
  pagination: Pagination
}

export type MyReturn = {
  id: string
  item_id: string
  game_name: string
  console: string
  capacity: string
  status: ReturnStatus
  reason: string | null
  credit_amount: number | null
  created_at: string
  updated_at: string
}

export type MyReturnsPage = {
  returns: MyReturn[]
  pagination: Pagination
}

export type WalletTxn = {
  amount: number
  reason: string
  created_at: string
}

export type Wallet = {
  balance: number
  transactions: WalletTxn[]
}

// --- admin ------------------------------------------------------------------

export type AdminReturnRow = {
  id: string
  status: ReturnStatus
  game_name: string
  console: string
  capacity: string
  user_phone: string
  user_name: string
  credit_amount: number | null
  created_at: string
}

export type AdminReturnsPage = {
  returns: AdminReturnRow[]
  pagination: Pagination
}

export type AdminReturnDetail = {
  id: string
  status: ReturnStatus
  reason: string | null
  credit_amount: number | null
  has_video: boolean
  created_at: string
  updated_at: string
  reviewed_at: string | null
  reused_at: string | null
  game_id: string
  game_name: string
  console: string
  capacity: string
  pre_order: boolean
  order_number: number
  purchased_at: string
  user_phone: string
  user_name: string
  account_email: string | null
  account_password: string | null
  account_passcode: string | null
  estimate: CreditEstimate
}

export type AdminReturnsQuery = {
  page?: number
  status?: ReturnStatus | ""
  search?: string
}
