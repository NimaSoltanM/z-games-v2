import {
  calcPrice,
  capacityLabel,
  consoleLabel,
  discountedPrice,
  gameCoverSrc,
} from "@/features/games"
import type { ExchangeRate, Game } from "@/features/games"
import { SITE_NAME, SITE_URL, absoluteUrl, canonicalUrl } from "./config"
import { breadcrumbJsonLd } from "./json-ld"
import type { JsonLd } from "./json-ld"

function joinFa(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "کنسول"
  return `${values.slice(0, -1).join("، ")} و ${values.at(-1)}`
}

function trimDescription(value: string, max = 160): string {
  if (value.length <= max) return value
  const shortened = value.slice(0, max - 1)
  const lastSpace = shortened.lastIndexOf(" ")
  return `${shortened.slice(0, Math.max(lastSpace, max - 18)).trim()}…`
}

export function gameSeoTitle(game: Game, rate: ExchangeRate): string {
  if (game.seo_title?.trim()) return game.seo_title.trim()
  const consoles = joinFa(game.consoles.map((code) => consoleLabel(code, rate)))
  return `خرید اکانت ${game.name} برای ${consoles} | ${SITE_NAME}`
}

export function gameSeoDescription(game: Game, rate: ExchangeRate): string {
  if (game.seo_description?.trim()) {
    return trimDescription(game.seo_description.trim())
  }
  const consoles = joinFa(game.consoles.map((code) => consoleLabel(code, rate)))
  const returnText = game.returnable ? " و امکان بازخرید" : ""
  return trimDescription(
    `خرید اکانت قانونی بازی ${game.name} برای ${consoles}؛ مشاهده ظرفیت‌ها، قیمت روز، شرایط فعال‌سازی و پشتیبانی${returnText} در زد گیمز.`
  )
}

function offerAvailability(game: Game): string {
  if (game.phase === "pre_order") return "https://schema.org/PreOrder"
  return game.purchasable
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock"
}

export function gameJsonLd(game: Game, rate: ExchangeRate): JsonLd {
  const path = `/games/${game.slug}`
  const url = canonicalUrl(path)
  const description = gameSeoDescription(game, rate)
  const offers = game.prices.flatMap((entry) => {
    const toman = discountedPrice(
      calcPrice(game, entry.platform, entry.zarfiat, rate),
      game
    )
    if (toman == null || toman <= 0) return []

    return [
      {
        "@type": "Offer",
        sku: `${game.id}-${entry.platform}-${entry.zarfiat}`,
        name: `${consoleLabel(entry.platform, rate)}، ${capacityLabel(entry.zarfiat, rate)}`,
        url,
        // Schema.org requires an ISO 4217 currency. Store prices are Toman, so
        // publish the equivalent Rial amount rather than an invalid "TOMAN" code.
        price: String(toman * 10),
        priceCurrency: "IRR",
        availability: offerAvailability(game),
        seller: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
        },
      },
    ]
  })

  const product: JsonLd = {
    "@type": "Product",
    "@id": `${url}#product`,
    url,
    sku: game.id,
    name: game.name,
    description,
    image: [absoluteUrl(gameCoverSrc(game.cover_image))],
    category: "اکانت قانونی بازی کنسول",
    ...(offers.length > 0 ? { offers } : {}),
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      product,
      breadcrumbJsonLd([
        { name: "خانه", path: "/" },
        { name: "خرید بازی", path: "/games" },
        { name: game.name, path },
      ]),
    ],
  }
}

export function catalogJsonLd(
  games: Game[],
  options: { path?: string; name?: string; description?: string } = {}
): JsonLd {
  const path = options.path ?? "/games"
  const name = options.name ?? "خرید اکانت قانونی بازی‌های کنسول"
  const description =
    options.description ??
    "فهرست اکانت‌های قانونی بازی برای PlayStation و Xbox با قیمت روز و ظرفیت‌های قابل خرید."
  const url = canonicalUrl(path)
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url,
        name,
        description,
        inLanguage: "fa-IR",
        mainEntity: { "@id": `${url}#games` },
      },
      {
        "@type": "ItemList",
        "@id": `${url}#games`,
        numberOfItems: games.length,
        itemListElement: games.map((game, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: canonicalUrl(`/games/${game.slug}`),
          name: game.name,
          image: absoluteUrl(gameCoverSrc(game.cover_image)),
        })),
      },
      breadcrumbJsonLd([
        { name: "خانه", path: "/" },
        { name: "خرید بازی", path: "/games" },
        ...(path === "/games" ? [] : [{ name, path }]),
      ]),
    ],
  }
}
