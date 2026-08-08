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
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { FilePlus2, LifeBuoy, Plus } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard-shell"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  mySupportTicketsQueryOptions,
  TicketStatusBadge,
  TicketSummary,
} from "@/features/support"

function SupportError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/support/")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Math.max(1, Number(search.page) || 1),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(mySupportTicketsQueryOptions(deps.page))
  },
  component: SupportPage,
  errorComponent: SupportError,
})

function SupportPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <>
      <DashboardHeader
        title="پشتیبانی"
        description="درخواست‌ها و پاسخ‌های پشتیبانی را اینجا پیگیری کنید."
        action={
          <Button
            render={
              <Link to="/dashboard/support/new" search={{ order: undefined }} />
            }
            size="sm"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">درخواست جدید</span>
          </Button>
        }
      />
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
        <Suspense fallback={<ListSkeleton />}>
          <TicketList />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function TicketList() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/dashboard/support/" })
  const { data } = useSuspenseQuery(mySupportTicketsQueryOptions(search.page))

  if (data.tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <LifeBuoy className="size-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="font-semibold">هنوز درخواستی ندارید</p>
          <p className="mt-1 text-sm text-muted-foreground">
            اگر برای سفارش یا حساب بازی به راهنمایی نیاز دارید، یک درخواست ثبت
            کنید.
          </p>
        </div>
        <Button
          render={
            <Link to="/dashboard/support/new" search={{ order: undefined }} />
          }
        >
          <FilePlus2 className="size-4" />
          ثبت درخواست پشتیبانی
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.tickets.map((ticket) => (
        <Link
          key={ticket.id}
          to="/dashboard/support/$id"
          params={{ id: ticket.id }}
          className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm transition-colors hover:border-primary/40"
        >
          <TicketSummary ticket={ticket} />
          <TicketStatusBadge status={ticket.status} />
        </Link>
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(page) => navigate({ search: { page } })}
      />
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border/60 bg-card/75 p-4"
        >
          <div className="flex justify-between gap-4">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-44" />
        </div>
      ))}
    </div>
  )
}
