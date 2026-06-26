import { queryOptions } from "@tanstack/react-query"
import { getGames, getGame } from "./api"
import { getAdminGamesFn, getAdminGameFn } from "./server-fns"
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
