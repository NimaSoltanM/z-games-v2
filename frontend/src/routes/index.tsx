import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  queryOptions,
  useQueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Hydrate } from "@tanstack/react-start"
import { never, visible } from "@tanstack/react-start/hydration"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"

import { Hero } from "@/components/landing/hero"
import { BuyBack } from "@/components/landing/buy-back"
import { GamesShowcase } from "@/components/landing/games-showcase"
import { Tiers } from "@/components/landing/tiers"
import { Features } from "@/components/landing/features"
import { Faq } from "@/components/landing/faq"
import { FinalCta } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { gamesQueryOptions, GAMES_DEFAULT_SEARCH } from "@/features/games"
import { seoHead } from "@/features/seo"

const HOME_GAMES_PARAMS = {
  page: 1,
  limit: 8,
  sort: "-created_at",
} as const

const homeGamesQueryOptions = () =>
  queryOptions({
    ...gamesQueryOptions(HOME_GAMES_PARAMS),
    staleTime: 60_000,
  })

function LandingError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(homeGamesQueryOptions())
  },
  component: LandingPage,
  errorComponent: LandingError,
  head: () =>
    seoHead({
      title: "خرید اکانت قانونی بازی PS5 و Xbox | زد گیمز",
      description:
        "خرید اکانت قانونی بازی‌های PS4، PS5 و Xbox با پشتیبانی واقعی، کاتالوگ رو‌به‌رشد و امکان بازخرید بازی‌های واجد شرایط.",
      path: "/",
    }),
})

function LandingPage() {
  return (
    <main>
      <Hero />
      <Hydrate when={visible({ rootMargin: "400px" })}>
        <HomepageGames />
      </Hydrate>
      <Hydrate when={visible({ rootMargin: "700px" })}>
        <BuyBack />
      </Hydrate>
      <Hydrate when={never()}>
        <Tiers />
      </Hydrate>
      <Hydrate when={never()}>
        <Features />
      </Hydrate>
      <Hydrate when={visible({ rootMargin: "700px" })}>
        <Faq />
      </Hydrate>
      <Hydrate when={visible({ rootMargin: "700px" })}>
        <FinalCta />
      </Hydrate>
      <Hydrate when={visible({ rootMargin: "700px" })}>
        <Footer />
      </Hydrate>
    </main>
  )
}

function HomepageGames() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <section className="border-y border-border/50 bg-background px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 rounded-2xl border border-border/60 bg-card/75 p-6">
            <p className="font-semibold">بازی‌ها فعلاً بارگذاری نشدن.</p>
            <p className="text-sm text-muted-foreground">
              می‌تونی دوباره تلاش کنی یا مستقیم وارد کاتالوگ بشی.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={resetErrorBoundary}>تلاش مجدد</Button>
              <Button
                render={<Link to="/games" search={GAMES_DEFAULT_SEARCH} />}
                nativeButton={false}
                variant="outline"
              >
                مشاهده‌ی کاتالوگ
              </Button>
            </div>
          </div>
        </section>
      )}
    >
      <Suspense fallback={<GamesShowcaseSkeleton />}>
        <HomepageGamesData />
      </Suspense>
    </ErrorBoundary>
  )
}

function HomepageGamesData() {
  const { data } = useSuspenseQuery(homeGamesQueryOptions())
  return <GamesShowcase games={data.games} rate={data.exchange_rate} />
}

function GamesShowcaseSkeleton() {
  return (
    <section
      aria-label="در حال بارگذاری تازه‌ترین بازی‌ها"
      className="border-y border-border/50 bg-background px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-xl" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className="aspect-3/4 w-36 shrink-0 rounded-2xl sm:w-44 lg:w-48"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
