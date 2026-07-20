import {
  DEFAULT_SOCIAL_IMAGE,
  INDEXING_ENABLED,
  SITE_NAME,
  absoluteUrl,
  canonicalUrl,
} from "./config"

export type SeoHeadInput = {
  title: string
  description: string
  path: string
  image?: string | null
  type?: "website" | "product" | "article"
  noIndex?: boolean
  keepCanonicalSearch?: boolean
}

export function robotsDirective(
  noIndex: boolean,
  indexingEnabled = INDEXING_ENABLED
): string {
  if (noIndex || !indexingEnabled) return "noindex, nofollow"
  return "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
}

export function seoHead({
  title,
  description,
  path,
  image,
  type = "website",
  noIndex = false,
  keepCanonicalSearch = false,
}: SeoHeadInput) {
  const canonical = canonicalUrl(path, { keepSearch: keepCanonicalSearch })
  const socialImage = image ? absoluteUrl(image) : DEFAULT_SOCIAL_IMAGE
  const robots = robotsDirective(noIndex)

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: robots },
      { name: "googlebot", content: robots },
      { property: "og:locale", content: "fa_IR" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: type },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonical },
      { property: "og:image", content: socialImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: socialImage },
    ],
    links: [{ rel: "canonical", href: canonical }],
  }
}

// Layout routes for private areas must not emit a canonical URL: a canonical on
// /dashboard would otherwise be inherited by every nested order/profile page.
export function noIndexHead(title?: string) {
  const robots = robotsDirective(true)
  return {
    meta: [
      ...(title ? [{ title }] : []),
      { name: "robots", content: robots },
      { name: "googlebot", content: robots },
    ],
  }
}
