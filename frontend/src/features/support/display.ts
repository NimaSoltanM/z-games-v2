import { CheckCircle2, Clock3, UserRound } from "lucide-react"
import type { SupportCategory, SupportStatus } from "./types"

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  order: "سفارش و تحویل",
  account: "حساب بازی",
  payment: "پرداخت و کیف پول",
  return: "بازگشت بازی",
  other: "سایر موارد",
}

export const SUPPORT_STATUS_META = {
  awaiting_admin: {
    label: "در انتظار پاسخ پشتیبانی",
    adminLabel: "نیازمند پاسخ پشتیبانی",
    shortLabel: "منتظر پشتیبانی",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: Clock3,
  },
  awaiting_customer: {
    label: "در انتظار پاسخ شما",
    adminLabel: "در انتظار پاسخ مشتری",
    shortLabel: "منتظر مشتری",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    icon: UserRound,
  },
  resolved: {
    label: "پاسخ‌داده‌شده",
    adminLabel: "پاسخ‌داده‌شده",
    shortLabel: "پاسخ‌داده‌شده",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
} satisfies Record<
  SupportStatus,
  {
    label: string
    adminLabel: string
    shortLabel: string
    className: string
    icon: typeof Clock3
  }
>

export function formatSupportDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatTicketNumber(value: number): string {
  return `#${value.toLocaleString("fa-IR", { useGrouping: false })}`
}
