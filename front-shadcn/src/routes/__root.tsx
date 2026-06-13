import { HeadContent, Scripts, createRootRouteWithContext, Link } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { DirectionProvider } from "@/components/ui/direction"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools"
import type { QueryClient } from "@tanstack/react-query"

import appCss from "../styles.css?url"

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Z-Games | بازی‌های PS4 و PS5" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <p>صفحه‌ای یافت نشد</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <DirectionProvider direction="rtl">
          <ThemeProvider defaultTheme="dark" storageKey="z-games-theme">
            <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <Link to="/" className="font-bold text-lg tracking-tight">Z-Games</Link>
                <nav className="flex items-center gap-4 text-sm">
                  <Link
                    to="/games"
                    search={{ page: 1, platform: "", zarfiat: "", search: "", sort: "-created_at" }}
                    className="text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-medium"
                  >
                    بازی‌ها
                  </Link>
                  <Link
                    to="/auth"
                    search={{ redirect: undefined }}
                    className="text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-medium"
                  >
                    ورود
                  </Link>
                  <ModeToggle />
                </nav>
              </div>
            </header>
            {children}
            <TanStackDevtools
              config={{ position: "bottom-right" }}
              plugins={[
                { name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
                TanStackQueryDevtools,
              ]}
            />
          </ThemeProvider>
        </DirectionProvider>
        <Scripts />
      </body>
    </html>
  )
}
