import { createFileRoute, ErrorComponent, Link, redirect } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Package, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { OrderStatus } from "@/features/orders"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { getMeFn } from "@/features/auth"
import { adminOrdersQueryOptions } from "@/features/admin"
import type { AdminOrder } from "@/features/admin"
import { formatOrderDate } from "@/features/orders"
import { formatToman, PLATFORM_LABEL, PLATFORM_BADGE_CLASS, ZARFIAT_LABEL } from "@/features/games"

type AdminStatusMeta = { label: string; icon: LucideIcon; className: string }

const STATUS_META: Record<OrderStatus, AdminStatusMeta> = {
  paid: { label: "در انتظار تکمیل", icon: Clock, className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  pending: { label: "بررسی پرداخت", icon: AlertTriangle, className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" },
  fulfilled: { label: "تحویل شد", icon: CheckCircle2, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  failed: { label: "ناموفق", icon: AlertTriangle, className: "border-muted-foreground/30 bg-muted/40 text-muted-foreground" },
}

function AdminOrdersError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/orders/")({
  beforeLoad: async () => {
    const me = await getMeFn()
    if (!me) throw redirect({ to: "/auth", search: { redirect: "/admin/orders" } })
    if (me.role === "user") throw redirect({ to: "/" })
  },
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(adminOrdersQueryOptions())
  },
  component: AdminOrdersPage,
  errorComponent: AdminOrdersError,
})

function AdminOrdersPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <div className="relative min-h-[calc(100vh-57px)] bg-background bg-grid-lines">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold">مدیریت سفارش‌ها</h1>

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
          <Suspense fallback={<AdminOrdersSkeleton />}>
            <AdminOrdersList />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

function AdminOrdersList() {
  const { data } = useSuspenseQuery(adminOrdersQueryOptions())

  if (data.orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <Package className="size-8 text-muted-foreground/40" />
        </div>
        <p className="text-base font-semibold">هنوز سفارش پرداخت‌شده‌ای نیست</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.orders.map((order) => (
        <AdminOrderCard key={order.id} order={order} />
      ))}
    </div>
  )
}

function AdminOrderCard({ order }: { order: AdminOrder }) {
  const meta = STATUS_META[order.status]
  const StatusIcon = meta.icon
  const date = formatOrderDate(order.created_at)
  const fullName = order.user_name.trim()

  return (
    <Link
      to="/admin/orders/$orderId"
      params={{ orderId: order.id }}
      className="block rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{fullName || "کاربر"}</p>
          <p dir="ltr" className="text-left text-xs text-muted-foreground">
            {order.user_phone}
          </p>
        </div>
        <Badge variant="secondary" className={`shrink-0 gap-1.5 border ${meta.className}`}>
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
        <p className="text-xs text-muted-foreground">{date}</p>
        <span className="text-sm font-bold text-primary">{formatToman(order.amount)}</span>
      </div>
    </Link>
  )
}

function AdminOrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card/75 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <Separator className="my-4" />
          <Skeleton className="h-4 w-2/3" />
          <Separator className="my-4" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
