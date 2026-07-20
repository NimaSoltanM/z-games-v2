import { createFileRoute } from "@tanstack/react-router"

import type { Game, PaginatedGamesResponse } from "@/features/games"
import { canonicalUrl } from "@/features/seo"

const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3002"
).replace(/\/$/, "")

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

async function fetchGamePage(page: number): Promise<PaginatedGamesResponse> {
  const response = await fetch(
    `${API_URL}/games?page=${page}&limit=100&sort=-created_at`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    }
  )
  if (!response.ok) {
    throw new Error(`SITEMAP_GAMES_FETCH_FAILED: status ${response.status}`)
  }
  return (await response.json()) as PaginatedGamesResponse
}

async function fetchAllPublicGames(): Promise<Game[]> {
  const first = await fetchGamePage(1)
  const remainingPages = Array.from(
    { length: Math.max(0, first.pagination.total_pages - 1) },
    (_, index) => index + 2
  )
  const remaining = await Promise.all(remainingPages.map(fetchGamePage))
  return [first, ...remaining].flatMap((page) => page.games)
}

function sitemapXml(games: Game[]): string {
  const staticUrls = [
    "/",
    "/games",
    "/games/platform/ps4",
    "/games/platform/ps5",
    "/games/platform/xbox_one",
    "/games/platform/xbox_series",
    "/buyback",
    "/returns/rules",
    "/about",
    "/how-it-works",
    "/legal-accounts",
  ].map((path) => `  <url><loc>${escapeXml(canonicalUrl(path))}</loc></url>`)
  const gameUrls = games.map(
    (game) =>
      `  <url><loc>${escapeXml(canonicalUrl(`/games/${game.slug}`))}</loc><lastmod>${escapeXml(game.updated_at)}</lastmod></url>`
  )

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticUrls,
    ...gameUrls,
    "</urlset>",
    "",
  ].join("\n")
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const games = await fetchAllPublicGames()
          return new Response(sitemapXml(games), {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=300, s-maxage=3600",
            },
          })
        } catch (error) {
          console.error("Failed to generate sitemap", error)
          return new Response("Sitemap is temporarily unavailable", {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          })
        }
      },
    },
  },
})
