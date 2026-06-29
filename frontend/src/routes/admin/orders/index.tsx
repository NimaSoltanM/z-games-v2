import {
  createFileRoute,
  ErrorComponent,
  Link,
  useNavigate,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/pagination"
import { DashboardHeader } from "@/components/dashboard-shell"
import { adminOrdersQueryOptions } from "@/features/admin"
import type { AdminOrder } from "@/features/admin"
import type { OrderItem, OrderStatus } from "@/features/orders"
import { formatOrderDate, formatOrderNumber } from "@/features/orders"
import {
  formatToman,
  consoleLabel,
  platformBadgeClass,
  capacityLabel,
} from "@/features/games"
import { cn } from "@/lib/utils"

type AdminStatus = "" | "paid" | "pending" | "fulfilled"
type StatusMeta = { label: string; icon: LucideIcon; className: string }

const STATUS_META: Record<OrderStatus, StatusMeta> = {
  paid: {
    label: "در انتظار تکمیل",
    icon: Clock,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  pending: {
    label: "بررسی پرداخت",
    icon: AlertTriangle,
    className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  fulfilled: {
    label: "تحویل شد",
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  failed: {
    label: "ناموفق",
    icon: AlertTriangle,
    className: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
}

const FILTERS: { value: AdminStatus; label: string }[] = [
  { value: "", label: "همه" },
  { value: "paid", label: "در انتظار تکمیل" },
  { value: "pending", label: "بررسی پرداخت" },
  { value: "fulfilled", label: "تحویل شده" },
]

function AdminOrdersError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: (
    search: Record<string, unknown>
  ): { page: number; status: AdminStatus; search: string } => ({
    page: Math.max(1, Number(search.page) || 1),
    status:
      search.status === "paid" ||
      search.status === "pending" ||
      search.status === "fulfilled"
        ? search.status
        : "",
    search: typeof search.search === "string" ? search.search : "",
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(adminOrdersQueryOptions(deps))
  },
  component: AdminOrdersPage,
  errorComponent: AdminOrdersError,
})

function AdminOrdersPage() {
  const { reset } = useQueryErrorResetBoundary()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/orders/" })

  return (
    <>
      <DashboardHeader title="مدیریت سفارش‌ها" />

      <div className="mb-6 space-y-3">
        <SearchBox
          key={search.search}
          initial={search.search}
          onSearch={(q) =>
            navigate({ search: { ...search, search: q, page: 1 } })
          }
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={search.status === f.value ? "default" : "outline"}
              onClick={() =>
                navigate({ search: { ...search, status: f.value, page: 1 } })
              }
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری سفارش‌ها
            </p>
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
    </>
  )
}

function SearchBox({
  initial,
  onSearch,
}: {
  initial: string
  onSearch: (q: string) => void
}) {
  const [value, setValue] = useState(initial)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(value.trim())
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="جستجو با شماره سفارش، نام یا موبایل"
        className="h-10 pr-9"
      />
      {value && (
        <button
          type="button"
          aria-label="پاک کردن"
          onClick={() => {
            setValue("")
            onSearch("")
          }}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  )
}

function AdminOrdersList() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/orders/" })
  const { data } = useSuspenseQuery(adminOrdersQueryOptions(search))

  if (data.orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <Package className="size-8 text-muted-foreground/40" />
        </div>
        <p className="text-base font-semibold">
          {search.search || search.status
            ? "سفارشی با این مشخصات یافت نشد"
            : "هنوز سفارشی نیست"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {data.pagination.total.toLocaleString("fa-IR")} سفارش
      </p>
      {data.orders.map((order) => (
        <AdminOrderCard key={order.id} order={order} />
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(p) => navigate({ search: { ...search, page: p } })}
      />
    </div>
  )
}

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

function AdminOrderCard({ order }: { order: AdminOrder }) {
  const meta = STATUS_META[order.status]
  const StatusIcon = meta.icon

  return (
    <Link
      to="/admin/orders/$orderId"
      params={{ orderId: order.id }}
      className="block rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p dir="ltr" className="font-mono text-sm font-semibold">
            {formatOrderNumber(order.order_number)}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium">
            {order.user_name.trim() || "کاربر"}
          </p>
          <p dir="ltr" className="text-left text-xs text-muted-foreground">
            {order.user_phone}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn("shrink-0 gap-1.5 border", meta.className)}
        >
          <StatusIcon className="size-3.5" />
          {meta.label}
        </Badge>
      </div>

      <Separator className="my-4" />

      <div className="space-y-2.5">
        {groupItems(order.items).map((it, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{it.game_name}</span>
              <Badge
                variant="secondary"
                className={`shrink-0 border text-xs ${platformBadgeClass(it.platform)}`}
              >
                {consoleLabel(it.platform)}
              </Badge>
              <span className="shrink-0 text-xs text-muted-foreground">
                {capacityLabel(it.zarfiat)}
              </span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              × {it.count}
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {formatOrderDate(order.created_at)}
        </p>
        <span className="text-sm font-bold text-primary">
          {formatToman(order.amount)}
        </span>
      </div>
    </Link>
  )
}

function AdminOrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/60 bg-card/75 p-5"
        >
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
