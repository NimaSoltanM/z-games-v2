import { createFileRoute, ErrorComponent, useRouter } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ArrowRight, ExternalLink, ShoppingCart } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  gameQueryOptions,
  calcPrice,
  formatToman,
  PLATFORM_LABEL,
  PLATFORM_BADGE_CLASS,
  PLATFORM_GLOW_CLASS,
  ZARFIATS,
  ZARFIAT_LABEL
  
  
  
} from "@/features/games"
import type {ConsolePlatform, Zarfiat, Game} from "@/features/games";
import { useCart } from "@/features/cart"

function GameError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/games/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(gameQueryOptions(params.id)),
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
        search: { page: 1, platform: "", zarfiat: "", search: "", sort: "-created_at" },
      })
    }
  }

  return (
    <div className="relative min-h-screen bg-background bg-grid-lines overflow-hidden">
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 lg:px-8">
        <button
          onClick={goBack}
          className="mb-6 sm:mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(gameQueryOptions(id))
  const { game, exchange_rate } = data
  const platforms: ConsolePlatform[] =
    game.platform === "ps4_ps5" ? ["ps4", "ps5"] : [game.platform]

  const imgSrc = game.cover_image
    ? `${import.meta.env.VITE_API_URL ?? "http://localhost:3002"}${game.cover_image}`
    : `https://picsum.photos/seed/${game.id}/300/400`

  const platformGlow = PLATFORM_GLOW_CLASS[game.platform]
  const platformBadgeClass = PLATFORM_BADGE_CLASS[game.platform]

  return (
    <div className="flex flex-col gap-10 sm:flex-row sm:gap-12">
      {/* Cover with platform glow — the signature detail */}
      <div className="relative w-44 shrink-0 self-center sm:self-auto sm:w-56">
        <div
          className={`absolute inset-4 rounded-2xl blur-2xl opacity-25 ${platformGlow}`}
        />
        <img
          src={imgSrc}
          alt={game.name}
          className="relative aspect-3/4 w-full rounded-2xl object-cover shadow-2xl shadow-black/40"
          style={{ viewTransitionName: `game-cover-${game.id}` }}
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-6">
        <div className="space-y-2">
          <Badge variant="secondary" className={`border text-xs ${platformBadgeClass}`}>
            {PLATFORM_LABEL[game.platform]}
          </Badge>
          <h1 className="text-2xl font-bold leading-snug">{game.name}</h1>
        </div>

        <Separator />

        {game.prices.length > 0 && (
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              قیمت
            </p>
            {platforms.map((pl) => {
              const entries = ZARFIATS.map((z) => ({
                z,
                label: ZARFIAT_LABEL[z],
                price: calcPrice(game, pl, z, exchange_rate),
              })).filter((e) => e.price !== null)
              if (entries.length === 0) return null
              return (
                <div key={pl} className="space-y-2">
                  {platforms.length > 1 && (
                    <p className="text-xs font-medium text-muted-foreground">
                      {pl.toUpperCase()}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {entries.map(({ z, label, price }) => (
                      <PriceTile
                        key={z}
                        game={game}
                        platform={pl}
                        zarfiat={z}
                        label={label}
                        price={price!}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {game.links.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              لینک‌ها
            </p>
            <div className="flex flex-wrap gap-2">
              {game.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-xs backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <ExternalLink className="size-3" />
                  {link.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PriceTile({
  game,
  platform,
  zarfiat,
  label,
  price,
}: {
  game: Game
  platform: ConsolePlatform
  zarfiat: Zarfiat
  label: string
  price: number
}) {
  const { items, addItem } = useCart()
  const inCart =
    items.find(
      (i) => i.gameId === game.id && i.platform === platform && i.zarfiat === zarfiat,
    )?.quantity ?? 0

  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3 backdrop-blur-sm space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-primary">{formatToman(price)}</p>
      <Button
        size="sm"
        variant={inCart > 0 ? "secondary" : "outline"}
        className="w-full h-8 text-xs gap-1.5"
        disabled={inCart >= 10}
        onClick={() =>
          addItem({
            gameId: game.id,
            gameName: game.name,
            coverImage: game.cover_image,
            platform,
            zarfiat,
          })
        }
      >
        <ShoppingCart className="size-3" />
        {inCart > 0 ? `در سبد (${inCart})` : "افزودن"}
      </Button>
    </div>
  )
}

function GameDetailSkeleton() {
  return (
    <div className="flex flex-col gap-10 sm:flex-row sm:gap-12">
      <Skeleton className="aspect-3/4 w-44 self-center rounded-2xl sm:self-auto sm:w-56" />
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
