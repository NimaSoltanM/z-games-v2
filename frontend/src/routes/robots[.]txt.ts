import { createFileRoute } from "@tanstack/react-router"

import { INDEXING_ENABLED, canonicalUrl } from "@/features/seo"

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = INDEXING_ENABLED
          ? [
              "User-agent: *",
              "Allow: /",
              "Disallow: /admin/",
              "Disallow: /dashboard/",
              "Disallow: /auth/",
              "Disallow: /cart/",
              "Disallow: /payment/",
              "",
              `Sitemap: ${canonicalUrl("/sitemap.xml")}`,
              "",
            ].join("\n")
          : "User-agent: *\nDisallow: /\n"

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        })
      },
    },
  },
})
