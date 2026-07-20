import {
  createFileRoute,
  ErrorComponent,
  Link,
  notFound,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useQueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  capacityDesc,
  CatalogGameCard,
  gamesQueryOptions,
} from "@/features/games"
import {
  catalogJsonLd,
  jsonLdScript,
  PLATFORM_PAGES,
  seoHead,
} from "@/features/seo"

function PlatformError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/games/platform/$platform")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Math.max(1, Number(search.page) || 1),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const content = PLATFORM_PAGES[params.platform]
    if (!content) throw notFound()

    const options = gamesQueryOptions({
      page: deps.page,
      platform: params.platform,
      sort: "-created_at",
    })
    await context.queryClient.prefetchQuery(options)
    const data = await context.queryClient.ensureQueryData(options)
    if (!data.exchange_rate?.consoles.some((c) => c.code === params.platform)) {
      throw notFound()
    }
    return data
  },
  head: ({ params, match, loaderData }) => {
    const content = PLATFORM_PAGES[params.platform]
    if (!content) {
      return seoHead({
        title: "پلتفرم یافت نشد | زد گیمز",
        description: "فهرست این پلتفرم در زد گیمز یافت نشد.",
        path: `/games/platform/${params.platform}`,
        noIndex: true,
      })
    }

    const page = match.search.page
    const path =
      page > 1
        ? `/games/platform/${params.platform}?page=${page}`
        : `/games/platform/${params.platform}`
    const head = seoHead({
      title:
        page > 1
          ? `${content.title}؛ صفحه ${page.toLocaleString("fa-IR")} | زد گیمز`
          : content.seoTitle,
      description: content.description,
      path,
      keepCanonicalSearch: page > 1,
    })
    return {
      ...head,
      scripts:
        page === 1 && loaderData
          ? [
              jsonLdScript(
                catalogJsonLd(loaderData.games, {
                  path: `/games/platform/${params.platform}`,
                  name: content.title,
                  description: content.description,
                })
              ),
            ]
          : [],
    }
  },
  component: PlatformPage,
  errorComponent: PlatformError,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">این پلتفرم پیدا نشد</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        فهرست اختصاصی این پلتفرم هنوز منتشر نشده است.
      </p>
      <Button
        render={
          <Link
            to="/games"
            search={{
              page: 1,
              platform: "",
              zarfiat: "",
              search: "",
              sort: "-created_at",
            }}
          />
        }
        nativeButton={false}
        className="mt-6"
      >
        مشاهده همه بازی‌ها
      </Button>
    </main>
  ),
})

function PlatformPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <main className="min-h-screen bg-background bg-grid-lines">
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="mx-auto max-w-7xl px-4 py-24 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              دریافت فهرست بازی‌ها ناموفق بود.
            </p>
            <Button variant="outline" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<PlatformSkeleton />}>
          <PlatformContent />
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}

function PlatformContent() {
  const { platform } = Route.useParams()
  const { page } = Route.useSearch()
  const content = PLATFORM_PAGES[platform]!
  const options = gamesQueryOptions({ page, platform, sort: "-created_at" })
  const { data } = useSuspenseQuery(options)
  const consoleEntry = data.exchange_rate?.consoles.find(
    (c) => c.code === platform
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold text-primary">
          فروشگاه {consoleEntry?.label_fa}
        </p>
        <h1 className="mt-2 text-3xl leading-tight font-black sm:text-4xl">
          {content.title}
        </h1>
        <p className="mt-4 text-sm leading-8 text-muted-foreground sm:text-base">
          {content.intro}
        </p>
      </header>

      {consoleEntry && (
        <section aria-labelledby="capacity-guide" className="mt-8">
          <h2 id="capacity-guide" className="text-lg font-bold">
            راهنمای گزینه‌های {consoleEntry.label_fa}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {consoleEntry.capacities.map((capacity) => (
              <div
                key={capacity.code}
                className="rounded-xl border border-border/60 bg-card/70 p-4"
              >
                <h3 className="font-semibold">{capacity.label_fa}</h3>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  {capacityDesc(capacity.code)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="platform-games" className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="platform-games" className="text-2xl font-bold">
              بازی‌های موجود
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.pagination.total.toLocaleString("fa-IR")} بازی در این فهرست
            </p>
          </div>
          <Link
            to="/games"
            search={{
              page: 1,
              platform,
              zarfiat: "",
              search: "",
              sort: "-created_at",
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            فیلترهای بیشتر
          </Link>
        </div>

        {data.games.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.games.map((game) => (
              <CatalogGameCard
                key={game.id}
                game={game}
                rate={data.exchange_rate}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            هنوز بازی فعالی برای این پلتفرم ثبت نشده است.
          </div>
        )}

        {data.pagination.total_pages > 1 && (
          <nav
            aria-label="صفحه‌بندی"
            className="mt-8 flex items-center justify-center gap-2"
          >
            <Button
              render={
                page > 1 ? (
                  <Link
                    to="/games/platform/$platform"
                    params={{ platform }}
                    search={{ page: page - 1 }}
                  />
                ) : undefined
              }
              nativeButton={page <= 1}
              variant="outline"
              disabled={page <= 1}
            >
              قبلی
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              صفحه {page.toLocaleString("fa-IR")} از{" "}
              {data.pagination.total_pages.toLocaleString("fa-IR")}
            </span>
            <Button
              render={
                page < data.pagination.total_pages ? (
                  <Link
                    to="/games/platform/$platform"
                    params={{ platform }}
                    search={{ page: page + 1 }}
                  />
                ) : undefined
              }
              nativeButton={page >= data.pagination.total_pages}
              variant="outline"
              disabled={page >= data.pagination.total_pages}
            >
              بعدی
            </Button>
          </nav>
        )}
      </section>
    </div>
  )
}

function PlatformSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-20 max-w-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="aspect-3/4 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
