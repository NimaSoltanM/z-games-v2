import { Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  BadgeCheck,
  Gamepad2,
  Headphones,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"

const TRUST_POINTS = [
  { icon: RefreshCcw, label: "بازخرید بازی‌های واجد شرایط" },
  { icon: Headphones, label: "پشتیبانی واقعی قبل و بعد خرید" },
  { icon: ShieldCheck, label: "پشتیبانی مادام‌العمر برای ۹۰٪ اکانت‌ها" },
  { icon: BadgeCheck, label: "تهیه‌شده با گیفت‌کارت قانونی" },
] as const

const CYCLE = [
  { icon: Gamepad2, label: "بازی رو بخر" },
  { icon: Sparkles, label: "تمومش کن" },
  { icon: RefreshCcw, label: "اکانت رو برگردون" },
] as const

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b from-primary/6 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <Badge
              variant="outline"
              className="h-7 gap-2 border-border/60 bg-card/80 px-3 text-muted-foreground"
            >
              <span className="size-1.5 rounded-full bg-blue-500" />
              PlayStation
              <span className="mx-0.5 h-3 w-px bg-border" />
              <span className="size-1.5 rounded-full bg-green-500" />
              Xbox
            </Badge>

            <h1 className="mt-6 max-w-3xl pb-2 text-4xl leading-[1.4] font-black tracking-tight sm:text-5xl lg:leading-[1.35]">
              بازی کن. تمومش کن.
              <br />
              <span className="bg-linear-to-l from-foreground to-foreground/45 bg-clip-text text-transparent">
                اعتبارش رو پس بگیر.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              از بازی‌های روز تا عنوان‌هایی که سخت‌تر پیدا می‌شن؛ برای PS4، PS5،
              Xbox One و Xbox Series. بازی‌های واجد شرایط رو بعد از تموم کردن به
              Z-Games برگردون و برای خرید بعدی اعتبار بگیر.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                render={<Link to="/games" search={GAMES_DEFAULT_SEARCH} />}
                nativeButton={false}
                size="lg"
                className="h-11 w-full gap-2 px-6 sm:w-auto"
              >
                بازی موردنظرت رو پیدا کن
                <ArrowLeft className="size-4" />
              </Button>
              <Button
                render={<a href="#buy-back" />}
                nativeButton={false}
                variant="outline"
                size="lg"
                className="h-11 w-full px-6 sm:w-auto"
              >
                بازخرید چطور کار می‌کنه؟
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="relative rounded-3xl border border-border/60 bg-card/90 p-3 shadow-lg sm:p-5">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      چرخه‌ی بازی هوشمند
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      پولت توی یک بازی گیر نمی‌کنه
                    </p>
                  </div>
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <RefreshCcw className="size-5" />
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  {CYCLE.map((item, index) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/75 p-3.5"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <item.icon className="size-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium">
                        {item.label}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {(index + 1).toLocaleString("fa-IR")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 p-4">
                  <WalletCards className="size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">اعتبار خرید بعدی</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      بر اساس قیمت روز بازی، مستقیم در کیف پولت
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid overflow-hidden rounded-2xl border border-border/60 bg-card/80 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((point) => (
            <div
              key={point.label}
              className="flex items-center gap-3 border-b border-border/50 p-4 last:border-b-0 lg:border-b-0 lg:border-l lg:last:border-l-0 sm:[&:nth-child(odd)]:border-l"
            >
              <point.icon className="size-4 shrink-0 text-primary" />
              <span className="text-xs leading-5 text-muted-foreground">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
