import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Video, VideoOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard-shell"
import {
  adminReturnQueryOptions,
  approveReturn,
  rejectReturn,
  refuseReturn,
  returnVideoUrl,
  RETURN_STATUS_META,
  formatReturnDate,
} from "@/features/returns"
import type { AdminReturnDetail } from "@/features/returns"
import { formatOrderNumber } from "@/features/orders"
import {
  formatToman,
  consoleLabel,
  capacityLabel,
  platformBadgeClass,
  passcodeLabel,
} from "@/features/games"
import { cn } from "@/lib/utils"

function DetailError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/returns/$id")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(adminReturnQueryOptions(params.id))
  },
  component: DetailPage,
  errorComponent: DetailError,
})

function DetailPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <>
      <DashboardHeader
        title="بررسی درخواست بازگشت"
        back={{
          to: "/admin/returns",
          search: { page: 1, status: "", search: "" },
          label: "بازگشت‌ها",
        }}
      />
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری
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
  const { data } = useSuspenseQuery(adminReturnQueryOptions(id))

  if (!data) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/75 p-8 text-center backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">
          درخواست موردنظر یافت نشد.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <VideoCard ret={data} />
        <AccountCard ret={data} />
      </div>
      <div className="space-y-5">
        <SummaryCard ret={data} />
        {data.status === "pending" ? (
          <ReviewPanel ret={data} />
        ) : (
          <OutcomeCard ret={data} />
        )}
      </div>
    </div>
  )
}

function VideoCard({ ret }: { ret: AdminReturnDetail }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3 text-sm font-semibold">
        <Video className="size-4" />
        ویدیوی خروج از حساب
      </div>
      {ret.has_video ? (
        <video
          key={ret.id}
          src={returnVideoUrl(ret.id)}
          crossOrigin="use-credentials"
          controls
          className="aspect-video w-full bg-black"
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-background/40 text-muted-foreground">
          <VideoOff className="size-7 opacity-50" />
          <span className="text-xs">
            ویدیویی موجود نیست (پس از تأیید حذف می‌شود)
          </span>
        </div>
      )}
    </div>
  )
}

function AccountCard({ ret }: { ret: AdminReturnDetail }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
      <p className="mb-3 text-sm font-semibold">اطلاعات حساب بازگردانده‌شده</p>
      <div className="space-y-2">
        <CredRow label="ایمیل" value={ret.account_email} />
        <CredRow label="رمز عبور" value={ret.account_password} />
        <CredRow
          label={passcodeLabel(ret.console)}
          value={ret.account_passcode}
        />
      </div>
    </div>
  )
}

function CredRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span dir="ltr" className="truncate font-mono text-sm">
        {value || "—"}
      </span>
    </div>
  )
}

function SummaryCard({ ret }: { ret: AdminReturnDetail }) {
  const meta = RETURN_STATUS_META[ret.status]
  const Icon = meta.icon
  return (
    <div className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{ret.game_name}</span>
          <Badge
            variant="secondary"
            className={cn("border text-xs", platformBadgeClass(ret.console))}
          >
            {consoleLabel(ret.console)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {capacityLabel(ret.capacity)}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={cn("gap-1.5 border", meta.className)}
        >
          <Icon className="size-3.5" />
          {meta.label}
        </Badge>
      </div>
      <Separator className="my-3" />
      <dl className="space-y-2 text-sm">
        <Row label="خریدار">
          {ret.user_name.trim() || "—"} ·{" "}
          <span dir="ltr" className="font-mono">
            {ret.user_phone}
          </span>
        </Row>
        <Row label="شماره سفارش">
          <span dir="ltr" className="font-mono">
            {formatOrderNumber(ret.order_number)}
          </span>
        </Row>
        <Row label="تاریخ خرید">{formatReturnDate(ret.purchased_at)}</Row>
        <Row label="قیمت فعلی فروشگاه">
          {ret.estimate.available
            ? formatToman(ret.estimate.current_price)
            : "موجود نیست"}
        </Row>
        <Row label="اعتبار پیشنهادی">
          {ret.estimate.available ? (
            <span className="font-semibold text-primary">
              {formatToman(ret.estimate.net_credit)}
            </span>
          ) : (
            "—"
          )}
        </Row>
      </dl>
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-left">{children}</dd>
    </div>
  )
}

function ReviewPanel({ ret }: { ret: AdminReturnDetail }) {
  const qc = useQueryClient()
  const [credit, setCredit] = useState(
    ret.estimate.available ? String(ret.estimate.net_credit) : ""
  )
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  const invalidate = () =>
    qc
      .invalidateQueries({ queryKey: ["admin", "returns"] })
      .then(() => qc.invalidateQueries({ queryKey: ["returns"] }))

  const approve = useMutation({
    mutationFn: () => approveReturn(ret.id, Number(credit)),
    onSuccess: invalidate,
    onError: (e) => setError(e instanceof Error ? e.message : "خطا"),
  })
  const review = useMutation({
    mutationFn: (kind: "reject" | "refuse") =>
      kind === "reject"
        ? rejectReturn(ret.id, reason.trim())
        : refuseReturn(ret.id, reason.trim()),
    onSuccess: invalidate,
    onError: (e) => setError(e instanceof Error ? e.message : "خطا"),
  })

  const busy = approve.isPending || review.isPending
  const creditValid = Number(credit) > 0

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          تأیید و واریز اعتبار
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          مبلغ به کیف پول خریدار واریز می‌شود. به‌صورت پیش‌فرض قیمت فعلی منهای
          کارمزد است؛ در صورت نیاز ویرایش کنید.
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            placeholder="مبلغ به تومان"
            disabled={busy}
            dir="ltr"
            className="text-left"
          />
          <Button
            disabled={busy || !creditValid}
            onClick={() => {
              setError("")
              approve.mutate()
            }}
          >
            تأیید
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          رد یا درخواست اصلاح
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          دلیل را بنویسید. «نیازمند اصلاح» به کاربر اجازه می‌دهد ویدیو را اصلاح
          و دوباره ارسال کند؛ «رد نهایی» قطعی است و قابل بازگشت نیست.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          disabled={busy}
          placeholder="دلیل برای کاربر…"
          className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
        <div className="mt-2 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy || !reason.trim()}
            onClick={() => {
              setError("")
              review.mutate("reject")
            }}
          >
            نیازمند اصلاح
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={busy || !reason.trim()}
            onClick={() => {
              setError("")
              review.mutate("refuse")
            }}
          >
            رد نهایی
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function OutcomeCard({ ret }: { ret: AdminReturnDetail }) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card/75 p-5 text-sm backdrop-blur-sm">
      {ret.status === "approved" && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">اعتبار واریزشده</span>
          <span className="font-semibold text-primary">
            {formatToman(ret.credit_amount)}
          </span>
        </div>
      )}
      {ret.reason && (
        <div>
          <p className="text-muted-foreground">دلیل</p>
          <p className="mt-0.5">{ret.reason}</p>
        </div>
      )}
      {ret.reviewed_at && (
        <p className="text-xs text-muted-foreground">
          بررسی‌شده در {formatReturnDate(ret.reviewed_at)}
        </p>
      )}
      {ret.reused_at && (
        <p className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
          ♻️ این حساب برای تکمیل یک سفارش دیگر استفاده شده است.
        </p>
      )}
      {ret.status === "rejected" && (
        <p className="text-xs text-muted-foreground">
          کاربر می‌تواند ویدیو را اصلاح و دوباره ارسال کند.
        </p>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <div className="space-y-5">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}
