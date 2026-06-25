import {
  createFileRoute,
  ErrorComponent,
  Link,
  useNavigate,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Suspense, useState, useEffect } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import {
  gamesQueryOptions,
  cheapestPrice,
  formatToman,
  PLATFORM_LABEL,
  PLATFORM_BADGE_CLASS,
  PreOrderBadge,
  gameCoverSrc,
} from "@/features/games"

const SORT_OPTIONS = [
  { value: "-created_at", label: "جدیدترین" },
  { value: "created_at", label: "قدیمی‌ترین" },
  { value: "name", label: "نام (A-Z)" },
  { value: "-name", label: "نام (Z-A)" },
] as const

const PLATFORM_OPTIONS = [
  { value: "", label: "همه" },
  { value: "ps4", label: "PS4" },
  { value: "ps5", label: "PS5" },
  { value: "ps4_ps5", label: "PS4 & PS5" },
]

const ZARFIAT_OPTIONS = [
  { value: "", label: "همه" },
  { value: "z1", label: "ظرفیت ۱" },
  { value: "z2", label: "ظرفیت ۲" },
  { value: "z3", label: "ظرفیت ۳" },
]

function GamesError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/games/")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Math.max(1, Number(search.page) || 1),
    platform: String(search.platform || ""),
    zarfiat: String(search.zarfiat || ""),
    search: String(search.search || ""),
    sort: String(search.sort || "-created_at"),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.prefetchQuery(gamesQueryOptions(deps)),
  component: GamesPage,
  errorComponent: GamesError,
})

function FilterContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/games/" })

  function setFilter(key: "platform" | "zarfiat", value: string) {
    navigate({ search: (prev) => ({ ...prev, [key]: value, page: 1 }) })
  }

  const hasActiveFilters = search.platform || search.zarfiat

  return (
    <div className="space-y-1">
      {hasActiveFilters && (
        <div className="pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full gap-1 text-xs text-muted-foreground justify-start"
            onClick={() =>
              navigate({
                search: (prev) => ({ ...prev, platform: "", zarfiat: "", page: 1 }),
              })
            }
          >
            <X className="size-3" />
            حذف فیلترها
          </Button>
        </div>
      )}
      <Accordion defaultValue={["platform", "zarfiat"]} multiple>
        <AccordionItem value="platform">
          <AccordionTrigger>کنسول</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-1 pt-1">
              {PLATFORM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter("platform", opt.value)}
                  className={`w-full rounded-md px-2 py-1.5 text-right text-sm transition-all border-r-2 ${
                    search.platform === opt.value
                      ? "border-primary bg-primary/8 font-semibold text-primary"
                      : "border-transparent hover:bg-accent text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="zarfiat">
          <AccordionTrigger>ظرفیت</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-1 pt-1">
              {ZARFIAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter("zarfiat", opt.value)}
                  className={`w-full rounded-md px-2 py-1.5 text-right text-sm transition-all border-r-2 ${
                    search.zarfiat === opt.value
                      ? "border-primary bg-primary/8 font-semibold text-primary"
                      : "border-transparent hover:bg-accent text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

function FilterSidebar() {
  return (
    <aside className="w-56 shrink-0 rounded-xl border border-border/50 bg-background/60 backdrop-blur-md p-4 sticky top-24 h-fit">
      <p className="text-sm font-semibold pb-2">فیلترها</p>
      <Separator className="mb-1" />
      <FilterContent />
    </aside>
  )
}

function GamesPage() {
  const { reset } = useQueryErrorResetBoundary()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/games/" })
  const [searchInput, setSearchInput] = useState(search.search)

  useEffect(() => {
    setSearchInput(search.search)
  }, [search.search])

  useEffect(() => {
    if (searchInput === search.search) return
    const timer = setTimeout(() => {
      navigate({ search: (prev) => ({ ...prev, search: searchInput, page: 1 }) })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  return (
    <div className="relative min-h-screen bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md after:absolute after:bottom-0 after:inset-x-0 after:h-px after:bg-linear-to-r after:from-transparent after:via-primary/40 after:to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            <Sheet>
              <SheetTrigger
                render={<Button variant="outline" size="sm" className="shrink-0 lg:hidden" />}
              >
                <SlidersHorizontal className="size-4" />
                <span className="mr-1.5 hidden sm:inline">فیلترها</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 overflow-y-auto p-4">
                <SheetHeader>
                  <SheetTitle>فیلترها</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="جستجوی بازی..."
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 flex-1"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
            <span className="shrink-0 text-xs text-muted-foreground hidden sm:inline">مرتب‌سازی:</span>
            <ToggleGroup
              value={[search.sort]}
              onValueChange={(v) => {
                if (v[0]) navigate({ search: (prev) => ({ ...prev, sort: v[0], page: 1 }) })
              }}
              spacing={0}
              variant="outline"
              size="sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value} className="shrink-0 text-xs px-3">
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <div className="hidden lg:block">
            <FilterSidebar />
          </div>
          <div className="min-w-0 flex-1">
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <div className="py-20 text-center">
                  <p className="mb-4 text-sm text-muted-foreground">خطایی رخ داد</p>
                  <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
                    تلاش مجدد
                  </Button>
                </div>
              )}
            >
              <Suspense fallback={<GamesGridSkeleton />}>
                <GamesContent />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  )
}

function GamesContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/games/" })
  const { data } = useSuspenseQuery(gamesQueryOptions(search))
  const { games, exchange_rate, pagination } = data
  const { page, total, total_pages, limit } = pagination
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-base font-medium">هیچ بازی‌ای یافت نشد</p>
        <p className="mt-1 text-sm text-muted-foreground">
          فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        نمایش {from}–{to} از {total} بازی
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {games.map((game) => {
          const minPrice = cheapestPrice(game, exchange_rate)
          return (
            <Link key={game.id} to="/games/$id" params={{ id: game.id }} viewTransition>
              <div className="group rounded-xl border border-border/60 bg-card/75 backdrop-blur-sm overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer">
                <img
                  src={gameCoverSrc(game.cover_image, game.id)}
                  alt={game.name}
                  className="w-full aspect-3/4 object-cover"
                  loading="lazy"
                  style={{ viewTransitionName: `game-cover-${game.id}` }}
                />
                <div className="p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={`text-xs px-2 py-0.5 border ${PLATFORM_BADGE_CLASS[game.platform]}`}
                    >
                      {PLATFORM_LABEL[game.platform]}
                    </Badge>
                    {game.phase === "pre_order" && <PreOrderBadge />}
                  </div>
                  <p className="text-sm font-medium leading-snug line-clamp-2">{game.name}</p>
                  {minPrice !== null && (
                    <p className="text-sm font-semibold text-primary">
                      از {formatToman(minPrice)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {total_pages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}
          >
            قبلی
          </Button>

          {/* Full page numbers on sm+ */}
          <div className="hidden sm:flex items-center gap-1">
            {getPages(page, total_pages).map((p, i) =>
              p === "ellipsis" ? (
                <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">...</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className="min-w-9"
                  onClick={() => navigate({ search: (prev) => ({ ...prev, page: p }) })}
                >
                  {p}
                </Button>
              )
            )}
          </div>

          {/* Compact indicator on mobile */}
          <span className="sm:hidden px-3 text-sm text-muted-foreground tabular-nums">
            {page} / {total_pages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page === total_pages}
            onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
          >
            بعدی
          </Button>
        </div>
      )}
    </div>
  )
}

function GamesGridSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border">
            <Skeleton className="aspect-3/4 w-full rounded-none" />
            <div className="p-2.5 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-4 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "ellipsis")[] = [1]
  if (current > 3) pages.push("ellipsis")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("ellipsis")
  pages.push(total)
  return pages
}
