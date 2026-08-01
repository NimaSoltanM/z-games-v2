import { Link } from "@tanstack/react-router"

import {
  cheapestPrice,
  consoleLabel,
  discountedPrice,
  formatToman,
  gameCoverSrc,
} from "@/features/games"
import type { ExchangeRate, Game } from "@/features/games"
import { cn } from "@/lib/utils"

export function GameCard({
  game,
  rate,
  className,
}: {
  game: Game
  rate: ExchangeRate
  className?: string
}) {
  const originalPrice = cheapestPrice(game, rate)
  const price = discountedPrice(originalPrice, game)

  return (
    <Link
      to="/games/$slug"
      params={{ slug: game.slug }}
      viewTransition
      className={cn(
        "group block h-full overflow-hidden rounded-2xl border border-border/60 bg-card/85 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
        className
      )}
    >
      <div className="relative overflow-hidden bg-muted">
        <img
          src={gameCoverSrc(game.cover_image)}
          alt={`کاور بازی ${game.name}`}
          width={360}
          height={480}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          sizes="(max-width: 639px) 9rem, (max-width: 1023px) 11rem, 12rem"
          className="aspect-3/4 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          style={{ viewTransitionName: `game-cover-${game.id}` }}
        />
        {game.discount ? (
          <span className="absolute end-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            {`٪${game.discount.toLocaleString("fa-IR")}`}
          </span>
        ) : null}
        {game.returnable ? (
          <span className="absolute end-2 bottom-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm">
            قابل بازخرید
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold">{game.name}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {game.consoles.map((code) => consoleLabel(code, rate)).join("، ")}
        </p>
        <div className="flex min-h-9 flex-col justify-end pt-1">
          <p className="text-xs font-bold text-primary">
            {price == null ? "قیمت در صفحه بازی" : `از ${formatToman(price)}`}
          </p>
          {originalPrice != null && price != null && originalPrice > price ? (
            <p className="text-[10px] text-muted-foreground line-through">
              {formatToman(originalPrice)}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
