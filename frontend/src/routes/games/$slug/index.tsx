import {
  createFileRoute,
  ErrorComponent,
  useRouter,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ArrowRight, ExternalLink, ShoppingCart } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  gameQueryOptions,
  calcPrice,
  discountedPrice,
  formatToman,
  consoleLabel,
  capacityLabel,
  capacityDesc,
  gameFamilies,
  ConsoleDots,
  GameNotices,
  ClosingSoonNotice,
  PreOrderBadge,
  DiscountBadge,
  GameTags,
  gameCoverSrc,
} from "@/features/games"
import type { ExchangeRate, Game } from "@/features/games"
import { useCart } from "@/features/cart"

function GameError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/games/$slug/")({
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(gameQueryOptions(params.slug)),
  component: GameDetailPage,
  errorComponent: GameError,
})

function GameDetailPage() {
  const { reset } = useQueryErrorResetBoundary()
  const router = useRouter()

  function goBack() {
    if (window.history.length > 1) {
      router.history.back()
    } else {
      router.navigate({
        to: "/games",
        search: {
          page: 1,
          platform: "",
          zarfiat: "",
          search: "",
          sort: "-created_at",
        },
      })
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-grid-lines">
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 lg:px-8">
        <button
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:mb-10"
        >
          <ArrowRight className="size-4" />
          بازگشت به لیست
        </button>
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
          <Suspense fallback={<GameDetailSkeleton />}>
            <GameDetail />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

function GameDetail() {
  const { slug } = Route.useParams()
  const { data } = useSuspenseQuery(gameQueryOptions(slug))
  const { game, exchange_rate } = data

  const imgSrc = gameCoverSrc(game.cover_image)
  const families = gameFamilies(game.consoles, exchange_rate)
  // A subtle halo: tinted to the console's brand color when single-family, neutral
  // (theme primary) when the game spans both — the dots carry the cross-platform cue.
  const glow = families.length === 1 ? families[0].glow : "bg-primary"

  return (
    <div className="flex flex-col gap-10 sm:flex-row sm:gap-12">
      {/* Cover — the art is the hero; subtle brand halo + small console dots. */}
      <div className="relative w-44 shrink-0 self-center sm:sticky sm:top-24 sm:w-56 sm:self-start">
        <div
          className={`pointer-events-none absolute inset-4 rounded-2xl opacity-20 blur-2xl ${glow}`}
        />
        <img
          src={imgSrc}
          alt={game.name}
          className="relative aspect-3/4 w-full rounded-2xl object-cover shadow-2xl shadow-black/40"
          style={{ viewTransitionName: `game-cover-${game.id}` }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 rounded-b-2xl bg-gradient-to-t from-black/50 to-transparent" />
        <ConsoleDots
          consoles={game.consoles}
          rate={exchange_rate}
          className="absolute bottom-3 left-3 z-10"
        />
        {game.discount && (
          <DiscountBadge
            percent={game.discount}
            className="absolute top-3 left-3 z-10 shadow-sm"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 animate-in flex-col gap-6 duration-500 fade-in-0 slide-in-from-bottom-2">
        <div className="space-y-2.5">
          <h1 className="text-2xl leading-snug font-bold">{game.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {game.consoles.map((c) => {
              const fam = gameFamilies([c], exchange_rate)[0]
              return (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 text-xs"
                >
                  <span className={`size-2 rounded-full ${fam.glow}`} />
                  {consoleLabel(c, exchange_rate)}
                </span>
              )
            })}
            {game.phase === "pre_order" && <PreOrderBadge />}
          </div>
          <GameTags tags={game.tags} />
        </div>

        <GameNotices game={game} />

        <Separator />

        {game.phase === "closing_soon" ? (
          <ClosingSoonNotice game={game} />
        ) : game.prices.length > 0 ? (
          <BuyCard game={game} rate={exchange_rate} />
        ) : null}

        {game.links.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              لینک‌ها
            </p>
            <div className="flex flex-wrap gap-2">
              {game.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <ExternalLink className="size-3" />
                  {hostLabel(link.url)}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// A readable label for an external link: its hostname (without www.), or the raw
// URL if it can't be parsed.
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

// The purchase panel: pick a console, then a capacity (each explained), then one
// primary "add to cart" action — instead of a wall of per-tile buttons. Quantity is
// managed in the cart.
function BuyCard({ game, rate }: { game: Game; rate: ExchangeRate }) {
  const { items, addItem } = useCart()
  const isPreOrder = game.phase === "pre_order"

  // Capacities that actually have a (non-null) price for a given console.
  const pricedCaps = (con: string): string[] =>
    game.prices
      .filter(
        (p) =>
          p.platform === con && calcPrice(game, con, p.zarfiat, rate) !== null
      )
      .map((p) => p.zarfiat)

  const consoles = game.consoles.filter((c) => pricedCaps(c).length > 0)

  const [sel, setSel] = useState(() => {
    const con = consoles[0] ?? ""
    return { console: con, capacity: pricedCaps(con)[0] ?? "" }
  })

  if (consoles.length === 0) return null

  const caps = pricedCaps(sel.console)
  const inCart =
    items.find(
      (i) =>
        i.gameId === game.id &&
        i.platform === sel.console &&
        i.zarfiat === sel.capacity
    )?.quantity ?? 0

  const selectConsole = (con: string) =>
    setSel({ console: con, capacity: pricedCaps(con)[0] ?? "" })

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
      {/* Console picker — shown only when the game spans more than one console. */}
      {consoles.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            کنسول
          </p>
          <div className="flex flex-wrap gap-2">
            {consoles.map((con) => {
              const fam = gameFamilies([con], rate)[0]
              const active = con === sel.console
              return (
                <button
                  key={con}
                  type="button"
                  onClick={() => selectConsole(con)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all active:scale-[0.97] ${
                    active
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span className={`size-2 rounded-full ${fam.glow}`} />
                  {consoleLabel(con, rate)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Capacity options for the selected console — each explained + priced. */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          ظرفیت
        </p>
        <div className="space-y-2">
          {caps.map((cap) => {
            const p = calcPrice(game, sel.console, cap, rate)
            if (p == null) return null
            const f = discountedPrice(p, game) ?? p
            const disc = f < p
            const active = cap === sel.capacity
            return (
              <button
                key={cap}
                type="button"
                onClick={() => setSel((s) => ({ ...s, capacity: cap }))}
                className={`flex w-full items-start justify-between gap-3 rounded-xl border border-r-2 p-3 transition-all active:scale-[0.99] ${
                  active
                    ? "border-border/60 border-r-primary bg-primary/8"
                    : "border-border/60 border-r-transparent hover:bg-accent"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-0.5 text-start">
                  <p
                    className={`text-sm font-medium ${active ? "text-primary" : ""}`}
                  >
                    {capacityLabel(cap, rate)}
                  </p>
                  {capacityDesc(cap) && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {capacityDesc(cap)}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-end">
                  {disc && (
                    <p className="text-xs text-muted-foreground tabular-nums line-through">
                      {formatToman(p)}
                    </p>
                  )}
                  <p className="text-sm font-bold text-primary tabular-nums">
                    {formatToman(f)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* One primary action. */}
      <Button
        className="w-full gap-1.5 transition-transform active:scale-[0.98]"
        disabled={!sel.capacity || inCart >= 10}
        onClick={() =>
          addItem({
            gameId: game.id,
            gameName: game.name,
            coverImage: game.cover_image,
            platform: sel.console,
            zarfiat: sel.capacity,
          })
        }
      >
        <ShoppingCart className="size-4" />
        {inCart > 0
          ? `در سبد (${inCart.toLocaleString("fa-IR")}) — افزودن بیشتر`
          : isPreOrder
            ? "پیش‌خرید"
            : "افزودن به سبد"}
      </Button>
    </div>
  )
}

function GameDetailSkeleton() {
  return (
    <div className="flex flex-col gap-10 sm:flex-row sm:gap-12">
      <Skeleton className="aspect-3/4 w-44 self-center rounded-2xl sm:w-56 sm:self-auto" />
      <div className="flex flex-1 flex-col gap-5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
