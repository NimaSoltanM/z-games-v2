import { createFileRoute, ErrorComponent, Link, redirect } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ArrowRight, Clock, XCircle, KeyRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { getMeFn } from "@/features/auth"
import { orderQueryOptions } from "@/features/orders"
import type { OrderStatus } from "@/features/orders"
import { formatToman, PLATFORM_LABEL, PLATFORM_BADGE_CLASS, ZARFIAT_LABEL } from "@/features/games"

const STATUS_META: Record<OrderStatus, { label: string; icon: LucideIcon }> = {
  paid: { label: "در حال آماده‌سازی", icon: Clock },
  pending: { label: "در انتظار پرداخت", icon: Clock },
  failed: { label: "ناموفق", icon: XCircle },
}

function OrderError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/$orderId")({
  beforeLoad: async ({ params }) => {
    const me = await getMeFn()
    if (!me) throw redirect({ to: "/auth", search: { redirect: `/dashboard/${params.orderId}` } })
  },
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(orderQueryOptions(params.orderId))
  },
  component: OrderDetailPage,
  errorComponent: OrderError,
})

function OrderDetailPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <div className="relative min-h-[calc(100vh-57px)] bg-background bg-grid-lines">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          بازگشت به سفارش‌ها
        </Link>

        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div className="py-20 text-center">
              <p className="mb-4 text-sm text-muted-foreground">خطا در بارگذاری سفارش</p>
              <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
                تلاش مجدد
              </Button>
            </div>
          )}
        >
          <Suspense fallback={<OrderDetailSkeleton />}>
            <OrderDetail />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

function OrderDetail() {
  const { orderId } = Route.useParams()
  const { data: order } = useSuspenseQuery(orderQueryOptions(orderId))

  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="text-base font-semibold">سفارش یافت نشد</p>
        <p className="mt-1 text-sm text-muted-foreground">این سفارش وجود ندارد یا متعلق به شما نیست</p>
      </div>
    )
  }

  const meta = STATUS_META[order.status]
  const StatusIcon = meta.icon
  const date = new Date(order.created_at).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">جزئیات سفارش</h1>
            <p className="mt-1 text-xs text-muted-foreground">{date}</p>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <StatusIcon className="size-3.5" />
            {meta.label}
          </Badge>
        </div>

        <Separator className="my-5" />

        <div className="space-y-3">
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{it.game_name}</span>
                <Badge
                  variant="secondary"
                  className={`shrink-0 border text-xs ${PLATFORM_BADGE_CLASS[it.platform]}`}
                >
                  {PLATFORM_LABEL[it.platform]}
                </Badge>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {ZARFIAT_LABEL[it.zarfiat]}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                × {it.quantity}
              </span>
            </div>
          ))}
        </div>

        <Separator className="my-5" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">مبلغ پرداختی</span>
          <span className="text-base font-bold text-primary">{formatToman(order.amount)}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground/70">
          شماره سفارش: <span dir="ltr" className="font-mono">{order.id}</span>
        </p>
      </div>

      {/* Credentials — delivered by support after the order is prepared. */}
      <div className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <KeyRound className="size-4" />
          </div>
          <p className="text-sm font-semibold">اطلاعات اکانت</p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          سفارش شما در حال آماده‌سازی است. به‌محض آماده شدن، ایمیل، رمز عبور و PSN-pass اکانت
          همین‌جا برای شما نمایش داده می‌شود.
        </p>
      </div>
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/75 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <Separator className="my-5" />
      <Skeleton className="h-4 w-2/3" />
      <Separator className="my-5" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  )
}
