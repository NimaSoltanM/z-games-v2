import { apiFetch } from "@/lib/api-client"
import type {
  AdminGame,
  GameDetailResponse,
  GameFormPayload,
  GamesParams,
  PaginatedGamesResponse,
  ReleaseStatus,
  AlertVariant,
  GamesListResponse,
} from "./types"

export function getGames(params: GamesParams = {}) {
  const q = new URLSearchParams()
  if (params.page) q.set("page", String(params.page))
  if (params.limit) q.set("limit", String(params.limit))
  if (params.platform) q.set("platform", params.platform)
  if (params.zarfiat) q.set("zarfiat", params.zarfiat)
  if (params.search) q.set("search", params.search)
  if (params.sort) q.set("sort", params.sort)
  if (params.featured) q.set("featured", "true")
  if (params.returnable) q.set("returnable", "true")
  const qs = q.toString()
  return apiFetch<PaginatedGamesResponse>(`/games${qs ? `?${qs}` : ""}`)
}

// Accepts a slug or an id — the backend resolves either.
export function getGame(idOrSlug: string) {
  return apiFetch<GameDetailResponse>(`/games/${idOrSlug}`)
}

export function getRelatedGames(idOrSlug: string) {
  return apiFetch<GamesListResponse>(`/games/${idOrSlug}/related`)
}

// Checks whether a slug is free (admin live-uniqueness check). `exclude` is the id
// of the game being edited, so renaming a game to its own slug reads as available.
// Returns the normalized slug the backend would store alongside availability.
export function checkSlugAvailable(slug: string, exclude?: string) {
  const q = new URLSearchParams({ slug })
  if (exclude) q.set("exclude", exclude)
  return apiFetch<{ slug: string; available: boolean }>(
    `/games/admin/slug-available?${q.toString()}`
  )
}

// Sets the pricing config: the USD→Toman rate plus, per console, its default
// margin and its capacities' split percentages (each console's splits must sum to
// 100). Dynamic prices derive from these.
export type PricingConfigInput = {
  usd_to_toman: number
  consoles: {
    code: string
    default_margin_pct: number
    capacities: { code: string; split_pct: number }[]
  }[]
}

export function setPricingConfig(body: PricingConfigInput) {
  return apiFetch<unknown>("/games/admin/exchange-rate", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

// Creates a game (definition only — pre-order/alert are set separately).
export function createGame(body: GameFormPayload) {
  return apiFetch<{ game: AdminGame }>("/games/admin", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

// Replaces a game's definition (and its full price/link sets), preserving its
// separately-managed pre-order and alert state.
export function updateGame(id: string, body: GameFormPayload) {
  return apiFetch<{ game: AdminGame }>(`/games/admin/${id}`, {
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
  return apiFetch<{ game: AdminGame }>(`/games/admin/${id}/preorder`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

// Sets or clears (empty message) the free-form admin alert on a game.
export function setGameAlert(
  id: string,
  body: { message: string; variant: AlertVariant }
) {
  return apiFetch<{ game: AdminGame }>(`/games/admin/${id}/alert`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

// Starts a time-boxed percentage discount ({ percent: 1..99, days > 0 }) or stops
// the current one early ({ percent: 0 }).
export function setGameDiscount(
  id: string,
  body: { percent: number; days: number }
) {
  return apiFetch<{ game: AdminGame }>(`/games/admin/${id}/discount`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

// Starts a time-boxed reduced return fee ({ percent: 0..99, days > 0 }) that
// replaces the default 25% buy-back fee for this game, or stops it ({ days: 0 }).
export function setGameReturnFee(
  id: string,
  body: { percent: number; days: number }
) {
  return apiFetch<{ game: AdminGame }>(`/games/admin/${id}/return-fee`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}
