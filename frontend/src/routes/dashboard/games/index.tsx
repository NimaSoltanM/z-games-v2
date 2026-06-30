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
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Gamepad2, RotateCcw, Ban } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/pagination"
import { DashboardHeader } from "@/components/dashboard-shell"
import {
  ownedQueryOptions,
  RETURN_STATUS_META,
  formatReturnDate,
} from "@/features/returns"
import type { OwnedItem } from "@/features/returns"
import {
  formatToman,
  consoleLabel,
  platformBadgeClass,
  capacityLabel,
  GAMES_DEFAULT_SEARCH,
} from "@/features/games"
import { formatOrderNumber } from "@/features/orders"
import { cn } from "@/lib/utils"

function OwnedError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/games/")({
  validateSearch: (search: Record<string, unknown>): { page: number } => ({
    page: Math.max(1, Number(search.page) || 1),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(ownedQueryOptions(deps.page))
  },
  component: OwnedGamesPage,
  errorComponent: OwnedError,
})

function OwnedGamesPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <>
      <DashboardHeader
        title="بازی‌های من"
        description="بازی‌هایی که خریده‌اید. هر بازی قابل بازگشت را می‌توانید بازگردانید و اعتبارش را در کیف پول دریافت کنید."
      />
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری بازی‌ها
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<OwnedSkeleton />}>
          <OwnedList />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function OwnedList() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/dashboard/games/" })
  const { data } = useSuspenseQuery(ownedQueryOptions(search.page))

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <Gamepad2 className="size-8 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">
            هنوز بازی تحویل‌شده‌ای ندارید
          </p>
          <p className="text-sm text-muted-foreground">
            پس از تحویل سفارش، بازی‌ها اینجا نمایش داده می‌شوند
          </p>
        </div>
        <Link to="/games" search={GAMES_DEFAULT_SEARCH}>
          <Button>مشاهده بازی‌ها</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.items.map((it) => (
        <OwnedCard key={it.item_id} item={it} />
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(p) => navigate({ search: { page: p } })}
      />
    </div>
  )
}

function OwnedCard({ item }: { item: OwnedItem }) {
  // A terminal return means the account is no longer the buyer's — dim the card.
  const gone =
    item.return_status === "approved" || item.return_status === "refused"

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm transition-colors",
        gone && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-semibold">{item.game_name}</span>
          <Badge
            variant="secondary"
            className={cn(
              "shrink-0 border text-xs",
              platformBadgeClass(item.console)
            )}
          >
            {consoleLabel(item.console)}
          </Badge>
          <span className="shrink-0 text-xs text-muted-foreground">
            {capacityLabel(item.capacity)}
          </span>
        </div>
        {item.return_status && (
          <ReturnStatusBadge status={item.return_status} />
        )}
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        <span dir="ltr" className="font-mono">
          {formatOrderNumber(item.order_number)}
        </span>{" "}
        · خریداری‌شده در {formatReturnDate(item.purchased_at)}
      </p>

      <Separator className="my-4" />

      <CardAction item={item} gone={gone} />
    </div>
  )
}

function CardAction({ item, gone }: { item: OwnedItem; gone: boolean }) {
  // Approved → show the credited amount. Refused → forfeited message.
  if (item.return_status === "approved") {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          اعتبار واریزشده به کیف پول
        </span>
        <span className="font-semibold text-primary">
          {formatToman(item.credit_amount)}
        </span>
      </div>
    )
  }
  if (item.return_status === "refused") {
    return (
      <p className="text-sm text-destructive">
        درخواست بازگشت این بازی رد شد
        {item.return_reason ? `: ${item.return_reason}` : "."}
      </p>
    )
  }
  if (item.return_status === "pending") {
    return (
      <p className="text-sm text-muted-foreground">
        درخواست بازگشت شما در حال بررسی است.
      </p>
    )
  }
  if (item.return_status === "rejected") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-orange-600 dark:text-orange-400">
          {item.return_reason
            ? `نیازمند اصلاح: ${item.return_reason}`
            : "درخواست شما نیازمند اصلاح است."}
        </p>
        <Link
          to="/dashboard/games/$itemId/return"
          params={{ itemId: item.item_id }}
        >
          <Button size="sm" variant="outline" className="gap-1.5">
            <RotateCcw className="size-3.5" />
            ویرایش و ارسال مجدد
          </Button>
        </Link>
      </div>
    )
  }

  // No return yet.
  if (!item.returnable) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Ban className="size-3.5" />
        امکان بازگرداندن این بازی وجود ندارد
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm">
        {item.estimate.available ? (
          <span className="text-muted-foreground">
            اعتبار تقریبی بازگشت:{" "}
            <span className="font-semibold text-primary">
              {formatToman(item.estimate.net_credit)}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            اعتبار پس از بررسی مشخص می‌شود
          </span>
        )}
      </div>
      {!gone && (
        <Link
          to="/dashboard/games/$itemId/return"
          params={{ itemId: item.item_id }}
        >
          <Button size="sm" className="gap-1.5">
            <RotateCcw className="size-3.5" />
            بازگرداندن بازی
          </Button>
        </Link>
      )}
    </div>
  )
}

function ReturnStatusBadge({
  status,
}: {
  status: NonNullable<OwnedItem["return_status"]>
}) {
  const meta = RETURN_STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge
      variant="secondary"
      className={cn("shrink-0 gap-1.5 border", meta.className)}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  )
}

function OwnedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/60 bg-card/75 p-5"
        >
          <div className="flex justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-48" />
          <Separator className="my-4" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}
