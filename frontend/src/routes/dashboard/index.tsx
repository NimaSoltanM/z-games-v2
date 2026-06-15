import { createFileRoute, ErrorComponent, Link, redirect } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Package, Clock, XCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { getMeFn } from "@/features/auth"
import { ordersQueryOptions } from "@/features/orders"
import type { Order, OrderStatus } from "@/features/orders"
import { formatToman, PLATFORM_LABEL, PLATFORM_BADGE_CLASS, ZARFIAT_LABEL } from "@/features/games"

const GAMES_SEARCH = { page: 1, platform: "", zarfiat: "", search: "", sort: "-created_at" } as const

const STATUS_META: Record<OrderStatus, { label: string; icon: LucideIcon }> = {
  paid: { label: "در حال آماده‌سازی", icon: Clock },
  pending: { label: "در انتظار پرداخت", icon: Clock },
  failed: { label: "ناموفق", icon: XCircle },
}

function DashboardError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: async () => {
    const me = await getMeFn()
    if (!me) throw redirect({ to: "/auth", search: { redirect: "/dashboard" } })
  },
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(ordersQueryOptions())
  },
  component: DashboardPage,
  errorComponent: DashboardError,
})

function DashboardPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <div className="relative min-h-[calc(100vh-57px)] bg-background bg-grid-lines">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold">سفارش‌های من</h1>

        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div className="py-20 text-center">
              <p className="mb-4 text-sm text-muted-foreground">خطا در بارگذاری سفارش‌ها</p>
              <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
                تلاش مجدد
              </Button>
            </div>
          )}
        >
          <Suspense fallback={<OrdersSkeleton />}>
            <OrdersList />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

function OrdersList() {
  const { data } = useSuspenseQuery(ordersQueryOptions())

  if (data.orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <Package className="size-8 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">هنوز سفارشی ندارید</p>
          <p className="text-sm text-muted-foreground">اولین بازی‌ات رو انتخاب کن</p>
        </div>
        <Link to="/games" search={GAMES_SEARCH}>
          <Button>مشاهده بازی‌ها</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const meta = STATUS_META[order.status]
  const StatusIcon = meta.icon
  const date = new Date(order.created_at).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Link
      to="/dashboard/$orderId"
      params={{ orderId: order.id }}
      className="block rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{date}</p>
        <Badge variant="secondary" className="gap-1.5">
          <StatusIcon className="size-3.5" />
          {meta.label}
        </Badge>
      </div>

      <Separator className="my-4" />

      <div className="space-y-2.5">
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

      <Separator className="my-4" />

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">مبلغ پرداختی</span>
        <span className="text-sm font-bold text-primary">{formatToman(order.amount)}</span>
      </div>
    </Link>
  )
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card/75 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <Separator className="my-4" />
          <Skeleton className="h-4 w-2/3" />
          <Separator className="my-4" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
