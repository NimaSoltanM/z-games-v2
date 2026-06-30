import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { Package, User, Gamepad2, RotateCcw, Wallet } from "lucide-react"

import { DashboardLayout } from "@/components/dashboard-shell"
import type { DashNavItem } from "@/components/dashboard-shell"
import { getMeFn } from "@/features/auth"

const NAV: readonly DashNavItem[] = [
  {
    to: "/dashboard",
    search: { page: 1, status: "" },
    icon: Package,
    label: "سفارش‌ها",
  },
  {
    to: "/dashboard/games",
    search: { page: 1 },
    icon: Gamepad2,
    label: "بازی‌های من",
  },
  {
    to: "/dashboard/returns",
    search: { page: 1 },
    icon: RotateCcw,
    label: "بازگشت‌ها",
  },
  { to: "/dashboard/wallet", icon: Wallet, label: "کیف پول" },
  { to: "/dashboard/profile", icon: User, label: "حساب کاربری" },
]

export const Route = createFileRoute("/dashboard")({
  // Single login guard for the whole dashboard. Children inherit it, so they no
  // longer guard individually; the redirect returns to the exact page visited.
  beforeLoad: async ({ location }) => {
    const me = await getMeFn()
    if (!me)
      throw redirect({ to: "/auth", search: { redirect: location.pathname } })
  },
  component: DashboardLayoutRoute,
})

function DashboardLayoutRoute() {
  return (
    <DashboardLayout items={NAV}>
      <Outlet />
    </DashboardLayout>
  )
}
