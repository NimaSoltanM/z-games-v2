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
import { RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"

import { DashboardHeader } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  formatSupportDate,
  formatTicketNumber,
  mySupportTicketQueryOptions,
  replyToSupportTicket,
  SUPPORT_CATEGORY_LABELS,
  TicketCorrespondence,
  TicketStatusBadge,
} from "@/features/support"

function DetailError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/support/$id")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(mySupportTicketQueryOptions(params.id))
  },
  component: SupportDetailPage,
  errorComponent: DetailError,
})

function SupportDetailPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <>
      <DashboardHeader
        title="جزئیات درخواست"
        back={{
          to: "/dashboard/support",
          search: { page: 1 },
          label: "پشتیبانی",
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
  const { data, isFetching } = useSuspenseQuery(mySupportTicketQueryOptions(id))
  const previousMessageCount = useRef(data?.message_count ?? 0)
  const [body, setBody] = useState("")
  const [error, setError] = useState("")
  useEffect(() => {
    const count = data?.message_count ?? 0
    if (count > previousMessageCount.current) {
      toast.info("پاسخ جدیدی از پشتیبانی دریافت شد")
    }
    previousMessageCount.current = count
  }, [data?.message_count])
  const reply = useMutation({
    mutationFn: () => replyToSupportTicket(id, body.trim()),
    onSuccess: (ticket) => {
      previousMessageCount.current = ticket.message_count
      queryClient.setQueryData(mySupportTicketQueryOptions(id).queryKey, ticket)
      queryClient.invalidateQueries({ queryKey: ["support", "mine", "list"] })
      setBody("")
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "ارسال پاسخ انجام نشد"),
  })

  if (!data)
    return (
      <div className="rounded-2xl border border-border/60 bg-card/75 p-8 text-center text-sm text-muted-foreground">
        درخواست موردنظر یافت نشد.
      </div>
    )

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
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
          <label htmlFor="support-reply" className="text-sm font-semibold">
            افزودن پاسخ
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            پاسخ شما به همین درخواست اضافه می‌شود و پشتیبانی را مطلع می‌کند.
          </p>
          <Textarea
            id="support-reply"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={5}
            className="mt-3"
            placeholder="پاسخ یا اطلاعات تکمیلی…"
            disabled={reply.isPending}
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {isFetching && (
                <span className="inline-flex items-center gap-1">
                  <RefreshCw className="size-3 animate-spin" />
                  در حال دریافت پاسخ‌های جدید
                </span>
              )}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={!body.trim() || reply.isPending}
            >
              <Send className="size-4" />
              {reply.isPending ? "در حال ارسال…" : "ثبت پاسخ"}
            </Button>
          </div>
        </form>
      </div>
      <aside className="h-fit rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm lg:sticky lg:top-20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span dir="ltr" className="font-mono text-sm">
            {formatTicketNumber(data.ticket_number)}
          </span>
          <TicketStatusBadge status={data.status} />
        </div>
        <h2 className="mt-4 font-semibold">{data.subject}</h2>
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">موضوع</span>
            <Badge variant="secondary">
              {SUPPORT_CATEGORY_LABELS[data.category]}
            </Badge>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">تاریخ ثبت</span>
            <span>{formatSupportDate(data.created_at)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">تعداد مکاتبات</span>
            <span>{data.message_count.toLocaleString("fa-IR")}</span>
          </div>
        </div>
      </aside>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <Skeleton className="h-[520px] rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}
