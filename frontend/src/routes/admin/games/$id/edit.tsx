import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard-shell"
import {
  adminGameQueryOptions,
  adminPricingQueryOptions,
} from "@/features/games"
import { GameForm } from "@/features/games/game-form"

function EditGameError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/games/$id/edit")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(adminGameQueryOptions(params.id))
    context.queryClient.prefetchQuery(adminPricingQueryOptions())
  },
  component: EditGamePage,
  errorComponent: EditGameError,
})

function EditGamePage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <div className="mx-auto max-w-3xl">
      <DashboardHeader
        title="ویرایش بازی"
        back={{ to: "/admin/games", label: "بازگشت به بازی‌ها" }}
      />
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری بازی
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<FormSkeleton />}>
          <EditGameContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

function EditGameContent() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(adminGameQueryOptions(id))

  if (!data) {
    return (
      <div className="py-20 text-center">
        <p className="text-base font-semibold">بازی یافت نشد</p>
        <p className="mt-1 text-sm text-muted-foreground">
          این بازی وجود ندارد یا حذف شده است
        </p>
      </div>
    )
  }
  return <GameForm game={data.game} />
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  )
}
