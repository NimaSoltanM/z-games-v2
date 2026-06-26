import { createFileRoute, redirect } from "@tanstack/react-router"

import { AdminShell } from "@/components/admin-shell"
import { getMeFn } from "@/features/auth"
import { GameForm } from "@/features/games/game-form"

export const Route = createFileRoute("/admin/games/new")({
  beforeLoad: async () => {
    const me = await getMeFn()
    if (!me)
      throw redirect({ to: "/auth", search: { redirect: "/admin/games/new" } })
    if (me.role === "user") throw redirect({ to: "/" })
  },
  component: NewGamePage,
})

function NewGamePage() {
  return (
    <AdminShell title="ساخت بازی جدید">
      <GameForm />
    </AdminShell>
  )
}
