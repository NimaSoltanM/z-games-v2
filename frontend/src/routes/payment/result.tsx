import { createFileRoute, Link } from "@tanstack/react-router"
import { CheckCircle2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

const GAMES_SEARCH = { page: 1, platform: "", zarfiat: "", search: "", sort: "-created_at" } as const

export const Route = createFileRoute("/payment/result")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: search.status === "success" ? "success" : "failed",
    order: typeof search.order === "string" ? search.order : undefined,
  }),
  component: PaymentResultPage,
})

function PaymentResultPage() {
  const { status, order } = Route.useSearch()
  const success = status === "success"

  return (
    <div className="relative flex min-h-[calc(100vh-57px)] items-center justify-center overflow-hidden bg-background bg-grid-lines px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl ${
            success ? "bg-emerald-500/10" : "bg-destructive/10"
          }`}
        />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card/75 p-8 text-center backdrop-blur-sm">
        <div
          className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${
            success ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
          }`}
        >
          {success ? <CheckCircle2 className="size-8" /> : <XCircle className="size-8" />}
        </div>

        <h1 className="mt-6 text-xl font-bold">
          {success ? "پرداخت موفق بود" : "پرداخت ناموفق بود"}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {success
            ? "سفارش شما با موفقیت ثبت شد. اطلاعات اکانت پس از آماده‌سازی، در حساب کاربری‌تان قرار می‌گیرد."
            : "پرداخت انجام نشد یا لغو شد. در صورت کسر وجه، مبلغ طی ۷۲ ساعت به حسابتان بازمی‌گردد."}
        </p>

        {order && (
          <p className="mt-4 text-xs text-muted-foreground/70">
            شماره سفارش: <span dir="ltr" className="font-mono">{order}</span>
          </p>
        )}

        <div className="mt-8 flex flex-col gap-2.5">
          {success ? (
            <Link to="/games" search={GAMES_SEARCH}>
              <Button className="w-full">ادامه خرید</Button>
            </Link>
          ) : (
            <>
              <Link to="/cart">
                <Button className="w-full">بازگشت به سبد خرید</Button>
              </Link>
              <Link to="/games" search={GAMES_SEARCH}>
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
