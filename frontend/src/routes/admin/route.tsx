import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import {
  ArchiveRestore,
  KeyRound,
  Package,
  Gamepad2,
  ScrollText,
  Coins,
  RotateCcw,
} from "lucide-react"

import { DashboardLayout } from "@/components/dashboard-shell"
import type { DashNavItem } from "@/components/dashboard-shell"
import { getMeFn } from "@/features/auth"
import { noIndexHead } from "@/features/seo"

const NAV: readonly DashNavItem[] = [
  {
    to: "/admin/orders",
    search: { page: 1, status: "", search: "" },
    icon: Package,
    label: "سفارش‌ها",
  },
  { to: "/admin/games", icon: Gamepad2, label: "بازی‌ها" },
  {
    to: "/admin/returns",
    search: { page: 1, status: "", search: "" },
    icon: RotateCcw,
    label: "بازگشت‌ها",
  },
  {
    to: "/admin/inventory",
    search: { page: 1, status: "", search: "" },
    icon: ArchiveRestore,
    label: "موجودی برگشتی",
  },
  {
    to: "/admin/verification-codes",
    search: { page: 1, status: "", search: "" },
    icon: KeyRound,
    label: "کدهای ورود",
  },
  { to: "/admin/games/pricing", icon: Coins, label: "قیمت‌گذاری" },
  {
    to: "/admin/audit",
    search: { page: 1, action: "", admin_id: "" },
    icon: ScrollText,
    label: "تاریخچه",
  },
]

export const Route = createFileRoute("/admin")({
  head: () => noIndexHead("مدیریت فروشگاه | زد گیمز"),
  // Single admin guard for every /admin/* route. Children inherit it, so they no
  // longer guard individually; non-admins are bounced home, guests to login.
  beforeLoad: async ({ location }) => {
    const me = await getMeFn()
    if (!me)
      throw redirect({ to: "/auth", search: { redirect: location.pathname } })
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
