import { SITE_NAME, SITE_URL, absoluteUrl, canonicalUrl } from "./config"

export type JsonLd = Record<string, unknown>

// JSON-LD is rendered inside a script element. Escaping '<' prevents an
// administrator-controlled title from ever terminating that element with
// `</script>` while preserving valid JSON.
export function stringifyJsonLd(value: JsonLd): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export function jsonLdScript(value: JsonLd) {
  return {
    type: "application/ld+json",
    children: stringifyJsonLd(value),
  }
}

export function siteJsonLd(): JsonLd {
  const organizationId = `${SITE_URL}/#organization`
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        alternateName: "Z-Games",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/brand/icon-512.png"),
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: "Z-Games",
        inLanguage: "fa-IR",
        publisher: { "@id": organizationId },
      },
    ],
  }
}

export type BreadcrumbItem = { name: string; path: string }

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  }
}
