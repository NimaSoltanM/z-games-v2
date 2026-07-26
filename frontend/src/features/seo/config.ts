const LOCAL_SITE_URL = "http://localhost:3000"

export const SITE_NAME = "زد گیمز"

function normalizeOrigin(value: string | undefined): string {
  const candidate = value?.trim() || LOCAL_SITE_URL
  try {
    const url = new URL(candidate)
    return url.origin
  } catch {
    return LOCAL_SITE_URL
  }
}

export const SITE_URL = normalizeOrigin(import.meta.env.VITE_SITE_URL)

// Indexing is opt-in so a staging deployment can never leak into search merely
// because it happens to be publicly reachable. Production must set both an
// HTTPS VITE_SITE_URL and VITE_ALLOW_INDEXING=true.
export const INDEXING_ENABLED =
  import.meta.env.VITE_ALLOW_INDEXING === "true" &&
  SITE_URL.startsWith("https://")

export function absoluteUrl(pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl, `${SITE_URL}/`).toString()
  } catch {
    return `${SITE_URL}/`
  }
}

export function canonicalUrl(
  path: string,
  options: { keepSearch?: boolean } = {}
): string {
  const url = new URL(path || "/", `${SITE_URL}/`)
  if (!options.keepSearch) url.search = ""
  url.hash = ""
  return url.toString()
}

export const DEFAULT_SOCIAL_IMAGE = absoluteUrl("/brand/og-default.jpg")
