import { createFileRoute, Link } from "@tanstack/react-router"
import { CheckCircle2, XCircle, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"

type ResultStatus = "success" | "failed" | "pending"

// status="pending" is returned when ZarinPal's verify call had an unknown
// outcome (the payment may have succeeded): we tell the customer not to pay
// again while we confirm, rather than wrongly reporting success or failure.
const RESULT_META: Record<
  ResultStatus,
  { icon: typeof CheckCircle2; tint: string; glow: string; title: string; body: string }
> = {
  success: {
    icon: CheckCircle2,
    tint: "bg-emerald-500/10 text-emerald-400",
    glow: "bg-emerald-500/10",
    title: "پرداخت موفق بود",
    body: "سفارش شما با موفقیت ثبت شد. اطلاعات اکانت پس از آماده‌سازی، در حساب کاربری‌تان قرار می‌گیرد.",
  },
  pending: {
    icon: Clock,
    tint: "bg-amber-500/10 text-amber-400",
    glow: "bg-amber-500/10",
    title: "در حال بررسی پرداخت",
    body: "پرداخت شما در حال بررسی است. لطفاً دوباره پرداخت نکنید؛ وضعیت سفارش به‌زودی در حساب کاربری‌تان مشخص می‌شود. اگر وجه کسر شده، نگران نباشید — تأیید می‌شود.",
  },
  failed: {
    icon: XCircle,
    tint: "bg-destructive/10 text-destructive",
    glow: "bg-destructive/10",
    title: "پرداخت ناموفق بود",
    body: "پرداخت انجام نشد یا لغو شد. در صورت کسر وجه، مبلغ طی ۷۲ ساعت به حسابتان بازمی‌گردد.",
  },
}

export const Route = createFileRoute("/payment/result")({
  validateSearch: (search: Record<string, unknown>): { status: ResultStatus; order: string | undefined } => ({
    status:
      search.status === "success" ? "success" : search.status === "pending" ? "pending" : "failed",
    order: typeof search.order === "string" ? search.order : undefined,
  }),
  component: PaymentResultPage,
})

function PaymentResultPage() {
  const { status, order } = Route.useSearch()
  const meta = RESULT_META[status]
  const Icon = meta.icon

  return (
    <div className="relative flex min-h-[calc(100vh-57px)] items-center justify-center overflow-hidden bg-background bg-grid-lines px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl ${meta.glow}`}
        />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card/75 p-8 text-center backdrop-blur-sm">
        <div className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${meta.tint}`}>
          <Icon className="size-8" />
        </div>

        <h1 className="mt-6 text-xl font-bold">{meta.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {meta.body}
        </p>

        {order && (
          <p className="mt-4 text-xs text-muted-foreground/70">
            شماره سفارش: <span dir="ltr" className="font-mono">{order}</span>
          </p>
        )}

        <div className="mt-8 flex flex-col gap-2.5">
          {status === "success" ? (
            <Link to="/games" search={GAMES_DEFAULT_SEARCH}>
              <Button className="w-full">ادامه خرید</Button>
            </Link>
          ) : status === "pending" ? (
            <Link to="/dashboard" search={{ page: 1, status: "" }}>
              <Button className="w-full">مشاهده سفارش‌ها</Button>
            </Link>
          ) : (
            <>
              <Link to="/cart">
                <Button className="w-full">بازگشت به سبد خرید</Button>
              </Link>
              <Link to="/games" search={GAMES_DEFAULT_SEARCH}>
                <Button variant="outline" className="w-full">
                  مشاهده بازی‌ها
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
