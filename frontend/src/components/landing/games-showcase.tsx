import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BeltSection } from "@/components/ui/card-belt/belt-section"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"
import type { ExchangeRate, Game } from "@/features/games"

export function GamesShowcase({
  games,
  rate,
}: {
  games: ReadonlyArray<Game>
  rate: ExchangeRate
}) {
  return (
    <div className="border-y border-border/50 bg-background bg-grid-lines py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BeltSection
          id="latest-games"
          title="تازه‌ترین بازی‌ها"
          subtitle="به‌جای حدس زدن بین توضیحات، مستقیم بین بازی‌های موجود بگرد."
          games={games}
          rate={rate}
          action={
            <Button
              render={<Link to="/games" search={GAMES_DEFAULT_SEARCH} />}
              nativeButton={false}
              variant="ghost"
              className="hidden shrink-0 gap-2 sm:inline-flex"
            >
              همه‌ی بازی‌ها
              <ArrowLeft className="size-4" />
            </Button>
          }
        />
      </div>
    </div>
  )
}
