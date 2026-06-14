import { createFileRoute } from "@tanstack/react-router"
import { Hero } from "@/components/landing/hero"

export const Route = createFileRoute("/")({ component: LandingPage })

function LandingPage() {
  return (
    <main>
      <Hero />
    </main>
  )
}
