import { Link } from "@tanstack/react-router"

// Tabs linking the two admin areas. Active styling uses TanStack Router's
// activeProps so the current section is highlighted (and nested routes like
// /admin/games/new keep the Games tab active).
export function AdminNav() {
  const idle =
    "rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
  const active = "bg-primary/10 text-primary font-medium"
  return (
    <nav className="flex gap-1.5">
      <Link
        to="/admin/orders"
        search={{ page: 1, status: "", search: "" }}
        className={idle}
        activeProps={{ className: active }}
      >
        سفارش‌ها
      </Link>
      <Link
        to="/admin/games"
        className={idle}
        activeProps={{ className: active }}
      >
        بازی‌ها
      </Link>
    </nav>
  )
}

// Page wrapper for admin screens: the signature grid background, a max-width
// container, the admin nav, and a title row.
export function AdminShell({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-background bg-grid-lines">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav />
        <div className="mt-6 mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          {action}
        </div>
        {children}
      </div>
    </div>
  )
}
