import type { ReactNode } from "react"

import type { ExchangeRate, Game } from "@/features/games"
import { cn } from "@/lib/utils"

import { CardBelt, CardBeltItem } from "./card-belt"
import { GameCard } from "./game-card"

export function BeltSection({
  id,
  title,
  subtitle,
  games,
  rate,
  action,
  className,
}: {
  id: string
  title: string
  subtitle?: string
  games: ReadonlyArray<Game>
  rate: ExchangeRate
  action?: ReactNode
  className?: string
}) {
  if (games.length === 0) return null

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn("space-y-5", className)}
    >
      <div className="flex items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2
            id={`${id}-heading`}
            className="text-2xl leading-relaxed font-black text-balance sm:text-3xl"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <CardBelt label={title}>
        {games.map((game) => (
          <CardBeltItem key={game.id}>
            <GameCard game={game} rate={rate} />
          </CardBeltItem>
        ))}
      </CardBelt>
    </section>
  )
}
