import {
  createFileRoute,
  ErrorComponent,
  Link,
  useNavigate,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useMutation,
  useQueryClient,
  useQueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import {
  ArchiveRestore,
  ExternalLink,
  PackageCheck,
  Search,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { DashboardHeader } from "@/components/dashboard-shell"
import { Pagination } from "@/components/pagination"
import {
  formatReturnDate,
  returnedAccountsQueryOptions,
  setReturnedAccountAvailability,
} from "@/features/returns"
import type { ReturnedAccount, ReturnedAccountStatus } from "@/features/returns"
import {
  capacityLabel,
  consoleLabel,
  platformBadgeClass,
} from "@/features/games"
import { cn } from "@/lib/utils"

type InventorySearch = {
  page: number
  status: ReturnedAccountStatus | ""
  search: string
}

const FILTERS: { value: InventorySearch["status"]; label: string }[] = [
  { value: "", label: "همه" },
  { value: "available", label: "آماده استفاده" },
  { value: "disabled", label: "کنار گذاشته‌شده" },
  { value: "reused", label: "استفاده‌شده" },
]

function InventoryError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/inventory")({
  validateSearch: (search: Record<string, unknown>): InventorySearch => ({
    page: Math.max(1, Number(search.page) || 1),
    status: ["available", "disabled", "reused"].includes(String(search.status))
      ? (search.status as ReturnedAccountStatus)
      : "",
    search: typeof search.search === "string" ? search.search : "",
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(returnedAccountsQueryOptions(deps))
  },
  component: InventoryPage,
  errorComponent: InventoryError,
})

function InventoryPage() {
  const { reset } = useQueryErrorResetBoundary()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/inventory" })
  const [term, setTerm] = useState(search.search)

  return (
    <>
      <DashboardHeader
        title="حساب‌های برگشتی"
        description="موجودی قابل استفاده و سابقهٔ همهٔ حساب‌هایی که بازگردانده شده‌اند"
      />

      <div className="mb-6 rounded-xl border border-border/60 bg-card/75 p-4 text-sm leading-relaxed text-muted-foreground backdrop-blur-sm">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            استفاده از حساب در صفحهٔ سفارش، وضعیت آن را خودکار به «استفاده‌شده»
            تغییر می‌دهد. اگر حساب را از مسیر دیگری فروختید، آن را از موجودی
            خارج کنید؛ هیچ سابقه‌ای حذف نمی‌شود.
          </p>
        </div>
      </div>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          navigate({ search: { ...search, search: term.trim(), page: 1 } })
        }}
      >
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="جستجو بر اساس نام بازی یا شماره سفارش"
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
              navigate({
                search: { ...search, status: filter.value, page: 1 },
              })
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
              خطا در بارگذاری حساب‌های برگشتی
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<InventorySkeleton />}>
          <InventoryList />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function InventoryList() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/inventory" })
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(returnedAccountsQueryOptions(search))
  const availability = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      setReturnedAccountAvailability(id, available),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "returned-accounts"],
      })
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] })
      toast.success(
        variables.available
          ? "حساب دوباره به موجودی اضافه شد"
          : "حساب بدون حذف سابقه از موجودی خارج شد"
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "خطا در تغییر موجودی"
      )
    },
  })

  if (data.accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <ArchiveRestore className="size-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="font-semibold">حساب برگشتی در این فهرست نیست</p>
          <p className="mt-1 text-sm text-muted-foreground">
            پس از تأیید درخواست بازگشت، حساب اینجا ثبت می‌شود.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.accounts.map((account) => (
        <InventoryRow
          key={account.return_id}
          account={account}
          pending={
            availability.isPending &&
            availability.variables.id === account.return_id
          }
          onAvailability={(available) =>
            availability.mutate({ id: account.return_id, available })
          }
        />
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(page) => navigate({ search: { ...search, page } })}
      />
    </div>
  )
}

function InventoryRow({
  account,
  pending,
  onAvailability,
}: {
  account: ReturnedAccount
  pending: boolean
  onAvailability: (available: boolean) => void
}) {
  const reused = account.reused_at !== null
  const status = reused
    ? {
        label: "استفاده‌شده",
        className:
          "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        icon: PackageCheck,
      }
    : account.available
      ? {
          label: "آماده استفاده",
          className:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          icon: ArchiveRestore,
        }
      : {
          label: "کنار گذاشته‌شده",
          className:
            "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          icon: ArchiveRestore,
        }
  const StatusIcon = status.icon

  return (
    <article className="rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-semibold">{account.game_name}</h2>
            <Badge
              variant="secondary"
              className={cn(
                "border text-xs",
                platformBadgeClass(account.console)
              )}
            >
              {consoleLabel(account.console)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {capacityLabel(account.capacity)}
            </span>
          </div>

          <p dir="ltr" className="text-left font-mono text-sm text-foreground">
            {account.account_email ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            بازگشت در {formatReturnDate(account.returned_at)}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              render={
                <Link
                  to="/admin/orders/$orderId"
                  params={{ orderId: account.source_order_id }}
                />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
            >
              سفارش اولیه #{account.source_order_number.toLocaleString("fa-IR")}
              <ExternalLink className="size-3" />
            </Button>
            <Button
              render={
                <Link
                  to="/admin/returns/$id"
                  params={{ id: account.return_id }}
                />
              }
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
            >
              جزئیات بازگشت
            </Button>
            {account.reused_for_order_id &&
              account.reused_for_order_number !== null && (
                <Button
                  render={
                    <Link
                      to="/admin/orders/$orderId"
                      params={{ orderId: account.reused_for_order_id }}
                    />
                  }
                  nativeButton={false}
                  variant="secondary"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                >
                  استفاده در سفارش #
                  {account.reused_for_order_number.toLocaleString("fa-IR")}
                  <ExternalLink className="size-3" />
                </Button>
              )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
          <Badge
            variant="secondary"
            className={cn("gap-1.5 border", status.className)}
          >
            <StatusIcon className="size-3.5" />
            {status.label}
          </Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{reused ? "تحویل مجدد شده" : "در موجودی"}</span>
            <Switch
              checked={account.available}
              disabled={reused || pending}
              onCheckedChange={onAvailability}
              aria-label={`موجودی ${account.game_name}`}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function InventorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border/60 bg-card/75 p-4"
        >
          <div className="flex justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-7 w-40" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
