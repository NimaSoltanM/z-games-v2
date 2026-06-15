import { createFileRoute } from "@tanstack/react-router"
import { Hero } from "@/components/landing/hero"
import { GamesShowcase } from "@/components/landing/games-showcase"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Tiers } from "@/components/landing/tiers"
import { Features } from "@/components/landing/features"
import { Faq } from "@/components/landing/faq"
import { FinalCta } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"

export const Route = createFileRoute("/")({ component: LandingPage })

function LandingPage() {
  return (
    <main>
      <Hero />
      <GamesShowcase />
      <HowItWorks />
      <Tiers />
      <Features />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  )
}
