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
import { RotateCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/pagination"
import { DashboardHeader } from "@/components/dashboard-shell"
import {
  adminReturnsQueryOptions,
  RETURN_STATUS_META,
  formatReturnDate,
} from "@/features/returns"
import type { AdminReturnRow, ReturnStatus } from "@/features/returns"
import {
  formatToman,
  consoleLabel,
  platformBadgeClass,
  capacityLabel,
} from "@/features/games"
import { cn } from "@/lib/utils"

type StatusFilter = "" | ReturnStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "همه" },
  { value: "pending", label: "در انتظار بررسی" },
  { value: "approved", label: "تأییدشده" },
  { value: "rejected", label: "نیازمند اصلاح" },
  { value: "refused", label: "ردشده" },
]

function AdminReturnsError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/returns/")({
  validateSearch: (
    search: Record<string, unknown>
  ): { page: number; status: StatusFilter; search: string } => ({
    page: Math.max(1, Number(search.page) || 1),
    status: ["pending", "approved", "rejected", "refused"].includes(
      String(search.status)
    )
      ? (search.status as ReturnStatus)
      : "",
    search: typeof search.search === "string" ? search.search : "",
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(adminReturnsQueryOptions(deps))
  },
  component: AdminReturnsPage,
  errorComponent: AdminReturnsError,
})

function AdminReturnsPage() {
  const { reset } = useQueryErrorResetBoundary()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/returns/" })
  const [term, setTerm] = useState(search.search)

  return (
    <>
      <DashboardHeader title="بازگشت‌ها" />

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          navigate({ search: { ...search, search: term.trim(), page: 1 } })
        }}
      >
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="جستجو بر اساس شماره یا نام کاربر"
          className="max-w-xs"
        />
        <Button type="submit" variant="outline" size="icon" aria-label="جستجو">
          <Search className="size-4" />
        </Button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
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

      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری بازگشت‌ها
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<QueueSkeleton />}>
          <Queue />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function Queue() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/returns/" })
  const { data } = useSuspenseQuery(adminReturnsQueryOptions(search))

  if (data.returns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <RotateCcw className="size-8 text-muted-foreground/40" />
        </div>
        <p className="text-base font-semibold">
          درخواست بازگشتی در این فهرست نیست
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.returns.map((r) => (
        <ReturnRow key={r.id} row={r} />
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(p) => navigate({ search: { ...search, page: p } })}
      />
    </div>
  )
}

function ReturnRow({ row }: { row: AdminReturnRow }) {
  const meta = RETURN_STATUS_META[row.status]
  const Icon = meta.icon

  return (
    <Link
      to="/admin/returns/$id"
      params={{ id: row.id }}
      className="block rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{row.game_name}</span>
            <Badge
              variant="secondary"
              className={cn("border text-xs", platformBadgeClass(row.console))}
            >
              {consoleLabel(row.console)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {capacityLabel(row.capacity)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.user_name.trim() || "کاربر"} ·{" "}
            <span dir="ltr" className="font-mono">
              {row.user_phone}
            </span>{" "}
            · {formatReturnDate(row.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge
            variant="secondary"
            className={cn("gap-1.5 border", meta.className)}
          >
            <Icon className="size-3.5" />
            {meta.label}
          </Badge>
          {row.status === "approved" && row.credit_amount != null && (
            <span className="text-xs font-semibold text-primary">
              {formatToman(row.credit_amount)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function QueueSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 bg-card/75 p-4"
        >
          <div className="flex justify-between">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
      ))}
    </div>
  )
}
