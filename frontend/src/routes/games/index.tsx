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
} from "@tanstack/react-query"
import { Suspense, useState, useEffect } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { SlidersHorizontal, Sparkles, X } from "lucide-react"

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
import { BackgroundGradient } from "@/components/ui/background-gradient"

import {
  gamesQueryOptions,
  cheapestPrice,
  discountedPrice,
  formatToman,
  PLATFORM_LABEL,
  PLATFORM_BADGE_CLASS,
  PreOrderBadge,
  DiscountBadge,
  GameTags,
  gameCoverSrc,
} from "@/features/games"
import type { Game, ExchangeRate } from "@/features/games"

// Params for the "منتخب" rail — a stable object so its query key never churns.
const FEATURED_PARAMS = { featured: true } as const

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
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(gamesQueryOptions(deps))
    context.queryClient.prefetchQuery(gamesQueryOptions(FEATURED_PARAMS))
  },
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
            className="h-7 w-full justify-start gap-1 text-xs text-muted-foreground"
            onClick={() =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  platform: "",
                  zarfiat: "",
                  page: 1,
                }),
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
                  className={`w-full rounded-md border-r-2 px-2 py-1.5 text-right text-sm transition-all ${
                    search.platform === opt.value
                      ? "border-primary bg-primary/8 font-semibold text-primary"
                      : "border-transparent text-foreground hover:bg-accent"
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
                  className={`w-full rounded-md border-r-2 px-2 py-1.5 text-right text-sm transition-all ${
                    search.zarfiat === opt.value
                      ? "border-primary bg-primary/8 font-semibold text-primary"
                      : "border-transparent text-foreground hover:bg-accent"
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
    <aside className="sticky top-24 h-fit w-56 shrink-0 rounded-xl border border-border/50 bg-background/60 p-4 backdrop-blur-md">
      <p className="pb-2 text-sm font-semibold">فیلترها</p>
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
      navigate({
        search: (prev) => ({ ...prev, search: searchInput, page: 1 }),
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  return (
    <div className="relative min-h-screen bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute right-1/3 -bottom-32 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-linear-to-r after:from-transparent after:via-primary/40 after:to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 lg:hidden"
                  />
                }
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
              className="h-9 w-full flex-1 rounded-lg border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50 focus:outline-none"
            />
          </div>
          <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-3">
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
              مرتب‌سازی:
            </span>
            <ToggleGroup
              value={[search.sort]}
              onValueChange={(v) => {
                if (v[0])
                  navigate({
                    search: (prev) => ({ ...prev, sort: v[0], page: 1 }),
                  })
              }}
              spacing={0}
              variant="outline"
              size="sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={opt.value}
                  className="shrink-0 px-3 text-xs"
                >
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          <div className="hidden lg:block">
            <FilterSidebar />
          </div>
          <div className="min-w-0 flex-1">
            <ErrorBoundary
              onReset={reset}
              fallbackRender={({ resetErrorBoundary }) => (
                <div className="py-20 text-center">
                  <p className="mb-4 text-sm text-muted-foreground">
                    خطایی رخ داد
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetErrorBoundary}
                  >
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

  const showRail =
    !search.platform && !search.zarfiat && !search.search && page === 1

  return (
    <div className="space-y-6">
      {showRail && <FeaturedRail rate={exchange_rate} />}

      <p className="text-xs text-muted-foreground">
        نمایش {from}–{to} از {total} بازی
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} rate={exchange_rate} />
        ))}
      </div>

      {total_pages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() =>
              navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })
            }
          >
            قبلی
          </Button>

          {/* Full page numbers on sm+ */}
          <div className="hidden items-center gap-1 sm:flex">
            {getPages(page, total_pages).map((p, i) =>
              p === "ellipsis" ? (
                <span
                  key={`e-${i}`}
                  className="px-1 text-sm text-muted-foreground"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className="min-w-9"
                  onClick={() =>
                    navigate({ search: (prev) => ({ ...prev, page: p }) })
                  }
                >
                  {p}
                </Button>
              )
            )}
          </div>

          {/* Compact indicator on mobile */}
          <span className="px-3 text-sm text-muted-foreground tabular-nums sm:hidden">
            {page} / {total_pages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page === total_pages}
            onClick={() =>
              navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })
            }
          >
            بعدی
          </Button>
        </div>
      )}
    </div>
  )
}

// A single game card for the main grid. Shows the platform/pre-order/discount
// badges, tags, and a discounted "از" price.
function GameCard({ game, rate }: { game: Game; rate: ExchangeRate }) {
  const minPrice = cheapestPrice(game, rate)
  const finalMin = discountedPrice(minPrice, game)
  const hasDiscount =
    minPrice !== null && finalMin !== null && finalMin < minPrice

  return (
    <Link to="/games/$slug" params={{ slug: game.slug }} viewTransition>
      <div className="group h-full cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-card/75 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
        <img
          src={gameCoverSrc(game.cover_image, game.id)}
          alt={game.name}
          className="aspect-3/4 w-full object-cover"
          loading="lazy"
          style={{ viewTransitionName: `game-cover-${game.id}` }}
        />
        <div className="space-y-2 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className={`border px-2 py-0.5 text-xs ${PLATFORM_BADGE_CLASS[game.platform]}`}
            >
              {PLATFORM_LABEL[game.platform]}
            </Badge>
            {game.phase === "pre_order" && <PreOrderBadge />}
            {game.discount && <DiscountBadge percent={game.discount} />}
          </div>
          <p className="line-clamp-2 text-sm leading-snug font-medium">
            {game.name}
          </p>
          <GameTags tags={game.tags.slice(0, 2)} />
          {minPrice !== null && (
            <div className="space-y-0.5">
              {hasDiscount && (
                <p className="text-xs text-muted-foreground tabular-nums line-through">
                  {formatToman(minPrice)}
                </p>
              )}
              <p className="text-sm font-semibold text-primary tabular-nums">
                از {formatToman(hasDiscount ? finalMin : minPrice)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// A wide, landscape "featured" card: a large cover beside the title, badges, tags,
// and price. Deliberately bigger and a different shape than the portrait grid cards
// so the gradient-framed featured items read as a standout, not just taller tiles.
function FeaturedCard({ game, rate }: { game: Game; rate: ExchangeRate }) {
  const minPrice = cheapestPrice(game, rate)
  const finalMin = discountedPrice(minPrice, game)
  const hasDiscount =
    minPrice !== null && finalMin !== null && finalMin < minPrice

  return (
    <Link to="/games/$slug" params={{ slug: game.slug }} viewTransition>
      <div className="group flex h-full cursor-pointer gap-4">
        <img
          src={gameCoverSrc(game.cover_image, game.id)}
          alt={game.name}
          className="h-full min-h-44 w-28 shrink-0 object-cover sm:w-32"
          loading="lazy"
          style={{ viewTransitionName: `game-cover-${game.id}` }}
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 py-4 pl-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className={`border px-2 py-0.5 text-xs ${PLATFORM_BADGE_CLASS[game.platform]}`}
            >
              {PLATFORM_LABEL[game.platform]}
            </Badge>
            {game.phase === "pre_order" && <PreOrderBadge />}
            {game.discount && <DiscountBadge percent={game.discount} />}
          </div>
          <p className="line-clamp-2 text-base leading-snug font-semibold">
            {game.name}
          </p>
          <GameTags tags={game.tags.slice(0, 3)} />
          {minPrice !== null && (
            <div className="flex items-baseline gap-2">
              {hasDiscount && (
                <span className="text-xs text-muted-foreground tabular-nums line-through">
                  {formatToman(minPrice)}
                </span>
              )}
              <span className="text-base font-bold text-primary tabular-nums">
                از {formatToman(hasDiscount ? finalMin : minPrice)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// The "منتخب" rail: a horizontal strip of featured games above the grid, shown only
// on the unfiltered first page. Renders nothing when no games are featured.
function FeaturedRail({ rate }: { rate: ExchangeRate }) {
  const { data } = useSuspenseQuery(gamesQueryOptions(FEATURED_PARAMS))
  const featured = data.games
  if (featured.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">منتخب</h2>
      </div>
      {/* The scroll container clips on both axes, so it needs enough padding to fit
          the gradient's blurred glow — otherwise the soft round glow gets sliced
          into a hard rectangle. py-8 clears the blur-xl radius; the negative margins
          reclaim that padding so spacing stays normal and cards align with the title
          (full-bleed) instead of being indented. */}
      <div className="-mx-4 -my-3 flex scrollbar-none gap-6 overflow-x-auto px-4 py-8">
        {featured.map((game) => (
          <BackgroundGradient
            key={game.id}
            containerClassName="w-[20rem] shrink-0 sm:w-[24rem]"
            className="overflow-hidden rounded-[20px] bg-card"
          >
            <FeaturedCard game={game} rate={rate} />
          </BackgroundGradient>
        ))}
      </div>
    </div>
  )
}

function GamesGridSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border"
          >
            <Skeleton className="aspect-3/4 w-full rounded-none" />
            <div className="space-y-2 p-2.5">
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
