import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "z-games | where fun begins!",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => <p>صفحه‌ای یافت نشد</p>,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html
      dir="rtl"
      lang="fa"
      className="dark"
      data-theme="dark"
    >
      <head>
        {/* Classic (non-module) scripts run before @vite/client's module script,
            so this listener is registered first and can stopImmediatePropagation
            before Vite captures the ResizeObserver error and starts the echo loop. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('error',function(e){if(e.message&&e.message.indexOf('ResizeObserver loop')!==-1){e.stopImmediatePropagation();e.preventDefault();}},true);`,
          }}
        />
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
