import {
  createFileRoute,
  ErrorComponent,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useQueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { CalendarDays, Phone, UserRound, UsersRound } from "lucide-react"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"

import { DashboardHeader } from "@/components/dashboard-shell"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getMeFn } from "@/features/auth"
import { noIndexHead } from "@/features/seo"
import { usersQueryOptions } from "@/features/users"
import type { AdminUser, UserRole } from "@/features/users"

type Search = { page: number }

const ROLE_LABELS: Record<UserRole, string> = {
  user: "کاربر",
  admin: "مدیر",
  super_admin: "مدیر کل",
}

const ROLE_VARIANTS: Record<UserRole, "default" | "secondary" | "outline"> = {
  user: "outline",
  admin: "secondary",
  super_admin: "default",
}

function UsersErrorComponent({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/users")({
  head: () => noIndexHead("کاربران | زد گیمز"),
  validateSearch: (search: Record<string, unknown>): Search => ({
    page: Math.max(1, Number(search.page) || 1),
  }),
  beforeLoad: async () => {
    const me = await getMeFn()
    if (!me)
      throw redirect({ to: "/auth", search: { redirect: "/admin/users" } })
    if (me.role !== "super_admin") {
      throw redirect({
        to: "/admin/orders",
        search: { page: 1, status: "", search: "" },
      })
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(usersQueryOptions(deps))
  },
  component: UsersPage,
  errorComponent: UsersErrorComponent,
})

function UsersPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <>
      <DashboardHeader
        title="کاربران"
        description="حساب‌های ثبت‌شده، از جدیدترین به قدیمی‌ترین"
      />

      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری کاربران
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<UsersSkeleton />}>
          <UsersContent />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function UsersContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/users" })
  const { data } = useSuspenseQuery(usersQueryOptions(search))

  if (data.users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <UsersRound className="size-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="font-semibold">هنوز کاربری ثبت‌نام نکرده است</p>
          <p className="mt-1 text-sm text-muted-foreground">
            حساب‌های جدید پس از ثبت‌نام اینجا نمایش داده می‌شوند.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        {data.pagination.total.toLocaleString("fa-IR")} کاربر
      </p>

      <div className="space-y-2">
        {data.users.map((user) => (
          <UserItem key={user.phone} user={user} />
        ))}
      </div>

      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(page) => navigate({ search: { page } })}
      />
    </div>
  )
}

function UserItem({ user }: { user: AdminUser }) {
  const name = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")

  return (
    <article className="rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <UserRound className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">
                {name || "بدون نام"}
              </p>
              <Badge variant={ROLE_VARIANTS[user.role]}>
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3.5" />
              <span dir="ltr" className="tabular-nums">
                {toPersianDigits(user.phone)}
              </span>
            </p>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums sm:shrink-0">
          <CalendarDays className="size-3.5" />
          {formatSignupTime(user.created_at)}
        </p>
      </div>
    </article>
  )
}

function formatSignupTime(iso: string): string {
  const date = new Date(iso)
  return `${date.toLocaleDateString("fa-IR")}، ${date.toLocaleTimeString(
    "fa-IR",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  )}`
}

function toPersianDigits(value: string): string {
  const digits = "۰۱۲۳۴۵۶۷۸۹"
  return value.replace(/[0-9]/g, (digit) => digits[Number(digit)])
}

function UsersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-20" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border/60 bg-card/75 p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="hidden h-3 w-32 sm:block" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
