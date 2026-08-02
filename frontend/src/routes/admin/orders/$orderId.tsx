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
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArchiveRestore,
  Recycle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  adminOrderQueryOptions,
  fulfillOrder,
  reuseReturnedAccount,
} from "@/features/admin"
import type {
  AdminOrder,
  CredentialWarning,
  DuplicateCredentialsError,
  FulfillItem,
} from "@/features/admin"
import { formatOrderDate, formatOrderNumber } from "@/features/orders"
import type { OrderItem } from "@/features/orders"
import {
  formatToman,
  consoleLabel,
  platformBadgeClass,
  capacityLabel,
  passcodeLabel,
  PreOrderBadge,
} from "@/features/games"
import { ApiError } from "@/lib/api-client"

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
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری سفارش
            </p>
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
        <p className="mt-1 text-sm text-muted-foreground">
          این سفارش وجود ندارد
        </p>
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
    <div className="rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm">
      <div>
        <p dir="ltr" className="font-mono text-base font-bold">
          {formatOrderNumber(order.order_number)}
        </p>
        <h1 className="mt-1 text-lg font-bold">
          {order.user_name.trim() || "کاربر"}
        </h1>
        <p dir="ltr" className="mt-0.5 text-left text-sm text-muted-foreground">
          {order.user_phone}
        </p>
      </div>
      <Separator className="my-5" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">مبلغ سفارش</span>
        <span className="font-bold text-primary">
          {formatToman(order.amount)}
        </span>
      </div>
      {order.ref_id !== null && (
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">کد پیگیری پرداخت</span>
          <span dir="ltr" className="font-mono font-semibold tabular-nums">
            {order.ref_id}
          </span>
        </div>
      )}
      <div className="mt-2 text-xs text-muted-foreground">
        {formatOrderDate(order.created_at)}
      </div>
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
          نتیجهٔ پرداخت این سفارش از درگاه مشخص نشده است. وضعیت تراکنش را با کد
          زیر در پنل زرین‌پال بررسی کنید. تا زمان تأیید، امکان ثبت اطلاعات اکانت
          وجود ندارد.
        </p>
        {order.authority && (
          <p className="mt-4 text-xs text-muted-foreground">
            آتوریتی درگاه:{" "}
            <span dir="ltr" className="font-mono text-foreground">
              {order.authority}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-2.5 rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm">
        {groupItems(order.items).map((it, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="truncate font-medium">{it.game_name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {consoleLabel(it.platform)} · {capacityLabel(it.zarfiat)} · ×{" "}
              {it.count}
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
  for (const it of items)
    totals.set(itemKey(it), (totals.get(itemKey(it)) ?? 0) + 1)

  const seen = new Map<string, number>()
  const labels = new Map<string, string>()
  for (const it of items) {
    const k = itemKey(it)
    const n = (seen.get(k) ?? 0) + 1
    seen.set(k, n)
    labels.set(
      it.id,
      (totals.get(k) ?? 1) > 1
        ? `${it.game_name} — اکانت ${n.toLocaleString("fa-IR")}`
        : it.game_name
    )
  }
  return labels
}

function FulfillForm({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient()
  const fulfilled = order.status === "fulfilled"
  const editableItems = order.items.filter((item) => !item.credentials_returned)

  type DuplicateConfirmation =
    | { kind: "fulfill"; items: FulfillItem[]; warnings: CredentialWarning[] }
    | {
        kind: "reuse"
        itemId: string
        returnId: string
        warnings: CredentialWarning[]
      }
  const [duplicateConfirmation, setDuplicateConfirmation] =
    useState<DuplicateConfirmation | null>(null)

  // One credential draft per item, prefilled with whatever is already saved.
  const [drafts, setDrafts] = useState<
    Record<string, { email: string; password: string; passcode: string }>
  >(() =>
    Object.fromEntries(
      order.items.map((it) => [
        it.id,
        {
          email: it.email ?? "",
          password: it.password ?? "",
          passcode: it.passcode ?? "",
        },
      ])
    )
  )

  const setField = (
    itemId: string,
    field: "email" | "password" | "passcode",
    value: string
  ) => {
    setDuplicateConfirmation(null)
    setDrafts((d) => ({ ...d, [itemId]: { ...d[itemId], [field]: value } }))
  }

  const labels = accountLabels(order.items)

  const mutation = useMutation({
    mutationFn: ({
      items,
      allowDuplicate,
    }: {
      items: FulfillItem[]
      allowDuplicate: boolean
    }) => fulfillOrder(order.id, items, allowDuplicate),
    onSuccess: (updated) => {
      setDuplicateConfirmation(null)
      queryClient.setQueryData(
        adminOrderQueryOptions(order.id).queryKey,
        updated
      )
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      queryClient.invalidateQueries({
        queryKey: ["admin", "returned-accounts"],
      })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast.success(
        updated.status === "fulfilled"
          ? "سفارش تکمیل و تحویل شد"
          : "اطلاعات ذخیره شد"
      )
    },
    onError: (err, variables) => {
      const warnings = duplicateWarningsFrom(err)
      if (warnings) {
        setDuplicateConfirmation({
          kind: "fulfill",
          items: variables.items,
          warnings,
        })
        return
      }
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره اطلاعات")
    },
  })

  // Fulfilling an item from returned-account inventory: the server copies the
  // returned account's credentials onto the item and consumes that return. Reflect
  // the copied credentials back into the form drafts on success.
  const reuse = useMutation({
    mutationFn: ({
      itemId,
      returnId,
      allowDuplicate,
    }: {
      itemId: string
      returnId: string
      allowDuplicate: boolean
    }) => reuseReturnedAccount(order.id, itemId, returnId, allowDuplicate),
    onSuccess: (updated) => {
      setDuplicateConfirmation(null)
      queryClient.setQueryData(
        adminOrderQueryOptions(order.id).queryKey,
        updated
      )
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "returns"] })
      queryClient.invalidateQueries({
        queryKey: ["admin", "returned-accounts"],
      })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setDrafts((d) => {
        const next = { ...d }
        for (const it of updated.items) {
          next[it.id] = {
            email: it.email ?? "",
            password: it.password ?? "",
            passcode: it.passcode ?? "",
          }
        }
        return next
      })
      toast.success("حساب بازگردانده‌شده برای این سفارش استفاده شد")
    },
    onError: (err, variables) => {
      const warnings = duplicateWarningsFrom(err)
      if (warnings) {
        setDuplicateConfirmation({
          kind: "reuse",
          itemId: variables.itemId,
          returnId: variables.returnId,
          warnings,
        })
        return
      }
      toast.error(err instanceof Error ? err.message : "خطا در استفاده از حساب")
    },
  })

  const allComplete = order.items.every((it) => {
    if (it.credentials_returned) return true
    const d = drafts[it.id]
    return d.email.trim() && d.password.trim() && d.passcode.trim()
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const items: FulfillItem[] = editableItems.map((it) => ({
      id: it.id,
      email: drafts[it.id].email.trim(),
      password: drafts[it.id].password.trim(),
      passcode: drafts[it.id].passcode.trim(),
    }))
    setDuplicateConfirmation(null)
    mutation.mutate({ items, allowDuplicate: false })
  }

  const date = formatOrderDate(order.created_at)
  const fullName = order.user_name.trim()

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Order + customer summary */}
      <div className="rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p dir="ltr" className="font-mono text-base font-bold">
              {formatOrderNumber(order.order_number)}
            </p>
            <h1 className="mt-1 text-lg font-bold">{fullName || "کاربر"}</h1>
            <p
              dir="ltr"
              className="mt-0.5 text-left text-sm text-muted-foreground"
            >
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
            {fulfilled ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <Clock className="size-3.5" />
            )}
            {fulfilled ? "تحویل شد" : "در انتظار تکمیل"}
          </Badge>
        </div>

        <Separator className="my-5" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">مبلغ پرداختی</span>
          <span className="font-bold text-primary">
            {formatToman(order.amount)}
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{date}</div>
      </div>

      {/* Per-item credential fields */}
      {order.items.map((it) => (
        <div
          key={it.id}
          className="space-y-4 rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{labels.get(it.id)}</span>
            <Badge
              variant="secondary"
              className={`border text-xs ${platformBadgeClass(it.platform)}`}
            >
              {consoleLabel(it.platform)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {capacityLabel(it.zarfiat)}
            </span>
            {it.pre_order && <PreOrderBadge />}
          </div>

          {it.pre_order && !it.email && !it.password && !it.passcode && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
              این آیتم به‌صورت پیش‌خرید ثبت شده است. اطلاعات اکانت را تنها پس از
              انتشار رسمی بازی وارد کنید.
            </p>
          )}

          {it.credentials_returned && (
            <Alert variant="info">
              <ArchiveRestore className="size-4" />
              <AlertTitle>این حساب به فروشگاه بازگردانده شده است</AlertTitle>
              <AlertDescription>
                اطلاعات فقط برای سابقهٔ مدیر نمایش داده می‌شود و دیگر در اختیار
                خریدار این سفارش نیست.
              </AlertDescription>
            </Alert>
          )}

          {!it.credentials_returned &&
            (order.inventory[it.id]?.length ?? 0) > 0 && (
              <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Recycle className="size-3.5" />
                  {(order.inventory[it.id] ?? []).length.toLocaleString(
                    "fa-IR"
                  )}{" "}
                  حساب بازگردانده‌شده برای این بازی موجود است — به‌جای تهیهٔ
                  حساب نو استفاده کنید
                </p>
                {(order.inventory[it.id] ?? []).map((acc) => (
                  <div
                    key={acc.return_id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-xs text-muted-foreground">
                      بازگشت‌شده در {formatOrderDate(acc.returned_at)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      disabled={reuse.isPending || mutation.isPending}
                      onClick={() =>
                        reuse.mutate({
                          itemId: it.id,
                          returnId: acc.return_id,
                          allowDuplicate: false,
                        })
                      }
                    >
                      استفاده از این حساب
                    </Button>
                  </div>
                ))}
              </div>
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
                disabled={it.credentials_returned || mutation.isPending}
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
                disabled={it.credentials_returned || mutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`passcode-${it.id}`}>
                {passcodeLabel(it.platform)}
              </Label>
              <Input
                id={`passcode-${it.id}`}
                dir="ltr"
                autoComplete="off"
                value={drafts[it.id].passcode}
                onChange={(e) => setField(it.id, "passcode", e.target.value)}
                disabled={it.credentials_returned || mutation.isPending}
              />
            </div>
          </div>
        </div>
      ))}

      {duplicateConfirmation && (
        <DuplicateCredentialAlert
          warnings={duplicateConfirmation.warnings}
          onCancel={() => setDuplicateConfirmation(null)}
          onConfirm={() => {
            if (duplicateConfirmation.kind === "fulfill") {
              mutation.mutate({
                items: duplicateConfirmation.items,
                allowDuplicate: true,
              })
            } else {
              reuse.mutate({
                itemId: duplicateConfirmation.itemId,
                returnId: duplicateConfirmation.returnId,
                allowDuplicate: true,
              })
            }
          }}
          pending={mutation.isPending || reuse.isPending}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {allComplete
            ? "با ذخیره، سفارش به حالت «تحویل شد» تغییر می‌کند."
            : "تا تکمیل همهٔ اطلاعات، سفارش در حالت «در انتظار تکمیل» می‌ماند."}
        </p>
        <Button
          type="submit"
          disabled={
            editableItems.length === 0 || mutation.isPending || reuse.isPending
          }
        >
          {mutation.isPending ? "در حال ذخیره..." : "ذخیره"}
        </Button>
      </div>
    </form>
  )
}

function duplicateWarningsFrom(error: unknown): CredentialWarning[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  const data = error.data as Partial<DuplicateCredentialsError> | null
  if (
    !data ||
    data.code !== "DUPLICATE_CREDENTIALS" ||
    !Array.isArray(data.warnings)
  ) {
    return null
  }
  return data.warnings
}

function DuplicateCredentialAlert({
  warnings,
  onCancel,
  onConfirm,
  pending,
}: {
  warnings: CredentialWarning[]
  onCancel: () => void
  onConfirm: () => void
  pending: boolean
}) {
  return (
    <Alert variant="warning" className="py-4">
      <AlertTriangle className="size-4" />
      <AlertTitle>هشدار: این اکانت قبلاً تحویل داده شده است</AlertTitle>
      <AlertDescription className="gap-3">
        <p>
          ثبت مسدود نشده، اما ادامه دادن یعنی آگاهانه یک اکانت را به بیش از یک
          خریدار می‌دهید. سفارش‌های مرتبط را پیش از تأیید بررسی کنید.
        </p>
        <div className="w-full space-y-2">
          {warnings.flatMap((warning) =>
            warning.matches.map((match) => (
              <div
                key={`${warning.item_id}-${match.item_id}`}
                className="rounded-lg border border-amber-500/25 bg-background/50 p-3"
              >
                <p dir="ltr" className="text-left font-mono text-xs">
                  {warning.email}
                </p>
                <p className="mt-1 text-xs">
                  {match.game_name} · {consoleLabel(match.console)} ·{" "}
                  {capacityLabel(match.capacity)}
                </p>
                <Button
                  render={
                    <Link
                      to="/admin/orders/$orderId"
                      params={{ orderId: match.order_id }}
                      target="_blank"
                    />
                  }
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                >
                  مشاهده سفارش #{match.order_number.toLocaleString("fa-IR")}
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={onCancel}
          >
            بازگشت و اصلاح
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={onConfirm}
          >
            با اطلاع از تکراری بودن ثبت کن
          </Button>
        </div>
      </AlertDescription>
    </Alert>
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
      <div className="space-y-4 rounded-2xl border border-border/60 bg-card/75 p-6">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )
}
