import { CheckCircle2, Clock, XCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { OrderStatus } from "./types"

// Customer-facing status presentation, shared by the dashboard list & detail.
// (The admin queue uses its own labels/colors — different audience.)
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; icon: LucideIcon }> = {
  fulfilled: { label: "تحویل شد", icon: CheckCircle2 },
  paid: { label: "در حال آماده‌سازی", icon: Clock },
  pending: { label: "در انتظار پرداخت", icon: Clock },
  failed: { label: "ناموفق", icon: XCircle },
}

// Formats an order's ISO timestamp as a Persian (Jalali) calendar date.
export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
