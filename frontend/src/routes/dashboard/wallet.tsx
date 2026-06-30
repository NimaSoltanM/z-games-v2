import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard-shell"
import {
  walletQueryOptions,
  walletReasonLabel,
  formatReturnDate,
} from "@/features/returns"
import type { WalletTxn } from "@/features/returns"
import { formatToman } from "@/features/games"
import { cn } from "@/lib/utils"

function WalletError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/wallet")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(walletQueryOptions())
  },
  component: WalletPage,
  errorComponent: WalletError,
})

function WalletPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <>
      <DashboardHeader
        title="کیف پول"
        description="اعتبار حاصل از بازگرداندن بازی‌ها اینجا نگهداری می‌شود و هنگام خرید به‌صورت خودکار اعمال می‌گردد."
      />
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری کیف پول
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<WalletSkeleton />}>
          <WalletView />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function WalletView() {
  const { data } = useSuspenseQuery(walletQueryOptions())

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <WalletIcon className="size-4" />
          موجودی فعلی
        </div>
        <p className="mt-2 text-3xl font-bold text-primary tabular-nums">
          {formatToman(data.balance)}
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
        <p className="mb-3 text-sm font-semibold">تراکنش‌ها</p>
        {data.transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            هنوز تراکنشی ندارید
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {data.transactions.map((t, i) => (
              <TxnRow key={i} txn={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TxnRow({ txn }: { txn: WalletTxn }) {
  const credit = txn.amount >= 0
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            credit
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-muted text-muted-foreground"
          )}
        >
          {credit ? (
            <ArrowDownLeft className="size-4" />
          ) : (
            <ArrowUpRight className="size-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {walletReasonLabel(txn.reason)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatReturnDate(txn.created_at)}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          credit ? "text-emerald-500" : "text-muted-foreground"
        )}
      >
        {credit ? "+" : "−"}
        {formatToman(Math.abs(txn.amount))}
      </span>
    </div>
  )
}

function WalletSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}
