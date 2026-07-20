import { queryOptions } from "@tanstack/react-query"
import { getGames, getGame, getRelatedGames } from "./api"
import {
  getAdminGamesFn,
  getAdminGameFn,
  getAdminPricingFn,
} from "./server-fns"
import type { GamesParams } from "./types"

export const gamesQueryOptions = (params: GamesParams = {}) =>
  queryOptions({
    queryKey: ["games", params],
    queryFn: () => getGames(params),
  })

export const gameQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["games", id],
    queryFn: () => getGame(id),
  })

export const relatedGamesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["games", id, "related"],
    queryFn: () => getRelatedGames(id),
  })

// Full catalog (active + inactive) plus the exchange rate, for admin screens.
export const adminGamesQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "games"],
    queryFn: () => getAdminGamesFn(),
  })

// A single game (any active state) for the admin edit screen.
export const adminGameQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["admin", "games", id],
    queryFn: () => getAdminGameFn({ data: id }),
  })

// Global pricing config (rate + split + default margin), for the form preview.
export const adminPricingQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "pricing"],
    queryFn: () => getAdminPricingFn(),
  })
