import { Link, useRouterState } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { FloatingDock } from "@/components/floating-dock"

// One entry in a dashboard's navigation. `to`/`search` are typed against the
// router so callers get autocomplete and type-checking on real routes.
export type DashNavItem = {
  to: LinkProps["to"]
  search?: LinkProps["search"]
  icon: LucideIcon
  label: string
}

// Resolve the active section by longest matching path prefix. This keeps the
// correct item highlighted on nested routes (e.g. /dashboard/$orderId →
// "سفارش‌ها") without a parent route (/dashboard) also lighting up while a
// sibling child (/dashboard/profile) is open.
function useActiveNavTo(items: readonly DashNavItem[]): string | null {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  let best: string | null = null
  for (const item of items) {
    const to = item.to
    if (to === undefined) continue
    if (pathname === to || pathname.startsWith(to + "/")) {
      if (best === null || to.length > best.length) best = to
    }
  }
  return best
}

// The shared shell for every dashboard (user + admin): the signature grid
// background and ambient glow, a max-width container, a sticky right-side
// sidebar on desktop, and a floating dock on mobile. Pages render their own
// title + body via `DashboardHeader` inside the content slot.
export function DashboardLayout({
  items,
  children,
}: {
  items: readonly DashNavItem[]
  children: React.ReactNode
}) {
  const activeTo = useActiveNavTo(items)

  return (
    <div className="relative min-h-[calc(100vh-57px)] bg-background bg-grid-lines">
      {/* ambient glow — decorative, never interactive */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex gap-6 lg:gap-8">
          <DashboardSidebar items={items} activeTo={activeTo} />
          {/* pb leaves room for the mobile dock so it never overlaps content */}
          <main className="min-w-0 flex-1 pb-28 lg:pb-0">{children}</main>
        </div>
      </div>

      <FloatingDock items={items} activeTo={activeTo} />
    </div>
  )
}

function DashboardSidebar({
  items,
  activeTo,
}: {
  items: readonly DashNavItem[]
  activeTo: string | null
}) {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav className="sticky top-20 space-y-1">
        {items.map((item) => {
          const active = item.to === activeTo
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              search={item.search}
              className={cn(
                "flex items-center gap-3 rounded-xl border-r-2 px-3 py-2.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/8 font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

// A consistent page header for dashboard screens: an optional back link, a
// title (+ optional description), and an optional trailing action.
export function DashboardHeader({
  title,
  description,
  action,
  back,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  back?: { to: LinkProps["to"]; search?: LinkProps["search"]; label: string }
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          to={back.to}
          search={back.search}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  )
}
