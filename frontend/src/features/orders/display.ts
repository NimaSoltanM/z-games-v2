import { CheckCircle2, Clock, XCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { OrderStatus } from "./types"

// Customer-facing status presentation, shared by the dashboard list & detail.
// `className` colors a Badge (border/bg/text). The admin queue uses its own.
export type OrderStatusMeta = {
  label: string
  icon: LucideIcon
  className: string
}

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  fulfilled: {
    label: "تحویل شد",
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  paid: {
    label: "در حال آماده‌سازی",
    icon: Clock,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  pending: {
    label: "در انتظار پرداخت",
    icon: Clock,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  failed: {
    label: "ناموفق",
    icon: XCircle,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
}

// Shown for a pre-order line that isn't deliverable yet: credentials are
// deliberately withheld until the game launches, so the copy explains the wait
// rather than implying we're slow.
export const PRE_ORDER_CREDENTIALS_NOTE =
  "این بازی در مرحله‌ی پیش‌خرید است؛ اطلاعات حساب پس از انتشار رسمی بازی برای شما تحویل داده می‌شود."

// The short, human-readable order number customers read to support. Kept in
// Latin digits (not Persian) so it's unambiguous when spoken, typed, or searched.
export function formatOrderNumber(n: number): string {
  return `#${n}`
}

// Formats an order's ISO timestamp as a Persian (Jalali) calendar date.
export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
