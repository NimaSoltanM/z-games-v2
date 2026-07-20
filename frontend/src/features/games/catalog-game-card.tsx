import { Link } from "@tanstack/react-router"

import {
  cheapestPrice,
  consoleLabel,
  discountedPrice,
  formatToman,
  gameCoverSrc,
} from "./types"
import type { ExchangeRate, Game } from "./types"

export function CatalogGameCard({
  game,
  rate,
}: {
  game: Game
  rate: ExchangeRate
}) {
  const original = cheapestPrice(game, rate)
  const price = discountedPrice(original, game)

  return (
    <Link
      to="/games/$slug"
      params={{ slug: game.slug }}
      viewTransition
      className="group overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="relative overflow-hidden">
        <img
          src={gameCoverSrc(game.cover_image)}
          alt={`کاور بازی ${game.name}`}
          width={450}
          height={600}
          loading="lazy"
          decoding="async"
          className="aspect-3/4 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {game.returnable && (
          <span className="absolute top-2 right-2 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
            قابل بازخرید
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <h2 className="line-clamp-1 font-semibold">{game.name}</h2>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {game.consoles.map((code) => consoleLabel(code, rate)).join("، ")}
        </p>
        <div className="flex items-end gap-2 pt-1">
          <p className="text-sm font-bold text-primary">
            {price == null ? "قیمت در صفحه بازی" : `از ${formatToman(price)}`}
          </p>
          {original != null && price != null && price < original && (
            <p className="text-xs text-muted-foreground line-through">
              {formatToman(original)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
