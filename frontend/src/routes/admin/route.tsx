import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { Package, Gamepad2, ScrollText, Coins } from "lucide-react"

import { DashboardLayout } from "@/components/dashboard-shell"
import type { DashNavItem } from "@/components/dashboard-shell"
import { getMeFn } from "@/features/auth"

const NAV: readonly DashNavItem[] = [
  {
    to: "/admin/orders",
    search: { page: 1, status: "", search: "" },
    icon: Package,
    label: "سفارش‌ها",
  },
  { to: "/admin/games", icon: Gamepad2, label: "بازی‌ها" },
  { to: "/admin/games/pricing", icon: Coins, label: "قیمت‌گذاری" },
  {
    to: "/admin/audit",
    search: { page: 1, action: "", admin_id: "" },
    icon: ScrollText,
    label: "تاریخچه",
  },
]

export const Route = createFileRoute("/admin")({
  // Single admin guard for every /admin/* route. Children inherit it, so they no
  // longer guard individually; non-admins are bounced home, guests to login.
  beforeLoad: async ({ location }) => {
    const me = await getMeFn()
    if (!me) throw redirect({ to: "/auth", search: { redirect: location.pathname } })
    if (me.role === "user") throw redirect({ to: "/" })
  },
  component: AdminLayoutRoute,
})

function AdminLayoutRoute() {
  return (
    <DashboardLayout items={NAV}>
      <Outlet />
    </DashboardLayout>
  )
}
