import {
  createFileRoute,
  ErrorComponent,
  Link,
  redirect,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Plus, Search, Pencil, Gamepad2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { AdminShell } from "@/components/admin-shell"
import { MoneyInput } from "@/components/money-input"
import { Pagination } from "@/components/pagination"
import { getMeFn } from "@/features/auth"
import {
  adminGamesQueryOptions,
  gameCoverSrc,
  PLATFORM_LABEL,
  PLATFORM_BADGE_CLASS,
  PreOrderBadge,
} from "@/features/games"
import type { Game, Platform } from "@/features/games"
import { setExchangeRate } from "@/features/games/api"
import {
  ActiveToggle,
  AlertPopover,
  DeleteGameButton,
  PreorderPopover,
} from "@/features/games/admin-quick-actions"

const PAGE_SIZE = 10

type StatusFilter = "all" | "published" | "draft" | "pre_order"
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "published", label: "منتشر شده" },
  { value: "draft", label: "پیش‌نویس" },
  { value: "pre_order", label: "پیش‌خرید" },
]
const PLATFORM_FILTERS: { value: "all" | Platform; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "ps4", label: "PS4" },
  { value: "ps5", label: "PS5" },
  { value: "ps4_ps5", label: "هردو" },
]

function AdminGamesError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/games/")({
  beforeLoad: async () => {
    const me = await getMeFn()
    if (!me)
      throw redirect({ to: "/auth", search: { redirect: "/admin/games" } })
    if (me.role === "user") throw redirect({ to: "/" })
  },
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(adminGamesQueryOptions())
  },
  component: AdminGamesPage,
  errorComponent: AdminGamesError,
})

function AdminGamesPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <AdminShell
      title="مدیریت بازی‌ها"
      action={
        <Link to="/admin/games/new">
          <Button className="gap-1.5">
            <Plus className="size-4" />
            بازی جدید
          </Button>
        </Link>
      }
    >
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
    </AdminShell>
  )
}

function AdminGamesContent() {
  const { data } = useSuspenseQuery(adminGamesQueryOptions())
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState<"all" | Platform>("all")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)

  // Any filter change resets to the first page.
  const onSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }
  const onPlatform = (v: "all" | Platform) => {
    setPlatform(v)
    setPage(1)
  }
  const onStatus = (v: StatusFilter) => {
    setStatus(v)
    setPage(1)
  }

  const q = search.trim().toLowerCase()
  const filtered = data.games.filter((g) => {
    if (q && !g.name.toLowerCase().includes(q)) return false
    if (platform !== "all" && g.platform !== platform) return false
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
      <ExchangeRatePanel rate={data.exchange_rate?.usd_to_toman ?? null} />

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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ToggleGroup
            value={[platform]}
            onValueChange={(v) => v[0] && onPlatform(v[0] as "all" | Platform)}
            variant="outline"
            size="sm"
            spacing={0}
          >
            {PLATFORM_FILTERS.map((f) => (
              <ToggleGroupItem
                key={f.value}
                value={f.value}
                className="px-3 text-xs"
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
                className="px-3 text-xs"
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
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Badge
            variant="secondary"
            className={`border text-[10px] ${PLATFORM_BADGE_CLASS[game.platform]}`}
          >
            {PLATFORM_LABEL[game.platform]}
          </Badge>
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
        <PreorderPopover game={game} />
        <AlertPopover game={game} />
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

function ExchangeRatePanel({ rate }: { rate: number | null }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(rate?.toString() ?? "")

  const m = useMutation({
    mutationFn: () => setExchangeRate(Number(value)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "games"] })
      queryClient.invalidateQueries({ queryKey: ["games"] })
      toast.success("نرخ ارز به‌روزرسانی شد")
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "خطا در ذخیره نرخ ارز"),
  })

  const valid = Number(value) > 0

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium">نرخ ارز (دلار → تومان)</p>
        <p className="text-xs text-muted-foreground">
          قیمت بازی‌های داینامیک بر این اساس محاسبه می‌شود
        </p>
      </div>
      <div className="ms-auto flex items-center gap-2">
        <MoneyInput
          value={value}
          onChange={setValue}
          className="h-9 w-36"
          placeholder="95,000"
        />
        <Button
          size="sm"
          disabled={!valid || m.isPending}
          onClick={() => m.mutate()}
        >
          ذخیره
        </Button>
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
