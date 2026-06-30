import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Plus, Search, Pencil, Gamepad2, Coins } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DashboardHeader } from "@/components/dashboard-shell"
import { Pagination } from "@/components/pagination"
import {
  adminGamesQueryOptions,
  gameCoverSrc,
  consoleLabel,
  platformBadgeClass,
  PreOrderBadge,
  DiscountBadge,
} from "@/features/games"
import type { Game } from "@/features/games"
import {
  ActiveToggle,
  AlertPopover,
  DeleteGameButton,
  DiscountPopover,
  FeaturedToggle,
  PreorderPopover,
  ReturnFeePopover,
} from "@/features/games/admin-quick-actions"

const PAGE_SIZE = 10

type StatusFilter = "all" | "published" | "draft" | "pre_order"
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "published", label: "منتشر شده" },
  { value: "draft", label: "پیش‌نویس" },
  { value: "pre_order", label: "پیش‌خرید" },
]
function AdminGamesError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/games/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(adminGamesQueryOptions())
  },
  component: AdminGamesPage,
  errorComponent: AdminGamesError,
})

function AdminGamesPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <>
      <DashboardHeader
        title="مدیریت بازی‌ها"
        action={
          <div className="flex items-center gap-2">
            <Link to="/admin/games/pricing">
              <Button variant="outline" className="gap-1.5">
                <Coins className="size-4" />
                <span className="hidden sm:inline">قیمت‌گذاری</span>
              </Button>
            </Link>
            <Link to="/admin/games/new">
              <Button className="gap-1.5">
                <Plus className="size-4" />
                بازی جدید
              </Button>
            </Link>
          </div>
        }
      />

      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری بازی‌ها
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<ListSkeleton />}>
          <AdminGamesContent />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function AdminGamesContent() {
  const { data } = useSuspenseQuery(adminGamesQueryOptions())
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState<string>("all")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)

  // Any filter change resets to the first page.
  const onSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }
  const onPlatform = (v: string) => {
    setPlatform(v)
    setPage(1)
  }
  const onStatus = (v: StatusFilter) => {
    setStatus(v)
    setPage(1)
  }

  // Console filter options come from the live catalog ("all" + each console).
  const consoleFilters = [
    { value: "all", label: "همه" },
    ...(data.exchange_rate?.consoles ?? []).map((c) => ({
      value: c.code,
      label: c.label_fa,
    })),
  ]

  const q = search.trim().toLowerCase()
  const filtered = data.games.filter((g) => {
    if (q && !g.name.toLowerCase().includes(q)) return false
    if (platform !== "all" && !g.consoles.includes(platform)) return false
    if (status === "published" && !g.active) return false
    if (status === "draft" && g.active) return false
    if (status === "pre_order" && g.release_status !== "pre_order") return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const pageGames = filtered.slice(
    (current - 1) * PAGE_SIZE,
    current * PAGE_SIZE
  )

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="جستجوی بازی..."
            className="pr-9"
          />
        </div>
        <div className="flex scrollbar-none items-center gap-3 overflow-x-auto pb-1">
          <ToggleGroup
            value={[platform]}
            onValueChange={(v) => v[0] && onPlatform(v[0])}
            variant="outline"
            size="sm"
            spacing={0}
          >
            {consoleFilters.map((f) => (
              <ToggleGroupItem
                key={f.value}
                value={f.value}
                className="shrink-0 px-3 text-xs"
              >
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            value={[status]}
            onValueChange={(v) => v[0] && onStatus(v[0] as StatusFilter)}
            variant="outline"
            size="sm"
            spacing={0}
          >
            {STATUS_FILTERS.map((f) => (
              <ToggleGroupItem
                key={f.value}
                value={f.value}
                className="shrink-0 px-3 text-xs"
              >
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/75">
            <Gamepad2 className="size-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">
            {data.games.length === 0
              ? "هنوز بازی‌ای ثبت نشده است"
              : "بازی‌ای با این فیلترها پیدا نشد"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {filtered.length.toLocaleString("fa-IR")} بازی
          </p>
          {pageGames.map((game) => (
            <GameRow key={game.id} game={game} />
          ))}
          <Pagination page={current} totalPages={totalPages} onPage={setPage} />
        </div>
      )}
    </div>
  )
}

function GameRow({ game }: { game: Game }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/75 p-3 backdrop-blur-sm">
      <img
        src={gameCoverSrc(game.cover_image, game.id)}
        alt={game.name}
        className="h-14 w-10 shrink-0 rounded-md object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{game.name}</span>
          {!game.active && (
            <Badge
              variant="secondary"
              className="border border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
            >
              پیش‌نویس
            </Badge>
          )}
          {game.phase === "pre_order" && <PreOrderBadge />}
          {game.discount && <DiscountBadge percent={game.discount} />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {game.consoles.map((c) => (
            <Badge
              key={c}
              variant="secondary"
              className={`border text-[10px] ${platformBadgeClass(c)}`}
            >
              {consoleLabel(c)}
            </Badge>
          ))}
          <span>
            {game.price_mode === "dynamic" ? "قیمت دلاری" : "قیمت تومانی"}
          </span>
          <span>·</span>
          <span className="tabular-nums">
            {game.prices.length.toLocaleString("fa-IR")} قیمت
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <ActiveToggle game={game} />
        <FeaturedToggle game={game} />
        <PreorderPopover game={game} />
        <AlertPopover game={game} />
        <DiscountPopover game={game} />
        <ReturnFeePopover game={game} />
        <Link to="/admin/games/$id/edit" params={{ id: game.id }}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="ویرایش"
          >
            <Pencil className="size-4" />
          </Button>
        </Link>
        <DeleteGameButton game={game} />
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
