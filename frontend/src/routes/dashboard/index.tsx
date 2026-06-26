import { createFileRoute, ErrorComponent, Link, useNavigate } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/pagination"
import { DashboardHeader } from "@/components/dashboard-shell"
import { ordersQueryOptions, ORDER_STATUS_META, formatOrderDate, formatOrderNumber } from "@/features/orders"
import type { Order, OrderItem } from "@/features/orders"
import {
  formatToman,
  PLATFORM_LABEL,
  PLATFORM_BADGE_CLASS,
  ZARFIAT_LABEL,
  GAMES_DEFAULT_SEARCH,
  PreOrderBadge,
} from "@/features/games"
import { cn } from "@/lib/utils"

type StatusFilter = "" | "paid" | "fulfilled"

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "همه" },
  { value: "paid", label: "در حال آماده‌سازی" },
  { value: "fulfilled", label: "تحویل شده" },
]

function DashboardError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/")({
  validateSearch: (search: Record<string, unknown>): { page: number; status: StatusFilter } => ({
    page: Math.max(1, Number(search.page) || 1),
    status: search.status === "paid" || search.status === "fulfilled" ? search.status : "",
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(ordersQueryOptions(deps))
  },
  component: DashboardPage,
  errorComponent: DashboardError,
})

function DashboardPage() {
  const { reset } = useQueryErrorResetBoundary()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/dashboard/" })

  return (
    <>
      <DashboardHeader title="سفارش‌های من" />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={search.status === f.value ? "default" : "outline"}
            onClick={() => navigate({ search: { status: f.value, page: 1 } })}
          >
            {f.label}
          </Button>
        ))}
      </div>

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
    </>
  )
}

function OrdersList() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/dashboard/" })
  const { data } = useSuspenseQuery(ordersQueryOptions(search))

  if (data.orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <Package className="size-8 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">
            {search.status ? "سفارشی در این وضعیت نیست" : "هنوز سفارشی ندارید"}
          </p>
          {!search.status && (
            <p className="text-sm text-muted-foreground">اولین بازی‌ات رو انتخاب کن</p>
          )}
        </div>
        {!search.status && (
          <Link to="/games" search={GAMES_DEFAULT_SEARCH}>
            <Button>مشاهده بازی‌ها</Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(p) => navigate({ search: { ...search, page: p } })}
      />
    </div>
  )
}

// Orders store one row per account, so collapse identical lines back into a
// single "× count" row for a clean summary.
type GroupedItem = OrderItem & { count: number }

function groupItems(items: OrderItem[]): GroupedItem[] {
  const map = new Map<string, GroupedItem>()
  for (const it of items) {
    const key = `${it.game_id}|${it.platform}|${it.zarfiat}`
    const existing = map.get(key)
    if (existing) existing.count += 1
    else map.set(key, { ...it, count: 1 })
  }
  return [...map.values()]
}

function OrderCard({ order }: { order: Order }) {
  const meta = ORDER_STATUS_META[order.status]
  const StatusIcon = meta.icon

  return (
    <Link
      to="/dashboard/$orderId"
      params={{ orderId: order.id }}
      className="block rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p dir="ltr" className="font-mono text-sm font-semibold">
            {formatOrderNumber(order.order_number)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatOrderDate(order.created_at)}</p>
        </div>
        <Badge variant="secondary" className={cn("gap-1.5 border", meta.className)}>
          <StatusIcon className="size-3.5" />
          {meta.label}
        </Badge>
      </div>

      <Separator className="my-4" />

      <div className="space-y-2.5">
        {groupItems(order.items).map((it, i) => (
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
              {it.pre_order && <PreOrderBadge className="shrink-0" />}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              × {it.count}
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
