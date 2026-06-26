import { apiFetch } from "@/lib/api-client"
import type {
  Game,
  GameDetailResponse,
  GameFormPayload,
  GamesParams,
  PaginatedGamesResponse,
  ReleaseStatus,
  AlertVariant,
} from "./types"

export function getGames(params: GamesParams = {}) {
  const q = new URLSearchParams()
  if (params.page) q.set("page", String(params.page))
  if (params.platform) q.set("platform", params.platform)
  if (params.zarfiat) q.set("zarfiat", params.zarfiat)
  if (params.search) q.set("search", params.search)
  if (params.sort) q.set("sort", params.sort)
  const qs = q.toString()
  return apiFetch<PaginatedGamesResponse>(`/games${qs ? `?${qs}` : ""}`)
}

export function getGame(id: string) {
  return apiFetch<GameDetailResponse>(`/games/${id}`)
}

// Sets the global pricing config: the USD→Toman rate, the capacity split, and
// the default margin that dynamic prices derive from.
export type PricingConfigInput = {
  usd_to_toman: number
  z1_pct: number
  z2_pct: number
  z3_pct: number
  default_margin_pct: number
}

export function setPricingConfig(body: PricingConfigInput) {
  return apiFetch<unknown>("/games/admin/exchange-rate", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

// Creates a game (definition only — pre-order/alert are set separately).
export function createGame(body: GameFormPayload) {
  return apiFetch<{ game: Game }>("/games/admin", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

// Replaces a game's definition (and its full price/link sets), preserving its
// separately-managed pre-order and alert state.
export function updateGame(id: string, body: GameFormPayload) {
  return apiFetch<{ game: Game }>(`/games/admin/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function deleteGame(id: string) {
  return apiFetch<{ message: string }>(`/games/admin/${id}`, {
    method: "DELETE",
  })
}

// Sets a game's pre-order lifecycle. release_status is always applied.
// release_date is a partial field: OMIT it to keep the stored date (so toggling
// the status is a lossless pause/resume), send a string to set it, or null to
// clear it.
export function setGamePreorder(
  id: string,
  body: { release_status: ReleaseStatus; release_date?: string | null }
) {
  return apiFetch<{ game: Game }>(`/games/admin/${id}/preorder`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

// Sets or clears (empty message) the free-form admin alert on a game.
export function setGameAlert(
  id: string,
  body: { message: string; variant: AlertVariant }
) {
  return apiFetch<{ game: Game }>(`/games/admin/${id}/alert`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}
