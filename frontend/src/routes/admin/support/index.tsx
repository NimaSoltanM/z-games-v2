import {
  Link,
  createFileRoute,
  ErrorComponent,
  useNavigate,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useQueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Inbox, Search } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard-shell"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  adminSupportTicketsQueryOptions,
  TicketStatusBadge,
  TicketSummary,
} from "@/features/support"
import type { SupportStatus } from "@/features/support"

type StatusFilter = SupportStatus | ""
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "همه" },
  { value: "awaiting_admin", label: "نیازمند پاسخ" },
  { value: "awaiting_customer", label: "منتظر مشتری" },
  { value: "resolved", label: "پاسخ‌داده‌شده" },
]

function SupportQueueError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/support/")({
  validateSearch: (
    search: Record<string, unknown>
  ): { page: number; status: StatusFilter; search: string } => ({
    page: Math.max(1, Number(search.page) || 1),
    status: ["awaiting_admin", "awaiting_customer", "resolved"].includes(
      String(search.status)
    )
      ? (search.status as SupportStatus)
      : "",
    search: typeof search.search === "string" ? search.search : "",
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(adminSupportTicketsQueryOptions(deps))
  },
  component: AdminSupportPage,
  errorComponent: SupportQueueError,
})

function AdminSupportPage() {
  const { reset } = useQueryErrorResetBoundary()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/support/" })
  const [term, setTerm] = useState(search.search)
  return (
    <>
      <DashboardHeader
        title="پشتیبانی مشتریان"
        description="درخواست‌های نیازمند پاسخ در ابتدای صف قرار می‌گیرند."
      />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          navigate({ search: { ...search, search: term.trim(), page: 1 } })
        }}
      >
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="شماره درخواست، عنوان یا مشتری"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" size="icon" aria-label="جستجو">
          <Search className="size-4" />
        </Button>
      </form>
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={search.status === filter.value ? "default" : "outline"}
            onClick={() =>
              navigate({ search: { ...search, status: filter.value, page: 1 } })
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری صف پشتیبانی
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
  const navigate = useNavigate({ from: "/admin/support/" })
  const { data } = useSuspenseQuery(adminSupportTicketsQueryOptions(search))
  if (data.tickets.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <Inbox className="size-8 text-muted-foreground/40" />
        </div>
        <p className="font-semibold">درخواستی در این فهرست نیست</p>
      </div>
    )
  return (
    <div className="space-y-3">
      {data.tickets.map((ticket) => (
        <Link
          key={ticket.id}
          to="/admin/support/$id"
          params={{ id: ticket.id }}
          className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm transition-colors hover:border-primary/40"
        >
          <TicketSummary ticket={ticket} admin />
          <TicketStatusBadge status={ticket.status} admin />
        </Link>
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(page) => navigate({ search: { ...search, page } })}
      />
    </div>
  )
}

function QueueSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border/60 bg-card/75 p-4"
        >
          <div className="flex justify-between gap-4">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-52" />
        </div>
      ))}
    </div>
  )
}
