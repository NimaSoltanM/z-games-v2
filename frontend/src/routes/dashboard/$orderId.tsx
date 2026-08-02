import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import {
  ArrowRight,
  KeyRound,
  Copy,
  Check,
  ArchiveRestore,
  Clock3,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  orderQueryOptions,
  ORDER_STATUS_META,
  formatOrderDate,
  formatOrderNumber,
  PRE_ORDER_CREDENTIALS_NOTE,
} from "@/features/orders"
import type { OrderItem } from "@/features/orders"
import {
  formatToman,
  consoleLabel,
  platformBadgeClass,
  capacityLabel,
  passcodeLabel,
  PreOrderBadge,
} from "@/features/games"
import { cn } from "@/lib/utils"
import { requestFreshVerificationCode } from "@/features/verification-codes"

function OrderError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/$orderId")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(orderQueryOptions(params.orderId))
  },
  component: OrderDetailPage,
  errorComponent: OrderError,
})

function OrderDetailPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <div className="mx-auto max-w-2xl">
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
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری سفارش
            </p>
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
  )
}

function OrderDetail() {
  const { orderId } = Route.useParams()
  const { data: order } = useSuspenseQuery(orderQueryOptions(orderId))

  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="text-base font-semibold">سفارش یافت نشد</p>
        <p className="mt-1 text-sm text-muted-foreground">
          این سفارش وجود ندارد یا متعلق به شما نیست
        </p>
      </div>
    )
  }

  const meta = ORDER_STATUS_META[order.status]
  const StatusIcon = meta.icon
  const date = formatOrderDate(order.created_at)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">جزئیات سفارش</h1>
            <p
              dir="ltr"
              className="mt-1 font-mono text-sm font-semibold text-foreground"
            >
              {formatOrderNumber(order.order_number)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
          </div>
          <Badge
            variant="secondary"
            className={cn("gap-1.5 border", meta.className)}
          >
            <StatusIcon className="size-3.5" />
            {meta.label}
          </Badge>
        </div>

        <Separator className="my-5" />

        <div className="space-y-3">
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
                {it.pre_order && <PreOrderBadge className="shrink-0" />}
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
          <span className="text-base font-bold text-primary">
            {formatToman(order.amount)}
          </span>
        </div>
        {order.ref_id !== null && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              کد پیگیری پرداخت
            </span>
            <span
              dir="ltr"
              className="font-mono text-sm font-semibold tabular-nums"
            >
              {order.ref_id}
            </span>
          </div>
        )}
      </div>

      {/* Credentials — delivered by support after the order is prepared. */}
      <div className="rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <KeyRound className="size-4" />
          </div>
          <p className="text-sm font-semibold">اطلاعات اکانت</p>
        </div>

        {order.items.some(
          (it) =>
            it.email || it.password || it.passcode || it.credentials_returned
        ) ? (
          <div className="mt-5 space-y-5">
            {accountLabels(order.items).map(({ item, label }, i) => (
              <ItemCredentials key={i} item={item} label={label} />
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {order.items.some((it) => it.pre_order) && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {PRE_ORDER_CREDENTIALS_NOTE}
              </p>
            )}
            {order.items.some((it) => !it.pre_order) && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                سفارش شما در حال آماده‌سازی است. به‌محض آماده شدن، ایمیل، رمز
                عبور و PSN-pass اکانت همین‌جا برای شما نمایش داده می‌شود.
              </p>
            )}
          </div>
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

function accountLabels(
  items: OrderItem[]
): { item: OrderItem; label: string }[] {
  const totals = new Map<string, number>()
  for (const it of items)
    totals.set(itemKey(it), (totals.get(itemKey(it)) ?? 0) + 1)

  const seen = new Map<string, number>()
  return items.map((item) => {
    const k = itemKey(item)
    const n = (seen.get(k) ?? 0) + 1
    seen.set(k, n)
    const label =
      (totals.get(k) ?? 1) > 1
        ? `${item.game_name} — اکانت ${n.toLocaleString("fa-IR")}`
        : item.game_name
    return { item, label }
  })
}

function ItemCredentials({ item, label }: { item: OrderItem; label: string }) {
  if (item.credentials_returned) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <ArchiveRestore className="size-4" />
          <p className="text-sm font-medium">{label}</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          این حساب به فروشگاه بازگردانده شده و اطلاعات ورود آن دیگر در دسترس
          نیست.
        </p>
      </div>
    )
  }

  if (!item.email && !item.password && !item.passcode) {
    return (
      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {item.pre_order && <PreOrderBadge />}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.pre_order
            ? PRE_ORDER_CREDENTIALS_NOTE
            : "این مورد هنوز در حال آماده‌سازی است."}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <p className="mb-3 text-sm font-medium">{label}</p>
      <div className="space-y-2.5">
        {item.email && <CredField label="ایمیل" value={item.email} />}
        {item.password && <CredField label="رمز عبور" value={item.password} />}
        {item.passcode && (
          <CredField
            label={passcodeLabel(item.platform)}
            value={item.passcode}
          />
        )}
      </div>
      {item.verification_code?.eligible && <FreshCodeSupport item={item} />}
    </div>
  )
}

function FreshCodeSupport({ item }: { item: OrderItem }) {
  const queryClient = useQueryClient()
  const support = item.verification_code
  const request = support?.request
  const mutation = useMutation({
    mutationFn: () => requestFreshVerificationCode(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast.success("درخواست کد ورود برای پشتیبانی ارسال شد")
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "خطا در ثبت درخواست کد"
      ),
  })

  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <div className="flex items-start gap-2.5">
        <RefreshCw className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">کد ورود مجدد</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            اگر از حساب خارج شدید، هر ۲۴ ساعت یک‌بار می‌توانید کد تازه از
            پشتیبانی بخواهید.
          </p>
        </div>
      </div>

      {request?.status === "pending" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
          <Clock3 className="size-4 shrink-0" />
          درخواست شما ثبت شده و در انتظار ارسال کد توسط پشتیبانی است.
        </div>
      )}

      {request?.status === "delivered" && request.code && (
        <div className="mt-3 space-y-2.5">
          <CredField label="کد ورود تازه" value={request.code} />
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            <Clock3 className="mt-0.5 size-4 shrink-0" />
            <span>
              این کد فقط تا {formatVerificationDeadline(request.expires_at)}
              معتبر است؛ لطفاً پیش از پایان ۲۴ ساعت آن را وارد کنید.
            </span>
          </div>
        </div>
      )}

      {request?.status === "expired" && (
        <p className="mt-3 text-xs text-muted-foreground">
          کد قبلی منقضی شده و برای امنیت از سامانه حذف شده است.
        </p>
      )}

      {!request && support?.blocked_reason === "pending" && (
        <p className="mt-3 text-xs text-muted-foreground">
          یک درخواست دیگر شما در انتظار پاسخ پشتیبانی است.
        </p>
      )}
      {!request && support?.blocked_reason === "active" && (
        <p className="mt-3 text-xs text-muted-foreground">
          برای یکی دیگر از حساب‌هایتان هنوز یک کد معتبر دارید.
        </p>
      )}
      {support?.blocked_reason === "cooldown" && support.next_request_at && (
        <p className="mt-3 text-xs text-muted-foreground">
          درخواست بعدی از {formatVerificationDeadline(support.next_request_at)}
          امکان‌پذیر است.
        </p>
      )}

      {support?.can_request && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 gap-2"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <RefreshCw
            className={cn("size-3.5", mutation.isPending && "animate-spin")}
          />
          {mutation.isPending ? "در حال ثبت…" : "درخواست کد ورود جدید"}
        </Button>
      )}
    </div>
  )
}

function formatVerificationDeadline(value: string | null): string {
  if (!value) return "پایان مهلت"
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
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
        {copied ? (
          <Check className="size-4 text-primary" />
        ) : (
          <Copy className="size-4" />
        )}
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
