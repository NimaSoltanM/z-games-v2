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
import { seoHead } from "@/features/seo"

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () =>
    seoHead({
      title: "خرید اکانت قانونی بازی PS5 و Xbox | زد گیمز",
      description:
        "خرید اکانت قانونی بازی‌های PS4، PS5 و Xbox با پشتیبانی واقعی، کاتالوگ رو‌به‌رشد و امکان بازخرید بازی‌های واجد شرایط.",
      path: "/",
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
