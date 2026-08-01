import { fileURLToPath } from "node:url"

import { serveStatic } from "srvx/static"

import startServer from "./dist/server/server.js"

const staticFiles = serveStatic({
  dir: fileURLToPath(new URL("./dist/client", import.meta.url)),
})

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

async function productionMiddleware(request, next) {
  const response = await staticFiles(request, next)
  const pathname = new URL(request.url).pathname
  const cacheControl = cacheControlFor(pathname)

  if (cacheControl) {
    response.headers.set("cache-control", cacheControl)
  } else if (response.headers.get("content-type")?.startsWith("text/html")) {
    response.headers.set("cache-control", "private, no-cache")
  }

  // Keep the exact Response returned by srvx. Re-wrapping its file-backed body
  // transfers ownership of the ReadableStream and can make Node close the same
  // stream twice on a later static request. Nginx handles wire compression.
  return response
}

export { cacheControlFor, productionMiddleware }

export default {
  fetch: startServer.fetch,
  middleware: [productionMiddleware],
}
