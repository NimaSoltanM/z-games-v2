import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ReturnStatus } from "./types"

export type ReturnStatusMeta = {
  label: string
  icon: LucideIcon
  className: string
}

// Customer- and admin-facing status presentation for a return request.
export const RETURN_STATUS_META: Record<ReturnStatus, ReturnStatusMeta> = {
  pending: {
    label: "در حال بررسی",
    icon: Clock,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  approved: {
    label: "تأیید شد",
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  rejected: {
    label: "نیازمند اصلاح",
    icon: AlertTriangle,
    className:
      "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  refused: {
    label: "رد شد",
    icon: XCircle,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
}

// Human label for a wallet ledger entry's reason.
const WALLET_REASON_LABEL: Record<string, string | undefined> = {
  return_credit: "اعتبار بازگشت بازی",
  order_payment: "پرداخت سفارش",
  order_refund: "بازگشت وجه سفارش",
}

export function walletReasonLabel(reason: string): string {
  return WALLET_REASON_LABEL[reason] ?? reason
}

// An ISO timestamp as a Persian (Jalali) calendar date.
export function formatReturnDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
