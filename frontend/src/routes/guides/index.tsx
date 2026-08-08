import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  BookOpenCheck,
  Gamepad2,
  RefreshCcw,
  ScrollText,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { platformBadgeClass } from "@/features/games"
import { seoHead } from "@/features/seo"

export const Route = createFileRoute("/guides/")({
  head: () =>
    seoHead({
      title: "راهنمای استفاده از اکانت بازی PS4، PS5 و Xbox | زد گیمز",
      description:
        "راهنمای ویدیویی و مرحله‌به‌مرحله ورود، دانلود و فعال‌سازی اکانت بازی روی PS4، PS5 و Xbox و دسترسی سریع به راهنمای خرید زد گیمز.",
      path: "/guides",
    }),
  component: GuidesPage,
})

const ACCOUNT_GUIDES = [
  {
    platform: "ps4" as const,
    title: "افزودن اکانت روی پلی‌استیشن ۴",
    description: "ورود، دانلود بازی و تنظیم صحیح ظرفیت‌های ۱، ۲ و ۳ روی PS4.",
    to: "/guides/add-account/ps4" as const,
    label: "مشاهده راهنمای PS4",
  },
  {
    platform: "ps5" as const,
    title: "افزودن اکانت روی پلی‌استیشن ۵",
    description:
      "ورود، دانلود بازی و تنظیم Console Sharing برای ظرفیت‌های ۱، ۲ و ۳ روی PS5.",
    to: "/guides/add-account/ps5" as const,
    label: "مشاهده راهنمای PS5",
  },
  {
    platform: "xbox_series" as const,
    title: "افزودن اکانت روی Xbox",
    description:
      "ورود، فعال‌سازی Game Pass و تنظیم صحیح ظرفیت‌های Home و Switch روی Xbox.",
    to: "/guides/add-account/xbox" as const,
    label: "مشاهده راهنمای Xbox",
  },
] as const

const OTHER_GUIDES = [
  {
    icon: BookOpenCheck,
    title: "خرید چطور انجام می‌شود؟",
    description: "از انتخاب بازی و ظرفیت تا پرداخت و دریافت اطلاعات اکانت.",
    to: "/how-it-works" as const,
    label: "راهنمای خرید",
  },
  {
    icon: RefreshCcw,
    title: "بازخرید اکانت بازی",
    description: "شرایط بازگرداندن بازی و دریافت اعتبار برای خرید بعدی.",
    to: "/buyback" as const,
    label: "آشنایی با بازخرید",
  },
  {
    icon: ScrollText,
    title: "قوانین بازگشت",
    description: "قوانین ضبط ویدیو، خروج از حساب و محاسبه اعتبار بازگشت.",
    to: "/returns/rules" as const,
    label: "مطالعه قوانین",
  },
] as const

function GuidesPage() {
  return (
    <main className="relative min-h-screen bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute right-1/3 -bottom-32 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">مرکز راهنما</p>
          <h1 className="mt-3 text-4xl leading-tight font-black sm:text-5xl">
            برای چه کاری راهنما می‌خواهی؟
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            راهنمای مناسب را انتخاب کن تا بدون حدس‌زدن، مراحل درست همان کار و
            همان کنسول را ببینی.
          </p>
        </header>

        <section aria-labelledby="account-guides" className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="account-guides" className="text-2xl font-bold">
                ورود و راه‌اندازی اکانت
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                اطلاعات اکانت را تحویل گرفته‌ای؟ از اینجا ادامه بده.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            {ACCOUNT_GUIDES.map((guide) => (
              <article
                key={guide.platform}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 sm:p-8"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-border/60 bg-background/60 text-primary">
                      <Gamepad2 className="size-6" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{guide.title}</h3>
                        <Badge
                          variant="secondary"
                          className={`border ${platformBadgeClass(guide.platform)}`}
                        >
                          {guide.platform.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                        {guide.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    render={<Link to={guide.to} />}
                    nativeButton={false}
                    className="w-full gap-2 sm:w-auto"
                  >
                    {guide.label}
                    <ArrowLeft className="size-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="more-guides" className="mt-16">
          <h2 id="more-guides" className="text-2xl font-bold">
            راهنماهای دیگر
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {OTHER_GUIDES.map((guide) => (
              <article
                key={guide.to}
                className="flex flex-col rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm"
              >
                <span className="grid size-10 place-items-center rounded-xl border border-border/60 bg-background/60 text-primary">
                  <guide.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-bold">{guide.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">
                  {guide.description}
                </p>
                <Button
                  render={
                    guide.to === "/buyback" ? (
                      <Link to={guide.to} search={{ page: 1 }} />
                    ) : (
                      <Link to={guide.to} />
                    )
                  }
                  nativeButton={false}
                  variant="ghost"
                  className="mt-4 w-fit gap-2 px-0 hover:bg-transparent"
                >
                  {guide.label}
                  <ArrowLeft className="size-4" />
                </Button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
