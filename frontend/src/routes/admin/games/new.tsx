import { createFileRoute } from "@tanstack/react-router"

import { DashboardHeader } from "@/components/dashboard-shell"
import { adminPricingQueryOptions } from "@/features/games"
import { GameForm } from "@/features/games/game-form"

export const Route = createFileRoute("/admin/games/new")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(adminPricingQueryOptions())
  },
  component: NewGamePage,
})

function NewGamePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <DashboardHeader
        title="ساخت بازی جدید"
        back={{ to: "/admin/games", label: "بازگشت به بازی‌ها" }}
      />
      <GameForm />
    </div>
  )
}
