import { createFileRoute } from "@tanstack/react-router"
import { Hero } from "@/components/landing/hero"
import { BuyBack } from "@/components/landing/buy-back"
import { GamesShowcase } from "@/components/landing/games-showcase"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Tiers } from "@/components/landing/tiers"
import { Features } from "@/components/landing/features"
import { Faq } from "@/components/landing/faq"
import { FinalCta } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      {
        title: "Z-Games | بازی‌های PlayStation و Xbox با امکان بازخرید",
      },
      {
        name: "description",
        content:
          "خرید بازی‌های PS4، PS5، Xbox One و Xbox Series با پشتیبانی واقعی، کاتالوگ رو‌به‌رشد و امکان بازخرید بازی‌های واجد شرایط.",
      },
    ],
  }),
})

function LandingPage() {
  return (
    <main>
      <Hero />
      <BuyBack />
      <GamesShowcase />
      <Tiers />
      <Features />
      <HowItWorks />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  )
}
