import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard-shell"
import { adminPricingQueryOptions } from "@/features/games"
import { GameForm } from "@/features/games/game-form"

function NewGameError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/games/new")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(adminPricingQueryOptions())
  },
  component: NewGamePage,
  errorComponent: NewGameError,
})

function NewGamePage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <div className="mx-auto max-w-3xl">
      <DashboardHeader
        title="ساخت بازی جدید"
        back={{ to: "/admin/games", label: "بازگشت به بازی‌ها" }}
      />
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری تنظیمات قیمت‌گذاری
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<FormSkeleton />}>
          <GameForm />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
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
