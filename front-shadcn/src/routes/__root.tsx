import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Outlet,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { DirectionProvider } from "@/components/ui/direction"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools"
import type { QueryClient } from "@tanstack/react-query"
import { meQueryOptions } from "@/features/auth"
import { serverCartQueryOptions } from "@/features/cart"

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
  // Prefetch auth + (when logged in) the server cart so the navbar badge and
  // cart page render correct data on first paint with no flash.
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions())
    if (me) {
      await context.queryClient.ensureQueryData(serverCartQueryOptions())
    }
  },
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <p>صفحه‌ای یافت نشد</p>
    </main>
  ),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <DirectionProvider direction="rtl">
          <ThemeProvider defaultTheme="dark" storageKey="z-games-theme">
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
