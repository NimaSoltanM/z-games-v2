import { apiFetch } from "#/shared/lib/api-client";
import type { GamesListResponse, GameDetailResponse, Game } from "./types";

export function getGames() {
  return apiFetch<GamesListResponse>("/games");
}

export function getGame(id: string) {
  return apiFetch<GameDetailResponse>(`/games/${id}`);
}

// Admin

export function getAdminGames() {
  return apiFetch<GamesListResponse>("/games/admin/all");
}

export function getAdminExchangeRate() {
  return apiFetch<{ usd_to_toman: number | null }>("/games/admin/exchange-rate");
}

export function setExchangeRate(usd_to_toman: number) {
  return apiFetch<{ usd_to_toman: number }>("/games/admin/exchange-rate", {
    method: "POST",
    body: JSON.stringify({ usd_to_toman }),
  });
}

export function createGame(form: FormData) {
  return apiFetch<Game>("/games/admin", {
    method: "POST",
    headers: {},
    body: form,
  });
}

export function updateGame(id: string, form: FormData) {
  return apiFetch<Game>(`/games/admin/${id}`, {
    method: "PATCH",
    headers: {},
    body: form,
  });
}

export function deleteGame(id: string) {
  return apiFetch<{ message: string }>(`/games/admin/${id}`, { method: "DELETE" });
}
