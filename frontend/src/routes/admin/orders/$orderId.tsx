import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ArrowRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { adminOrderQueryOptions, fulfillOrder } from "@/features/admin"
import type { AdminOrder, FulfillItem } from "@/features/admin"
import { formatOrderDate, formatOrderNumber } from "@/features/orders"
import type { OrderItem } from "@/features/orders"
import { formatToman, consoleLabel, platformBadgeClass, capacityLabel, passcodeLabel, PreOrderBadge } from "@/features/games"

function AdminOrderError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/orders/$orderId")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(adminOrderQueryOptions(params.orderId))
  },
  component: AdminOrderDetailPage,
  errorComponent: AdminOrderError,
})

function AdminOrderDetailPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/admin/orders"
        search={{ page: 1, status: "", search: "" }}
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
        <Suspense fallback={<AdminOrderDetailSkeleton />}>
          <AdminOrderDetail />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

function AdminOrderDetail() {
  const { orderId } = Route.useParams()
  const { data: order } = useSuspenseQuery(adminOrderQueryOptions(orderId))

  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="text-base font-semibold">سفارش یافت نشد</p>
        <p className="mt-1 text-sm text-muted-foreground">این سفارش وجود ندارد</p>
      </div>
    )
  }

  // Only paid/fulfilled orders can take credentials. A pending order surfaced in
  // the admin queue is a payment that needs manual review, not fulfillment.
  if (order.status === "paid" || order.status === "fulfilled") {
    return <FulfillForm order={order} />
  }
  return <ReviewPanel order={order} />
}

function OrderSummary({ order }: { order: AdminOrder }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-6">
      <div>
        <p dir="ltr" className="font-mono text-base font-bold">
          {formatOrderNumber(order.order_number)}
        </p>
        <h1 className="mt-1 text-lg font-bold">{order.user_name.trim() || "کاربر"}</h1>
        <p dir="ltr" className="mt-0.5 text-left text-sm text-muted-foreground">
          {order.user_phone}
        </p>
      </div>
      <Separator className="my-5" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">مبلغ سفارش</span>
        <span className="font-bold text-primary">{formatToman(order.amount)}</span>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{formatOrderDate(order.created_at)}</div>
    </div>
  )
}

// ReviewPanel shows a pending (payment-unconfirmed) order read-only, with the
// gateway authority so the admin can look it up in the ZarinPal panel.
function ReviewPanel({ order }: { order: AdminOrder }) {
  return (
    <div className="space-y-5">
      <OrderSummary order={order} />

      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
          <AlertTriangle className="size-5" />
          <p className="text-sm font-semibold">پرداخت تأیید نشده است</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          نتیجهٔ پرداخت این سفارش از درگاه مشخص نشده است. وضعیت تراکنش را با کد زیر در پنل
          زرین‌پال بررسی کنید. تا زمان تأیید، امکان ثبت اطلاعات اکانت وجود ندارد.
        </p>
        {order.authority && (
          <p className="mt-4 text-xs text-muted-foreground">
            کد پیگیری درگاه:{" "}
            <span dir="ltr" className="font-mono text-foreground">{order.authority}</span>
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-6 space-y-2.5">
        {groupItems(order.items).map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{it.game_name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {consoleLabel(it.platform)} · {capacityLabel(it.zarfiat)} · × {it.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Orders store one row per account. groupItems collapses identical lines into
// "× count"; accountLabels numbers duplicate accounts ("بازی — اکانت ۲") so each
// credential form is distinguishable.
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

function accountLabels(items: OrderItem[]): Map<string, string> {
  const totals = new Map<string, number>()
  for (const it of items) totals.set(itemKey(it), (totals.get(itemKey(it)) ?? 0) + 1)

  const seen = new Map<string, number>()
  const labels = new Map<string, string>()
  for (const it of items) {
    const k = itemKey(it)
    const n = (seen.get(k) ?? 0) + 1
    seen.set(k, n)
    labels.set(
      it.id,
      (totals.get(k) ?? 1) > 1 ? `${it.game_name} — اکانت ${n.toLocaleString("fa-IR")}` : it.game_name
    )
  }
  return labels
}

function FulfillForm({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient()
  const fulfilled = order.status === "fulfilled"

  // One credential draft per item, prefilled with whatever is already saved.
  const [drafts, setDrafts] = useState<Record<string, { email: string; password: string; passcode: string }>>(
    () =>
      Object.fromEntries(
        order.items.map((it) => [
          it.id,
          { email: it.email ?? "", password: it.password ?? "", passcode: it.passcode ?? "" },
        ])
      )
  )

  const setField = (itemId: string, field: "email" | "password" | "passcode", value: string) =>
    setDrafts((d) => ({ ...d, [itemId]: { ...d[itemId], [field]: value } }))

  const labels = accountLabels(order.items)

  const mutation = useMutation({
    mutationFn: (items: FulfillItem[]) => fulfillOrder(order.id, items),
    onSuccess: (updated) => {
      queryClient.setQueryData(adminOrderQueryOptions(order.id).queryKey, updated)
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast.success(
        updated.status === "fulfilled" ? "سفارش تکمیل و تحویل شد" : "اطلاعات ذخیره شد"
      )
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره اطلاعات")
    },
  })

  const allComplete = order.items.every((it) => {
    const d = drafts[it.id]
    return d.email.trim() && d.password.trim() && d.passcode.trim()
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const items: FulfillItem[] = order.items.map((it) => ({
      id: it.id,
      email: drafts[it.id].email.trim(),
      password: drafts[it.id].password.trim(),
      passcode: drafts[it.id].passcode.trim(),
    }))
    mutation.mutate(items)
  }

  const date = formatOrderDate(order.created_at)
  const fullName = order.user_name.trim()

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Order + customer summary */}
      <div className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p dir="ltr" className="font-mono text-base font-bold">
              {formatOrderNumber(order.order_number)}
            </p>
            <h1 className="mt-1 text-lg font-bold">{fullName || "کاربر"}</h1>
            <p dir="ltr" className="mt-0.5 text-left text-sm text-muted-foreground">
              {order.user_phone}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={
              fulfilled
                ? "shrink-0 gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "shrink-0 gap-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }
          >
            {fulfilled ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
            {fulfilled ? "تحویل شد" : "در انتظار تکمیل"}
          </Badge>
        </div>

        <Separator className="my-5" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">مبلغ پرداختی</span>
          <span className="font-bold text-primary">{formatToman(order.amount)}</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{date}</div>
      </div>

      {/* Per-item credential fields */}
      {order.items.map((it) => (
        <div
          key={it.id}
          className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{labels.get(it.id)}</span>
            <Badge
              variant="secondary"
              className={`border text-xs ${platformBadgeClass(it.platform)}`}
            >
              {consoleLabel(it.platform)}
            </Badge>
            <span className="text-xs text-muted-foreground">{capacityLabel(it.zarfiat)}</span>
            {it.pre_order && <PreOrderBadge />}
          </div>

          {it.pre_order && !it.email && !it.password && !it.passcode && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
              این آیتم به‌صورت پیش‌خرید ثبت شده است. اطلاعات اکانت را تنها پس از انتشار رسمی بازی وارد کنید.
            </p>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`email-${it.id}`}>ایمیل</Label>
              <Input
                id={`email-${it.id}`}
                dir="ltr"
                autoComplete="off"
                value={drafts[it.id].email}
                onChange={(e) => setField(it.id, "email", e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`password-${it.id}`}>رمز عبور</Label>
              <Input
                id={`password-${it.id}`}
                dir="ltr"
                autoComplete="off"
                value={drafts[it.id].password}
                onChange={(e) => setField(it.id, "password", e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`passcode-${it.id}`}>{passcodeLabel(it.platform)}</Label>
              <Input
                id={`passcode-${it.id}`}
                dir="ltr"
                autoComplete="off"
                value={drafts[it.id].passcode}
                onChange={(e) => setField(it.id, "passcode", e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {allComplete
            ? "با ذخیره، سفارش به حالت «تحویل شد» تغییر می‌کند."
            : "تا تکمیل همهٔ اطلاعات، سفارش در حالت «در انتظار تکمیل» می‌ماند."}
        </p>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "در حال ذخیره..." : "ذخیره"}
        </Button>
      </div>
    </form>
  )
}

function AdminOrderDetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card/75 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Separator className="my-5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/75 p-6 space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )
}
