import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  formatSupportDate,
  formatTicketNumber,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_META,
} from "./display"
import type { SupportTicketDetail, SupportTicketRow } from "./types"

export function TicketStatusBadge({
  status,
  admin = false,
}: {
  status: SupportTicketRow["status"]
  admin?: boolean
}) {
  const meta = SUPPORT_STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge variant="secondary" className={cn("gap-1.5 border", meta.className)}>
      <Icon className="size-3.5" />
      <span className="sm:hidden">{meta.shortLabel}</span>
      <span className="hidden sm:inline">
        {admin ? meta.adminLabel : meta.label}
      </span>
    </Badge>
  )
}

export function TicketSummary({
  ticket,
  admin = false,
}: {
  ticket: SupportTicketRow
  admin?: boolean
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span dir="ltr" className="font-mono text-xs text-muted-foreground">
          {formatTicketNumber(ticket.ticket_number)}
        </span>
        <span className="truncate font-semibold">{ticket.subject}</span>
        <Badge variant="secondary">
          {SUPPORT_CATEGORY_LABELS[ticket.category]}
        </Badge>
      </div>
      {admin && (
        <p className="mt-1 text-xs text-muted-foreground">
          {ticket.user_name?.trim() || "کاربر"} ·{" "}
          <span dir="ltr" className="font-mono">
            {ticket.user_phone}
          </span>
        </p>
      )}
      <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
        {ticket.last_message}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {ticket.message_count.toLocaleString("fa-IR")} مکاتبه · آخرین
        به‌روزرسانی {formatSupportDate(ticket.updated_at)}
      </p>
    </div>
  )
}

export function TicketCorrespondence({
  ticket,
}: {
  ticket: SupportTicketDetail
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
      <div className="px-5 py-4">
        <h2 className="font-semibold">مکاتبات درخواست</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          پاسخ‌ها به ترتیب زمان ثبت نمایش داده می‌شوند.
        </p>
      </div>
      <Separator />
      <div
        className="divide-y divide-border/60"
        aria-live="polite"
        aria-relevant="additions"
      >
        {ticket.messages.map((message, index) => {
          const isAdmin = message.author_role !== "user"
          return (
            <article
              key={message.id}
              className={cn("relative p-5", isAdmin && "bg-primary/4")}
            >
              <div
                className={cn(
                  "absolute inset-y-4 right-0 w-0.5",
                  isAdmin ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {isAdmin
                      ? "پشتیبانی زد گیمز"
                      : message.author_name.trim() || "شما"}
                  </span>
                  {index === 0 && <Badge variant="outline">شرح اولیه</Badge>}
                </div>
                <time className="text-xs text-muted-foreground">
                  {formatSupportDate(message.created_at)}
                </time>
              </header>
              <p className="text-sm leading-7 whitespace-pre-wrap">
                {message.body}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
