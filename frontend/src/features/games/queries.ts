import { queryOptions } from "@tanstack/react-query";
import { getGames, getGame, getAdminGames, getAdminExchangeRate } from "./api";

export const gamesQueryOptions = () =>
  queryOptions({
    queryKey: ["games"],
    queryFn: getGames,
  });

export const gameQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["games", id],
    queryFn: () => getGame(id),
  });

export const adminGamesQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "games"],
    queryFn: getAdminGames,
  });

export const adminExchangeRateQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "exchange-rate"],
    queryFn: getAdminExchangeRate,
  });
