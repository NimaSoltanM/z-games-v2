import { Link } from "@tanstack/react-router"
import { ArrowLeft, ShieldCheck, Zap, Lock, Gamepad2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spotlight } from "@/components/ui/spotlight"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"

const BENEFITS = [
  { icon: ShieldCheck, label: "گارانتی مادام‌العمر" },
  { icon: Zap, label: "تحویل سریع" },
  { icon: Lock, label: "پرداخت امن زرین‌پال" },
  { icon: Gamepad2, label: "PS4 و PS5" },
] as const

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-57px)] items-center overflow-hidden bg-background bg-grid-lines">
      {/* Spotlight beam — runs its intro once, then costs nothing */}
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-1/4" fill="white" />

      {/* Ambient brand glows — same language as the rest of the site */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          <Sparkles className="size-3.5 text-primary" />
          بازی اورجینال، قیمت ایرانی
        </div>

        <h1 className="mt-6 bg-linear-to-b from-foreground to-foreground/55 bg-clip-text text-4xl font-bold leading-tight text-transparent sm:text-6xl lg:text-7xl">
          اورجینال بازی کن،
          <br />
          <span className="bg-linear-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            کمتر
          </span>{" "}
          خرج کن.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          ظرفیت بازی‌های روز PS4 و PS5 رو روی کنسول خودت داشته باش — گارانتی
          مادام‌العمر، تحویل سریع و پرداخت مطمئن.
        </p>

        <div className="mt-8 flex items-center justify-center">
          <Link to="/games" search={GAMES_DEFAULT_SEARCH}>
            <Button size="lg" className="h-11 gap-2 px-6 text-sm">
              مشاهده بازی‌ها
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
          {BENEFITS.map((b) => (
            <span key={b.label} className="inline-flex items-center gap-1.5">
              <b.icon className="size-4 text-primary/80" />
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
