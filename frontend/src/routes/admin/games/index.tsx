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
import { Label } from "@/components/ui/label"
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
import type { ExchangeRate, Game, Platform } from "@/features/games"
import { setPricingConfig } from "@/features/games/api"
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
      <PricingPanel config={data.exchange_rate} />

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

function PctField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        dir="ltr"
        inputMode="numeric"
        className="h-9 w-20"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
    </div>
  )
}

function PricingPanel({ config }: { config: ExchangeRate }) {
  const queryClient = useQueryClient()
  const [rate, setRate] = useState(
    config?.usd_to_toman != null ? String(config.usd_to_toman) : ""
  )
  const [z1, setZ1] = useState(String(config?.z1_pct ?? 15))
  const [z2, setZ2] = useState(String(config?.z2_pct ?? 60))
  const [z3, setZ3] = useState(String(config?.z3_pct ?? 25))
  const [margin, setMargin] = useState(String(config?.default_margin_pct ?? 10))

  const splitSum = Number(z1 || 0) + Number(z2 || 0) + Number(z3 || 0)
  const valid = Number(rate) > 0 && splitSum === 100 && margin !== ""

  const m = useMutation({
    mutationFn: () =>
      setPricingConfig({
        usd_to_toman: Number(rate),
        z1_pct: Number(z1),
        z2_pct: Number(z2),
        z3_pct: Number(z3),
        default_margin_pct: Number(margin),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "games"] })
      queryClient.invalidateQueries({ queryKey: ["games"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "pricing"] })
      toast.success("تنظیمات قیمت‌گذاری ذخیره شد")
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "خطا در ذخیره"),
  })

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm">
      <div>
        <p className="text-sm font-medium">تنظیمات قیمت‌گذاری</p>
        <p className="text-xs text-muted-foreground">
          نرخ ارز، درصد سود پیش‌فرض، و سهم هر ظرفیت از قیمت کل (مجموع باید ۱۰۰
          باشد)
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            نرخ ارز (دلار → تومان)
          </Label>
          <MoneyInput
            value={rate}
            onChange={setRate}
            className="h-9 w-36"
            placeholder="95,000"
          />
        </div>
        <PctField label="سود پیش‌فرض (٪)" value={margin} onChange={setMargin} />
        <PctField label="ظرفیت ۱ (٪)" value={z1} onChange={setZ1} />
        <PctField label="ظرفیت ۲ (٪)" value={z2} onChange={setZ2} />
        <PctField label="ظرفیت ۳ (٪)" value={z3} onChange={setZ3} />
        <Button
          size="sm"
          disabled={!valid || m.isPending}
          onClick={() => m.mutate()}
        >
          ذخیره
        </Button>
      </div>
      {splitSum !== 100 && (
        <p className="text-xs text-destructive">
          مجموع درصد ظرفیت‌ها باید ۱۰۰ باشد (اکنون{" "}
          {splitSum.toLocaleString("fa-IR")})
        </p>
      )}
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
