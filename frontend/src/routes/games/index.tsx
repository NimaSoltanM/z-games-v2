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
import { Suspense, useState, useEffect, Fragment } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Check, ChevronDown, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BackgroundGradient } from "@/components/ui/background-gradient"

import {
  gamesQueryOptions,
  cheapestPrice,
  discountedPrice,
  formatToman,
  familyDotClass,
  ConsoleDots,
  PreOrderBadge,
  DiscountBadge,
  GameTags,
  gameCoverSrc,
  consoleFilterGroups,
  capacityFilterGroups,
  normalizeCatalogFilters,
} from "@/features/games"
import type { CatalogFilterGroup, Game, ExchangeRate } from "@/features/games"
import { catalogJsonLd, jsonLdScript, seoHead } from "@/features/seo"

// Params for the "منتخب" rail — a stable object so its query key never churns.
const FEATURED_PARAMS = { featured: true } as const

const SORT_OPTIONS = [
  { value: "-created_at", label: "جدیدترین" },
  { value: "created_at", label: "قدیمی‌ترین" },
  { value: "name", label: "نام (A-Z)" },
  { value: "-name", label: "نام (Z-A)" },
] as const

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
  loader: async ({ context, deps }) => {
    const catalogOptions = gamesQueryOptions(deps)
    await Promise.all([
      context.queryClient.prefetchQuery(catalogOptions),
      context.queryClient.prefetchQuery(gamesQueryOptions(FEATURED_PARAMS)),
    ])
    return context.queryClient.ensureQueryData(catalogOptions)
  },
  head: ({ match, loaderData }) => {
    const search = match.search
    const faceted = Boolean(
      search.platform ||
      search.zarfiat ||
      search.search ||
      search.sort !== "-created_at"
    )
    const pagePath = search.page > 1 ? `/games?page=${search.page}` : "/games"
    const head = seoHead({
      title:
        search.page > 1 && !faceted
          ? `خرید اکانت بازی؛ صفحه ${search.page.toLocaleString("fa-IR")} | زد گیمز`
          : "خرید اکانت بازی PS4، PS5 و Xbox | زد گیمز",
      description:
        "خرید اکانت قانونی بازی برای PS4، PS5، Xbox One و Xbox Series؛ مقایسه ظرفیت‌ها، مشاهده قیمت روز و بازی‌های قابل بازخرید.",
      path: pagePath,
      noIndex: faceted,
      keepCanonicalSearch: search.page > 1 && !faceted,
    })
    return {
      ...head,
      scripts:
        !faceted && search.page === 1 && loaderData
          ? [jsonLdScript(catalogJsonLd(loaderData.games))]
          : [],
    }
  },
  component: GamesPage,
  errorComponent: GamesError,
})

// A compact toolbar filter dropdown. Options carry a small console-family dot
// (blue = PlayStation, green = Xbox) instead of a loud colored section header, so
// a capacity like "Home" still reads as Xbox without shouting.
function FilterMenu({
  label,
  groups,
  value,
  onSelect,
}: {
  label: string
  groups: CatalogFilterGroup[]
  value: string
  onSelect: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = groups
    .flatMap((g) => g.options)
    .find((o) => o.value === value)

  const choose = (v: string) => {
    onSelect(v)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={`shrink-0 gap-1.5 ${selected ? "border-primary/60 text-primary" : ""}`}
          />
        }
      >
        {label}
        {selected && <span className="font-semibold">: {selected.label}</span>}
        <ChevronDown className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 gap-0.5 p-1">
        <FilterOption selected={value === ""} onClick={() => choose("")}>
          همه
        </FilterOption>
        {groups.map((g, gi) => (
          <Fragment key={g.family}>
            {gi > 0 && <Separator className="my-1" />}
            {g.options.map((o) => (
              <FilterOption
                key={o.value}
                selected={value === o.value}
                onClick={() => choose(o.value)}
              >
                <span
                  className={`size-2 rounded-full ${familyDotClass(g.family)}`}
                />
                {o.label}
              </FilterOption>
            ))}
          </Fragment>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function FilterOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        selected
          ? "bg-primary/10 font-medium text-primary"
          : "text-foreground hover:bg-accent"
      }`}
    >
      {children}
      {selected && <Check className="ms-auto size-3.5" />}
    </button>
  )
}

function GamesPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <div className="relative min-h-screen bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute right-1/3 -bottom-32 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="relative z-10 py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">خطایی رخ داد</p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<GamesToolbarSkeleton />}>
          <GamesToolbar />
        </Suspense>

        <header className="relative z-10 mx-auto max-w-7xl px-4 pt-7 sm:px-6 lg:px-8">
          <h1 className="text-2xl leading-snug font-bold sm:text-3xl">
            خرید اکانت قانونی بازی‌های PlayStation و Xbox
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            بازی مورد نظرت را برای PS4، PS5، Xbox One یا Xbox Series پیدا کن،
            ظرفیت مناسب را مقایسه کن و قیمت روز هر گزینه را پیش از خرید ببین.
          </p>
          <nav
            aria-label="فهرست بازی بر اساس پلتفرم"
            className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
          >
            {[
              ["ps4", "بازی‌های PS4"],
              ["ps5", "بازی‌های PS5"],
              ["xbox_one", "بازی‌های Xbox One"],
              ["xbox_series", "بازی‌های Xbox Series X|S"],
            ].map(([platform, label]) => (
              <Link
                key={platform}
                to="/games/platform/$platform"
                params={{ platform }}
                search={{ page: 1 }}
                className="font-medium text-primary hover:underline"
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="mx-auto max-w-7xl px-4 pt-5 pb-6 sm:px-6 lg:px-8">
          <Suspense fallback={<GamesGridSkeleton />}>
            <GamesContent />
          </Suspense>
        </div>
      </ErrorBoundary>
    </div>
  )
}

function GamesToolbar() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/games/" })
  const { data } = useSuspenseQuery(gamesQueryOptions(search))
  const rate = data.exchange_rate
  const [searchInput, setSearchInput] = useState(search.search)
  const platformGroups = consoleFilterGroups(rate)
  const capacityGroups = capacityFilterGroups(rate, search.platform)

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
  }, [navigate, search.search, searchInput])

  // Repair stale/bookmarked URLs after the catalog loads. The backend also
  // treats impossible pairs as no match; this keeps the visible controls and URL
  // honest instead of leaving a hidden Xbox capacity selected under PlayStation.
  useEffect(() => {
    const normalized = normalizeCatalogFilters(
      rate,
      search.platform,
      search.zarfiat
    )
    if (
      normalized.platform === search.platform &&
      normalized.capacity === search.zarfiat
    ) {
      return
    }
    navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        platform: normalized.platform,
        zarfiat: normalized.capacity,
        page: 1,
      }),
    })
  }, [navigate, rate, search.platform, search.zarfiat])

  const setPlatform = (platform: string) => {
    const normalized = normalizeCatalogFilters(rate, platform, search.zarfiat)
    navigate({
      search: (prev) => ({
        ...prev,
        platform: normalized.platform,
        zarfiat: normalized.capacity,
        page: 1,
      }),
    })
  }
  const setCapacity = (zarfiat: string) =>
    navigate({ search: (prev) => ({ ...prev, zarfiat, page: 1 }) })
  const clearFilters = () =>
    navigate({
      search: (prev) => ({ ...prev, platform: "", zarfiat: "", page: 1 }),
    })
  const hasFilters = !!(search.platform || search.zarfiat)

  return (
    <div className="sticky top-14 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-linear-to-r after:from-transparent after:via-primary/40 after:to-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="جستجوی بازی..."
            className="h-9"
          />
        </div>
        <div className="flex scrollbar-none items-center gap-2 overflow-x-auto pb-3">
          <FilterMenu
            label="کنسول"
            groups={platformGroups}
            value={search.platform}
            onSelect={setPlatform}
          />
          <FilterMenu
            label="ظرفیت"
            groups={capacityGroups}
            value={search.zarfiat}
            onSelect={setCapacity}
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="size-3.5" />
              حذف
            </Button>
          )}

          <span className="mx-1 hidden h-5 w-px shrink-0 bg-border sm:block" />

          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            مرتب‌سازی:
          </span>
          <ToggleGroup
            value={[search.sort]}
            onValueChange={(value) => {
              if (value[0])
                navigate({
                  search: (prev) => ({ ...prev, sort: value[0], page: 1 }),
                })
            }}
            spacing={0}
            variant="outline"
            size="sm"
          >
            {SORT_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="shrink-0 px-3 text-xs"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </div>
  )
}

function GamesToolbarSkeleton() {
  return (
    <div className="sticky top-14 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  )
}

function GamesContent() {
  const search = Route.useSearch()
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
          {page === 1 ? (
            <Button variant="outline" size="sm" disabled>
              قبلی
            </Button>
          ) : (
            <Button
              render={
                <Link to="/games" search={{ ...search, page: page - 1 }} />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              قبلی
            </Button>
          )}

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
                  render={
                    p === page ? undefined : (
                      <Link to="/games" search={{ ...search, page: p }} />
                    )
                  }
                  nativeButton={p === page}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className="min-w-9"
                  aria-current={p === page ? "page" : undefined}
                >
                  {p.toLocaleString("fa-IR")}
                </Button>
              )
            )}
          </div>

          {/* Compact indicator on mobile */}
          <span className="px-3 text-sm text-muted-foreground tabular-nums sm:hidden">
            {page} / {total_pages}
          </span>

          {page === total_pages ? (
            <Button variant="outline" size="sm" disabled>
              بعدی
            </Button>
          ) : (
            <Button
              render={
                <Link to="/games" search={{ ...search, page: page + 1 }} />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              بعدی
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// A single game card for the main grid. Cover-forward: the art is the hero, with
// console family shown as small accent dots and one discount flag; the text block is
// just the title + the cheapest "از" price.
function GameCard({ game, rate }: { game: Game; rate: ExchangeRate }) {
  const minPrice = cheapestPrice(game, rate)
  const finalMin = discountedPrice(minPrice, game)
  const hasDiscount =
    minPrice !== null && finalMin !== null && finalMin < minPrice

  return (
    <Link to="/games/$slug" params={{ slug: game.slug }} viewTransition>
      <div className="group h-full cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-card/75 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
        <div className="relative overflow-hidden">
          <img
            src={gameCoverSrc(game.cover_image)}
            alt={`کاور بازی ${game.name}`}
            width={600}
            height={800}
            className="aspect-3/4 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            style={{ viewTransitionName: `game-cover-${game.id}` }}
          />
          {/* Bottom scrim so the console dots stay legible over any art. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent" />
          <ConsoleDots
            consoles={game.consoles}
            rate={rate}
            className="absolute bottom-2 left-2"
          />
          {game.discount && (
            <DiscountBadge
              percent={game.discount}
              className="absolute top-2 left-2 shadow-sm"
            />
          )}
          {game.phase === "pre_order" && (
            <PreOrderBadge className="absolute top-2 right-2 shadow-sm" />
          )}
        </div>
        <div className="space-y-1 p-3">
          <p className="line-clamp-2 text-sm leading-snug font-medium">
            {game.name}
          </p>
          {minPrice !== null && (
            <p className="text-sm font-semibold text-primary tabular-nums">
              از {formatToman(hasDiscount ? finalMin : minPrice)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

// A wide, landscape "featured" card: a large cover beside the title, badges, tags,
// and price. Deliberately bigger and a different shape than the portrait grid cards
// so the gradient-framed featured items read as a standout, not just taller tiles.
function FeaturedCard({
  game,
  rate,
  priority = false,
}: {
  game: Game
  rate: ExchangeRate
  priority?: boolean
}) {
  const minPrice = cheapestPrice(game, rate)
  const finalMin = discountedPrice(minPrice, game)
  const hasDiscount =
    minPrice !== null && finalMin !== null && finalMin < minPrice

  return (
    <Link to="/games/$slug" params={{ slug: game.slug }} viewTransition>
      <div className="group flex h-full cursor-pointer gap-4">
        <div className="relative h-full shrink-0 overflow-hidden rounded-lg">
          {/* No viewTransitionName here on purpose: a featured game also appears in
              the grid below, and a duplicate name aborts the cover morph. The grid
              card owns the shared-element transition. */}
          <img
            src={gameCoverSrc(game.cover_image)}
            alt={`کاور بازی ${game.name}`}
            width={600}
            height={800}
            className="h-full min-h-44 w-28 object-cover transition-transform duration-300 group-hover:scale-[1.04] sm:w-32"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/55 to-transparent" />
          <ConsoleDots
            consoles={game.consoles}
            rate={rate}
            className="absolute bottom-2 left-2"
          />
          {game.discount && (
            <DiscountBadge
              percent={game.discount}
              className="absolute top-2 left-2 shadow-sm"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-4 pl-4">
          {game.phase === "pre_order" && (
            <div>
              <PreOrderBadge />
            </div>
          )}
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
        {featured.map((game, index) => (
          <BackgroundGradient
            key={game.id}
            containerClassName="w-[20rem] shrink-0 sm:w-[24rem]"
            className="overflow-hidden rounded-[20px] bg-card"
          >
            <FeaturedCard game={game} rate={rate} priority={index === 0} />
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
