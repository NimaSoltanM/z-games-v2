import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useMutation,
  useQueryClient,
  useQueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Suspense, useEffect, useRef, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { CheckCircle2, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"

import { DashboardHeader } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  adminSupportTicketQueryOptions,
  formatSupportDate,
  formatTicketNumber,
  replyToSupportTicketAsAdmin,
  setSupportTicketStatus,
  SUPPORT_CATEGORY_LABELS,
  TicketCorrespondence,
  TicketStatusBadge,
} from "@/features/support"
import type { SupportStatus, SupportTicketDetail } from "@/features/support"

function DetailError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/support/$id")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(adminSupportTicketQueryOptions(params.id))
  },
  component: AdminSupportDetailPage,
  errorComponent: DetailError,
})

function AdminSupportDetailPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <>
      <DashboardHeader
        title="رسیدگی به درخواست"
        back={{
          to: "/admin/support",
          search: { page: 1, status: "", search: "" },
          label: "پشتیبانی مشتریان",
        }}
      />
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری درخواست
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<DetailSkeleton />}>
          <Detail />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function Detail() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const { data, isFetching } = useSuspenseQuery(
    adminSupportTicketQueryOptions(id)
  )
  const previousMessageCount = useRef(data?.message_count ?? 0)
  const [body, setBody] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const count = data?.message_count ?? 0
    if (count > previousMessageCount.current) {
      toast.info("پاسخ جدیدی از مشتری دریافت شد")
    }
    previousMessageCount.current = count
  }, [data?.message_count])

  const syncTicket = (ticket: SupportTicketDetail) => {
    previousMessageCount.current = ticket.message_count
    queryClient.setQueryData(
      adminSupportTicketQueryOptions(id).queryKey,
      ticket
    )
    queryClient.invalidateQueries({ queryKey: ["admin", "support", "list"] })
  }
  const reply = useMutation({
    mutationFn: () => replyToSupportTicketAsAdmin(id, body.trim()),
    onSuccess: (ticket) => {
      syncTicket(ticket)
      setBody("")
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "ارسال پاسخ انجام نشد"),
  })
  const status = useMutation({
    mutationFn: (value: SupportStatus) => setSupportTicketStatus(id, value),
    onSuccess: syncTicket,
    onError: (err) =>
      setError(err instanceof Error ? err.message : "تغییر وضعیت انجام نشد"),
  })

  if (!data)
    return (
      <div className="rounded-2xl border border-border/60 bg-card/75 p-8 text-center text-sm text-muted-foreground">
        درخواست موردنظر یافت نشد.
      </div>
    )
  const busy = reply.isPending || status.isPending

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <TicketCorrespondence ticket={data} />
        <form
          className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm"
          onSubmit={(event) => {
            event.preventDefault()
            if (!body.trim()) return
            setError("")
            reply.mutate()
          }}
        >
          <label
            htmlFor="admin-support-reply"
            className="text-sm font-semibold"
          >
            پاسخ پشتیبانی
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            با ثبت پاسخ، وضعیت درخواست به «در انتظار پاسخ مشتری» تغییر می‌کند.
          </p>
          <Textarea
            id="admin-support-reply"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={6}
            className="mt-3"
            placeholder="پاسخ کامل و قابل اقدام برای مشتری…"
            disabled={busy}
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {isFetching && (
                <span className="inline-flex items-center gap-1">
                  <RefreshCw className="size-3 animate-spin" />
                  در حال همگام‌سازی
                </span>
              )}
            </span>
            <Button type="submit" disabled={!body.trim() || busy}>
              <Send className="size-4" />
              {reply.isPending ? "در حال ارسال…" : "ثبت پاسخ"}
            </Button>
          </div>
        </form>
      </div>
      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span dir="ltr" className="font-mono text-sm">
              {formatTicketNumber(data.ticket_number)}
            </span>
            <TicketStatusBadge status={data.status} admin />
          </div>
          <h2 className="mt-4 font-semibold">{data.subject}</h2>
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4 text-sm">
            <InfoRow label="مشتری">
              <span>
                {data.user_name?.trim() || "کاربر"}
                <br />
                <span
                  dir="ltr"
                  className="font-mono text-xs text-muted-foreground"
                >
                  {data.user_phone}
                </span>
              </span>
            </InfoRow>
            <InfoRow label="موضوع">
              <Badge variant="secondary">
                {SUPPORT_CATEGORY_LABELS[data.category]}
              </Badge>
            </InfoRow>
            <InfoRow label="تاریخ ثبت">
              {formatSupportDate(data.created_at)}
            </InfoRow>
            <InfoRow label="مکاتبات">
              {data.message_count.toLocaleString("fa-IR")}
            </InfoRow>
          </div>
        </section>
        <section className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
          <p className="text-sm font-semibold">وضعیت درخواست</p>
          <p className="mt-1 text-xs text-muted-foreground">
            وضعیت را بر اساس اقدام بعدی موردنیاز انتخاب کنید.
          </p>
          <div className="mt-4 grid gap-2">
            <Button
              variant={
                data.status === "awaiting_admin" ? "secondary" : "outline"
              }
              size="sm"
              disabled={busy || data.status === "awaiting_admin"}
              onClick={() => status.mutate("awaiting_admin")}
            >
              نیازمند پاسخ پشتیبانی
            </Button>
            <Button
              variant={
                data.status === "awaiting_customer" ? "secondary" : "outline"
              }
              size="sm"
              disabled={busy || data.status === "awaiting_customer"}
              onClick={() => status.mutate("awaiting_customer")}
            >
              در انتظار پاسخ مشتری
            </Button>
            <Button
              variant={data.status === "resolved" ? "secondary" : "outline"}
              size="sm"
              disabled={busy || data.status === "resolved"}
              onClick={() => status.mutate("resolved")}
            >
              <CheckCircle2 className="size-4" />
              پاسخ‌داده‌شده
            </Button>
          </div>
        </section>
      </aside>
    </div>
  )
}

function InfoRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-left">{children}</span>
    </div>
  )
}
function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Skeleton className="h-[560px] rounded-2xl" />
      <div className="space-y-5">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  )
}
