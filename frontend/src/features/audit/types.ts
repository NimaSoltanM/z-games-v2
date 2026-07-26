import type { Pagination } from "@/features/orders"

// Audit metadata only ever holds JSON scalars, which keeps the server-fn return
// type serializable.
type JsonScalar = string | number | boolean | null

export type ChangeEntry = { from: JsonScalar; to: JsonScalar }

export type PriceChange = {
  platform: string
  zarfiat?: string
  kind: "base_usd" | "toman"
  from: number | null
  to: number | null
}

// Metadata is action-specific JSON. All fields are optional; describeAction()
// reads it defensively.
export type AuditMetadata = {
  name?: string
  active?: boolean
  changes?: Record<string, ChangeEntry>
  price_changes?: PriceChange[]
  release_status?: string
  date_updated?: boolean
  cleared?: boolean
  variant?: string
  status?: string
  items?: number
  usd_to_toman?: number
  available?: boolean
  order_id?: string
  order_item_id?: string
  mode?: string
  duplicate_override?: number
  returned_accounts_consumed?: number
  expires_at?: string
}

export type AuditRow = {
  id: string
  admin_id: string
  admin_name: string
  admin_phone: string
  action: string
  target_type: string | null
  target_id: string | null
  metadata: AuditMetadata | null
  created_at: string
}

export type AuditPage = {
  actions: AuditRow[]
  pagination: Pagination
}

export type AuditActor = {
  id: string
  name: string
  phone: string
}

export type AuditQuery = {
  page?: number
  action?: string
  admin_id?: string
}
