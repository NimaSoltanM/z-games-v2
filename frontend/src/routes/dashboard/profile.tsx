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
  useQueryClient,
} from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { LogOut, Phone, ShieldCheck, Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard-shell"
import { logout, meQueryOptions } from "@/features/auth"
import type { MeResponse } from "@/features/auth"
import { SERVER_CART_KEY } from "@/features/cart"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"

function ProfileError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/profile")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(meQueryOptions())
  },
  component: ProfilePage,
  errorComponent: ProfileError,
})

function ProfilePage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <>
      <DashboardHeader title="حساب کاربری" />

      <div className="mx-auto max-w-2xl">
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div className="py-20 text-center">
              <p className="mb-4 text-sm text-muted-foreground">خطا در بارگذاری حساب کاربری</p>
              <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
                تلاش مجدد
              </Button>
            </div>
          )}
        >
          <Suspense fallback={<ProfileSkeleton />}>
            <ProfileCard />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  )
}

const ROLE_LABEL: Record<MeResponse["role"], string> = {
  user: "کاربر",
  admin: "مدیر",
  super_admin: "مدیر کل",
}

function initialsOf(me: MeResponse) {
  const f = me.firstName?.trim()[0] ?? ""
  const l = me.lastName?.trim()[0] ?? ""
  const init = (f + l).trim()
  if (init) return init
  return me.phone ? me.phone.slice(-2) : "؟"
}

function fullNameOf(me: MeResponse) {
  return [me.firstName, me.lastName].filter(Boolean).join(" ").trim() || "حساب کاربری"
}

function ProfileCard() {
  const { data: me } = useSuspenseQuery(meQueryOptions())
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  if (!me) {
    return (
      <div className="py-20 text-center">
        <p className="text-base font-semibold">حساب کاربری یافت نشد</p>
        <p className="mt-1 text-sm text-muted-foreground">لطفاً دوباره وارد شوید</p>
      </div>
    )
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // even if the network call fails, clear local auth state below
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] })
    queryClient.invalidateQueries({ queryKey: SERVER_CART_KEY })
    navigate({ to: "/games", search: GAMES_DEFAULT_SEARCH })
  }

  const isAdmin = me.role !== "user"

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary/15 text-lg font-bold text-primary">
            {initialsOf(me)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold">{fullNameOf(me)}</h2>
              {isAdmin && (
                <Badge variant="secondary" className="gap-1 border border-primary/30 bg-primary/10 text-primary">
                  <ShieldCheck className="size-3.5" />
                  {ROLE_LABEL[me.role]}
                </Badge>
              )}
            </div>
            <p dir="ltr" className="mt-0.5 flex items-center gap-1.5 text-left text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              {me.phone}
            </p>
          </div>
        </div>

        <Separator className="my-5" />

        <Link to="/dashboard" search={{ page: 1, status: "" }}>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Package className="size-4" />
            سفارش‌های من
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm">
        <p className="text-sm font-semibold">خروج از حساب</p>
        <p className="mt-1 text-sm text-muted-foreground">
          برای ورود دوباره به کد تأیید پیامکی نیاز دارید.
        </p>
        <Button variant="destructive" className="mt-4 gap-2" onClick={handleLogout}>
          <LogOut className="size-4" />
          خروج از حساب
        </Button>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card/75 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Separator className="my-5" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  )
}
