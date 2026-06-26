import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import type { DashNavItem } from "@/components/dashboard-shell"

// The mobile counterpart to the desktop sidebar: a floating, center-docked pill
// that surfaces the dashboard sections at thumb height. Hidden on `lg` where the
// sidebar takes over. `activeTo` is resolved once by the parent layout so the
// dock and sidebar always agree on the highlighted section.
export function FloatingDock({
  items,
  activeTo,
}: {
  items: readonly DashNavItem[]
  activeTo: string | null
}) {
  return (
    <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 lg:hidden">
      <nav className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 p-1.5 shadow-lg shadow-black/20 backdrop-blur-xl dark:shadow-black/40">
        {items.map((item) => {
          const active = item.to === activeTo
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              search={item.search}
              aria-label={item.label}
              className={cn(
                "flex min-w-16 flex-col items-center gap-1 rounded-full px-4 py-2 transition-colors active:scale-95",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
