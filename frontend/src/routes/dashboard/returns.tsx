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
import { RotateCcw, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/pagination"
import { DashboardHeader } from "@/components/dashboard-shell"
import {
  myReturnsQueryOptions,
  RETURN_STATUS_META,
  formatReturnDate,
} from "@/features/returns"
import type { MyReturn } from "@/features/returns"
import {
  formatToman,
  consoleLabel,
  platformBadgeClass,
  capacityLabel,
} from "@/features/games"
import { cn } from "@/lib/utils"

function ReturnsError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/returns")({
  validateSearch: (search: Record<string, unknown>): { page: number } => ({
    page: Math.max(1, Number(search.page) || 1),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(myReturnsQueryOptions(deps.page))
  },
  component: ReturnsPage,
  errorComponent: ReturnsError,
})

function ReturnsPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <>
      <DashboardHeader title="درخواست‌های بازگشت" />
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری درخواست‌ها
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<ReturnsSkeleton />}>
          <ReturnsList />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function ReturnsList() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/dashboard/returns" })
  const { data } = useSuspenseQuery(myReturnsQueryOptions(search.page))

  if (data.returns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <RotateCcw className="size-8 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">هنوز درخواست بازگشتی ندارید</p>
          <p className="text-sm text-muted-foreground">
            از بخش «بازی‌های من» می‌توانید یک بازی را بازگردانید
          </p>
        </div>
        <Link to="/dashboard/games" search={{ page: 1 }}>
          <Button>بازی‌های من</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.returns.map((r) => (
        <ReturnCard key={r.id} item={r} />
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(p) => navigate({ search: { page: p } })}
      />
    </div>
  )
}

function ReturnCard({ item }: { item: MyReturn }) {
  const meta = RETURN_STATUS_META[item.status]
  const Icon = meta.icon

  return (
    <div className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
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
        <Badge
          variant="secondary"
          className={cn("shrink-0 gap-1.5 border", meta.className)}
        >
          <Icon className="size-3.5" />
          {meta.label}
        </Badge>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        ثبت‌شده در {formatReturnDate(item.created_at)}
      </p>

      {(item.reason || item.status === "approved") && (
        <Separator className="my-4" />
      )}

      {item.status === "approved" && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            اعتبار واریزشده به کیف پول
          </span>
          <span className="font-semibold text-primary">
            {formatToman(item.credit_amount)}
          </span>
        </div>
      )}

      {item.status === "rejected" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-orange-600 dark:text-orange-400">
            {item.reason
              ? `دلیل: ${item.reason}`
              : "درخواست شما نیازمند اصلاح است."}
          </p>
          <Link
            to="/dashboard/games/$itemId/return"
            params={{ itemId: item.item_id }}
          >
            <Button size="sm" variant="outline" className="gap-1.5">
              <RefreshCw className="size-3.5" />
              ویرایش و ارسال مجدد
            </Button>
          </Link>
        </div>
      )}

      {item.status === "refused" && item.reason && (
        <p className="text-sm text-destructive">دلیل رد: {item.reason}</p>
      )}
    </div>
  )
}

function ReturnsSkeleton() {
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
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  )
}
