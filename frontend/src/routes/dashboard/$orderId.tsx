import { createFileRoute, ErrorComponent, Link, redirect } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ArrowRight, KeyRound, Copy, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { getMeFn } from "@/features/auth"
import { orderQueryOptions, ORDER_STATUS_META, formatOrderDate } from "@/features/orders"
import type { OrderItem } from "@/features/orders"
import { formatToman, PLATFORM_LABEL, PLATFORM_BADGE_CLASS, ZARFIAT_LABEL } from "@/features/games"
import { cn } from "@/lib/utils"

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
          search={{ page: 1, status: "" }}
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

  const meta = ORDER_STATUS_META[order.status]
  const StatusIcon = meta.icon
  const date = formatOrderDate(order.created_at)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">جزئیات سفارش</h1>
            <p className="mt-1 text-xs text-muted-foreground">{date}</p>
          </div>
          <Badge variant="secondary" className={cn("gap-1.5 border", meta.className)}>
            <StatusIcon className="size-3.5" />
            {meta.label}
          </Badge>
        </div>

        <Separator className="my-5" />

        <div className="space-y-3">
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
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                × {it.count}
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

        {order.items.some((it) => it.email || it.password || it.psn_pass) ? (
          <div className="mt-5 space-y-5">
            {accountLabels(order.items).map(({ item, label }, i) => (
              <ItemCredentials key={i} item={item} label={label} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            سفارش شما در حال آماده‌سازی است. به‌محض آماده شدن، ایمیل، رمز عبور و PSN-pass اکانت
            همین‌جا برای شما نمایش داده می‌شود.
          </p>
        )}
      </div>
    </div>
  )
}

// Orders store one row per account. Collapse identical lines into "× count" for
// the summary, and number duplicate accounts ("بازی — اکانت ۲") in the
// credentials list so each delivered login is distinguishable.
type GroupedItem = OrderItem & { count: number }

function itemKey(it: OrderItem) {
  return `${it.game_id}|${it.platform}|${it.zarfiat}`
}

function groupItems(items: OrderItem[]): GroupedItem[] {
  const map = new Map<string, GroupedItem>()
  for (const it of items) {
    const existing = map.get(itemKey(it))
    if (existing) existing.count += 1
    else map.set(itemKey(it), { ...it, count: 1 })
  }
  return [...map.values()]
}

function accountLabels(items: OrderItem[]): { item: OrderItem; label: string }[] {
  const totals = new Map<string, number>()
  for (const it of items) totals.set(itemKey(it), (totals.get(itemKey(it)) ?? 0) + 1)

  const seen = new Map<string, number>()
  return items.map((item) => {
    const k = itemKey(item)
    const n = (seen.get(k) ?? 0) + 1
    seen.set(k, n)
    const label =
      (totals.get(k) ?? 1) > 1 ? `${item.game_name} — اکانت ${n.toLocaleString("fa-IR")}` : item.game_name
    return { item, label }
  })
}

function ItemCredentials({ item, label }: { item: OrderItem; label: string }) {
  if (!item.email && !item.password && !item.psn_pass) {
    return (
      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        <p className="mb-1 text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">این مورد هنوز در حال آماده‌سازی است.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <p className="mb-3 text-sm font-medium">{label}</p>
      <div className="space-y-2.5">
        {item.email && <CredField label="ایمیل" value={item.email} />}
        {item.password && <CredField label="رمز عبور" value={item.password} />}
        {item.psn_pass && <CredField label="PSN-pass" value={item.psn_pass} />}
      </div>
    </div>
  )
}

function CredField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/60 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p dir="ltr" className="truncate text-left font-mono text-sm">
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={copy}
        aria-label={`کپی ${label}`}
      >
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
      </Button>
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
