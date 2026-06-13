import { createFileRoute, ErrorComponent, useRouter } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ArrowRight, ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  gameQueryOptions,
  calcPrice,
  formatToman,
  PLATFORM_LABEL,
  ZARFIATS,
  ZARFIAT_LABEL,
  type ConsolePlatform,
} from "@/features/games"

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
      router.navigate({ to: "/games", search: { page: 1, platform: "", zarfiat: "", search: "", sort: "-created_at" } })
    }
  }

  return (
    <div className="relative min-h-screen bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-1/4 -bottom-32 h-64 w-64 rounded-full bg-violet-500/8 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <button
          onClick={goBack}
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
    game.platform === "ps4_ps5" ? ["ps4", "ps5"] : [game.platform as ConsolePlatform]

  const imgSrc = game.cover_image
    ? `${import.meta.env.VITE_API_URL ?? "http://localhost:3002"}${game.cover_image}`
    : `https://picsum.photos/seed/${game.id}/300/400`

  const platformClass =
    game.platform === "ps4"
      ? "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400"
      : game.platform === "ps5"
        ? "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400"
        : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400"

  return (
    <div className="flex flex-col gap-8 sm:flex-row sm:gap-12">
      {/* Cover — view transition target */}
      <div className="shrink-0 sm:w-64">
        <img
          src={imgSrc}
          alt={game.name}
          className="aspect-3/4 w-full rounded-2xl object-cover shadow-2xl shadow-black/30"
          style={{ viewTransitionName: `game-cover-${game.id}` }}
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-5">
        <div className="space-y-2">
          <Badge
            variant="secondary"
            className={`border text-xs ${platformClass}`}
          >
            {PLATFORM_LABEL[game.platform]}
          </Badge>
          <h1 className="text-2xl leading-snug font-bold">{game.name}</h1>
        </div>

        <Separator />

        {/* Pricing */}
        {game.prices.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">قیمت</p>
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
                    <p className="text-xs font-medium text-muted-foreground">{pl.toUpperCase()}</p>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {entries.map(({ z, label, price }) => (
                      <div key={z} className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-sm">
                        <p className="mb-1 text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-bold text-primary">{formatToman(price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Links */}
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

function GameDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8 sm:flex-row sm:gap-12">
      <Skeleton className="aspect-3/4 w-full rounded-2xl sm:w-64" />
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
