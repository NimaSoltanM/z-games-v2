import { fileURLToPath } from "node:url"

import { serveStatic } from "srvx/static"

import startServer from "./dist/server/server.js"

const staticFiles = serveStatic({
  dir: fileURLToPath(new URL("./dist/client", import.meta.url)),
})

const COMPRESSIBLE_CONTENT_TYPE =
  /^(?:text\/|application\/(?:javascript|json|xml))/i

function copyHeaders(response) {
  const headers = new Headers(response.headers)
  const setCookies = response.headers.getSetCookie?.() ?? []

  if (setCookies.length > 0) {
    headers.delete("set-cookie")
    for (const cookie of setCookies) headers.append("set-cookie", cookie)
  }

  return headers
}

function cacheControlFor(pathname) {
  if (pathname.startsWith("/assets/")) {
    return "public, max-age=31536000, immutable"
  }

  if (
    pathname.startsWith("/brand/") ||
    pathname.startsWith("/catalog/") ||
    pathname === "/manifest.json" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return "public, max-age=86400, stale-while-revalidate=604800"
  }

  return null
}

function canCompress(request, response) {
  if (request.method === "HEAD" || response.body == null) return false
  if (response.headers.has("content-encoding")) return false
  if (!request.headers.get("accept-encoding")?.includes("gzip")) return false

  const contentType = response.headers.get("content-type") ?? ""
  return COMPRESSIBLE_CONTENT_TYPE.test(contentType)
}

async function productionMiddleware(request, next) {
  const response = await staticFiles(request, next)
  const headers = copyHeaders(response)
  const pathname = new URL(request.url).pathname
  const cacheControl = cacheControlFor(pathname)

  if (cacheControl) {
    headers.set("cache-control", cacheControl)
  } else if (headers.get("content-type")?.startsWith("text/html")) {
    headers.set("cache-control", "private, no-cache")
  }

  if (!canCompress(request, response)) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  headers.delete("content-length")
  headers.set("content-encoding", "gzip")
  headers.set("vary", "Accept-Encoding")

  return new Response(
    response.body.pipeThrough(new CompressionStream("gzip")),
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    }
  )
}

export { cacheControlFor, canCompress, productionMiddleware }

export default {
  fetch: startServer.fetch,
  middleware: [productionMiddleware],
}
