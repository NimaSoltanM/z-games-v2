import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useQueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ArrowLeft, BadgeCheck, Film, Info, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CatalogGameCard,
  formatToman,
  gamesQueryOptions,
} from "@/features/games"
import { catalogJsonLd, jsonLdScript, seoHead } from "@/features/seo"

const buybackParams = (page: number) =>
  ({ page, returnable: true, sort: "-created_at" }) as const

function BuybackError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/buyback")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Math.max(1, Number(search.page) || 1),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const options = gamesQueryOptions(buybackParams(deps.page))
    await context.queryClient.prefetchQuery(options)
    return context.queryClient.ensureQueryData(options)
  },
  head: ({ loaderData, match }) => {
    const page = match.search.page
    const head = seoHead({
      title:
        page > 1
          ? `بازی‌های قابل بازخرید؛ صفحه ${page.toLocaleString("fa-IR")} | زد گیمز`
          : "بازخرید اکانت بازی؛ بازی کن، پس بده، اعتبار بگیر | زد گیمز",
      description:
        "اکانت بازی واجد شرایط را پس از پایان بازی به زد گیمز بازگردان و بر اساس قیمت روز، برای خرید بعدی اعتبار کیف پول بگیر.",
      path: page > 1 ? `/buyback?page=${page}` : "/buyback",
      keepCanonicalSearch: page > 1,
    })
    return {
      ...head,
      scripts:
        page === 1 && loaderData
          ? [
              jsonLdScript(
                catalogJsonLd(loaderData.games, {
                  path: "/buyback",
                  name: "بازی‌های قابل بازخرید",
                  description:
                    "فهرست بازی‌هایی که اکانت آن‌ها پس از تأیید شرایط قابل بازخرید و تبدیل به اعتبار کیف پول زد گیمز است.",
                })
              ),
            ]
          : [],
    }
  },
  component: BuybackPage,
  errorComponent: BuybackError,
})

function BuybackPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <main className="min-h-screen bg-background bg-grid-lines">
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="mx-auto max-w-7xl px-4 py-24 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              دریافت بازی‌های قابل بازخرید ناموفق بود.
            </p>
            <Button variant="outline" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<BuybackSkeleton />}>
          <BuybackContent />
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}

function BuybackContent() {
  const { page } = Route.useSearch()
  const { data } = useSuspenseQuery(gamesQueryOptions(buybackParams(page)))
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold text-primary">
            بازخرید اکانت بازی
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-[1.35] font-black sm:text-5xl">
            بازی کن، تمامش کن، برای بازی بعدی اعتبار بگیر.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            اگر بازی نشان «قابل بازخرید» داشته باشد، بعد از پایان بازی می‌توانی
            اکانت را طبق قوانین بازگردانی. پس از بررسی، اعتبار بر مبنای قیمت روز
            همان بازی به کیف پول زد گیمز اضافه می‌شود.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              render={<a href="#eligible-games" />}
              nativeButton={false}
              className="gap-2"
            >
              بازی‌های قابل بازخرید
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              render={<Link to="/returns/rules" />}
              nativeButton={false}
              variant="outline"
            >
              قوانین کامل بازخرید
            </Button>
          </div>
        </div>
        <BuybackCalculator />
      </header>

      <Alert variant="info" className="mt-10">
        <Info />
        <AlertTitle>بازخرید Xbox فعلاً فعال نیست</AlertTitle>
        <AlertDescription>
          در حال حاضر بازخرید فقط برای بازی‌های واجد شرایط PlayStation انجام
          می‌شود. هنوز روش قابل‌اتکایی برای ثبت مدرک بازگشت اکانت Xbox نداریم؛
          اگر راه مطمئنی فراهم شود، این امکان را در آینده اضافه می‌کنیم.
        </AlertDescription>
      </Alert>

      <section aria-labelledby="buyback-process" className="mt-20">
        <h2 id="buyback-process" className="text-2xl font-bold">
          بازخرید چطور انجام می‌شود؟
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: BadgeCheck,
              title: "واجد شرایط بودن را بررسی کن",
              text: "در صفحه بازی یا سفارش، نشان قابل بازخرید و شرایط همان خرید را ببین.",
            },
            {
              icon: Film,
              title: "درخواست و مدرک را ثبت کن",
              text: "درخواست بازخرید را از حساب کاربری می‌فرستی و مراحل خروج امن از اکانت را انجام می‌دهی.",
            },
            {
              icon: WalletCards,
              title: "اعتبار کیف پول بگیر",
              text: "پس از تأیید مدیر، مبلغ نهایی به کیف پول فروشگاه اضافه و برای خرید بعدی قابل استفاده می‌شود.",
            },
          ].map((step, index) => (
            <article
              key={step.title}
              className="rounded-2xl border border-border/60 bg-card/70 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <step.icon className="size-5" />
                </span>
                <span className="text-sm text-muted-foreground">
                  {(index + 1).toLocaleString("fa-IR")}
                </span>
              </div>
              <h3 className="mt-4 font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="eligible-games"
        aria-labelledby="eligible-title"
        className="mt-20 scroll-mt-24"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="eligible-title" className="text-2xl font-bold">
              بازی‌های قابل بازخرید
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              وضعیت هر بازی ممکن است تغییر کند؛ نشان صفحه بازی و شرایط سفارش
              منبع نهایی است.
            </p>
          </div>
          <span className="shrink-0 text-sm text-muted-foreground">
            {data.pagination.total.toLocaleString("fa-IR")} بازی
          </span>
        </div>
        {data.games.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.games.map((game) => (
              <CatalogGameCard
                key={game.id}
                game={game}
                rate={data.exchange_rate}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            در حال حاضر بازی قابل بازخریدی در کاتالوگ فعال نیست.
          </div>
        )}
        {data.pagination.total_pages > 1 && (
          <nav
            aria-label="صفحه‌بندی بازی‌های قابل بازخرید"
            className="mt-8 flex items-center justify-center gap-2"
          >
            {page > 1 ? (
              <Button
                render={<Link to="/buyback" search={{ page: page - 1 }} />}
                nativeButton={false}
                variant="outline"
              >
                قبلی
              </Button>
            ) : (
              <Button variant="outline" disabled>
                قبلی
              </Button>
            )}
            <span className="px-3 text-sm text-muted-foreground">
              صفحه {page.toLocaleString("fa-IR")} از{" "}
              {data.pagination.total_pages.toLocaleString("fa-IR")}
            </span>
            {page < data.pagination.total_pages ? (
              <Button
                render={<Link to="/buyback" search={{ page: page + 1 }} />}
                nativeButton={false}
                variant="outline"
              >
                بعدی
              </Button>
            ) : (
              <Button variant="outline" disabled>
                بعدی
              </Button>
            )}
          </nav>
        )}
      </section>
    </div>
  )
}

function BuybackCalculator() {
  const [price, setPrice] = useState("")
  const numericPrice = Math.max(0, Number(price.replaceAll(",", "")) || 0)
  const estimate = Math.round(numericPrice * 0.75)

  return (
    <aside className="rounded-3xl border border-primary/25 bg-card/80 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm">
      <h2 className="text-xl font-bold">برآورد سریع اعتبار</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        قیمت فعلی گزینه‌ای را که خریده‌ای وارد کن تا اعتبار تقریبی با کارمزد
        عادی را ببینی.
      </p>
      <div className="mt-5 space-y-2">
        <Label htmlFor="buyback-price">قیمت روز (تومان)</Label>
        <Input
          id="buyback-price"
          dir="ltr"
          inputMode="numeric"
          value={price}
          onChange={(event) =>
            setPrice(event.target.value.replace(/[^0-9,]/g, ""))
          }
          placeholder="مثلاً 2,000,000"
        />
      </div>
      <div className="mt-5 rounded-2xl bg-primary/10 p-5 text-center">
        <p className="text-xs text-muted-foreground">اعتبار تقریبی کیف پول</p>
        <p className="mt-2 text-2xl font-black text-primary">
          {numericPrice > 0 ? formatToman(estimate) : "—"}
        </p>
      </div>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">
        این عدد تخمینی است. مبلغ نهایی بر اساس قیمت روز همان کنسول و ظرفیت،
        وضعیت سفارش و کارمزد فعال هنگام ثبت درخواست محاسبه می‌شود. اعتبار قابل
        برداشت نقدی نیست.
      </p>
    </aside>
  )
}

function BuybackSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-80 rounded-3xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="aspect-3/4 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
