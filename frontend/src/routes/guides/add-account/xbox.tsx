import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Gamepad2,
  KeyRound,
  LogIn,
  PlayCircle,
  Settings,
  ShieldAlert,
  UserRound,
  Wifi,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { platformBadgeClass } from "@/features/games"
import { seoHead } from "@/features/seo"

export const Route = createFileRoute("/guides/add-account/xbox")({
  head: () =>
    seoHead({
      title: "آموزش ورود و فعال‌سازی اکانت Xbox و Game Pass | زد گیمز",
      description:
        "آموزش ویدیویی و مرحله‌به‌مرحله افزودن اکانت Xbox، فعال‌سازی Game Pass و تنظیم صحیح ظرفیت‌های Home و Switch.",
      path: "/guides/add-account/xbox",
    }),
  component: XboxAccountGuidePage,
})

interface GuidePhase {
  title: string
  description: string
  icon: LucideIcon
  start: number
  steps: readonly string[]
}

const LOGIN_PHASE: GuidePhase = {
  title: "افزودن اکانت Xbox",
  description:
    "اکانت خریداری‌شده را اضافه کن و تنظیمات ورود را درست انتخاب کن.",
  icon: LogIn,
  start: 1,
  steps: [
    "دکمه Xbox روی دسته را فشار بده و وارد Profile & System شو.",
    "Add or Switch و سپس Add New را انتخاب کن.",
    "ایمیل اکانت خریداری‌شده را وارد کن و Next را بزن.",
    "رمز عبور را دقیقاً با رعایت حروف بزرگ و کوچک وارد کن.",
    "اگر کد تأیید دومرحله‌ای خواسته شد، آن را از سفارش یا پشتیبانی دریافت و وارد کن.",
    "اگر صفحه انتخاب GamerTag نمایش داده شد، یک نام دلخواه وارد کن.",
    "در صفحه Let's keep in touch تیک Share my email with publishers of games and apps I use on Xbox را بردار و Next را بزن.",
    "در صفحه When we share data with publishers گزینه Next را انتخاب کن.",
    "در Sign in and security preferences حتماً No barriers را انتخاب کن.",
    "در How do you want to sign in، برای Home گزینه Skip this را بزن؛ برای Switch می‌توانی Use instant sign in را انتخاب کنی.",
    "گزینه Link controller را انتخاب نکن.",
  ],
}

const VERIFY_PHASES: readonly GuidePhase[] = [
  {
    title: "بررسی فعال‌شدن اشتراک",
    description: "مطمئن شو اشتراک اکانت درست شناسایی شده است.",
    icon: CheckCircle2,
    start: 12,
    steps: [
      "دکمه Xbox را فشار بده و وارد Profile & System شو.",
      "کنار نام اکانت، نوع اشتراک Ultimate، Essential یا Premium را بررسی کن. نمایش آن یعنی فعال‌سازی موفق بوده است.",
      "مسیر Settings → General → Personalization → My Home Xbox را باز کن و وضعیت را با ظرفیت سفارش تطبیق بده: برای Home فعال و برای Switch غیرفعال.",
    ],
  },
  {
    title: "دانلود بازی‌های Game Pass",
    description: "بازی موردنظر را از کتابخانه کامل پیدا و نصب کن.",
    icon: Download,
    start: 15,
    steps: [
      "وارد My Games & Apps شو.",
      "Full Library را انتخاب کن.",
      "برای بازی‌های اشتراک وارد Xbox Game Pass شو، بازی موردنظر را انتخاب کن و دانلود را شروع کن.",
    ],
  },
]

function XboxAccountGuidePage() {
  return (
    <main className="relative min-h-screen bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          to="/guides"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          بازگشت به مرکز راهنما
        </Link>

        <header className="mt-8 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={`border ${platformBadgeClass("xbox_series")}`}
            >
              XBOX
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" />
              ویدیوی ۲ دقیقه و ۴۵ ثانیه‌ای
            </span>
          </div>
          <h1 className="mt-4 text-3xl leading-tight font-black sm:text-5xl">
            افزودن و فعال‌سازی اکانت Xbox و Game Pass
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            این راهنما برای Game Pass Ultimate، Essential و Premium و همچنین
            اکانت‌های ظرفیتی Home و Switch است. تفاوت اصلی این دو ظرفیت در Home
            Xbox و اکانتی است که بازی را با آن اجرا می‌کنی.
          </p>
          <Button
            render={<a href="#guide-video" />}
            nativeButton={false}
            className="mt-6 gap-2"
          >
            <PlayCircle className="size-4" />
            مشاهده ویدیو
          </Button>
        </header>

        <section aria-labelledby="before-start" className="mt-10">
          <div className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl border border-border/60 bg-background/60 text-primary">
                <ShieldAlert className="size-5" />
              </span>
              <div>
                <h2 id="before-start" className="font-bold">
                  قبل از شروع
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  اینترنت، اکانت شخصی و اطلاعات سفارش را آماده کن.
                </p>
              </div>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              <PrepItem icon={Wifi} text="کنسول Xbox را به اینترنت متصل کن." />
              <PrepItem
                icon={UserRound}
                text="مطمئن شو اکانت شخصی خودت روی کنسول وارد است."
              />
              <PrepItem
                icon={KeyRound}
                text="ایمیل، رمز عبور و کد تأیید احتمالی را از سفارش بردار."
              />
            </ul>
            <Button
              render={<Link to="/dashboard" search={{ page: 1, status: "" }} />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="mt-5 gap-2"
            >
              مشاهده سفارش‌ها
              <ArrowLeft className="size-3.5" />
            </Button>
          </div>
        </section>

        <section aria-labelledby="difference-title" className="mt-10">
          <h2 id="difference-title" className="text-2xl font-bold">
            تفاوت Home و Switch
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <CapacitySummary
              label="ظرفیت Home"
              title="بازی با اکانت شخصی"
              points={[
                "Home Xbox باید فعال شود.",
                "پس از فعال‌سازی به اینترنت دائمی نیاز نداری.",
                "بازی را با اکانت شخصی خودت اجرا می‌کنی.",
              ]}
              className="border-emerald-500/30 bg-emerald-500/5"
            />
            <CapacitySummary
              label="ظرفیت Switch"
              title="اکانت خریداری‌شده باید باقی بماند"
              points={[
                "Home Xbox نباید فعال شود.",
                "هنگام اجرای بازی اینترنت لازم است.",
                "اکانت خریداری‌شده را حذف یا Sign out نکن.",
              ]}
              className="border-sky-500/30 bg-sky-500/5"
            />
          </div>
        </section>

        <section
          id="guide-video"
          aria-labelledby="video-title"
          className="mt-10 scroll-mt-24"
        >
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-xl shadow-primary/5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <PlayCircle className="size-4 text-primary" />
                <h2 id="video-title" className="text-sm font-semibold">
                  آموزش ویدیویی کامل
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">۲:۴۵</span>
            </div>
            <video
              controls
              playsInline
              preload="metadata"
              aria-label="آموزش افزودن و فعال‌سازی اکانت Xbox و Game Pass"
              className="aspect-video w-full bg-background object-contain"
            >
              <source src="/guides/add-account-xbox.mp4" type="video/mp4" />
              مرورگر شما امکان پخش این ویدیو را ندارد. مراحل کامل در ادامه همین
              صفحه نوشته شده‌اند.
            </video>
          </div>
        </section>

        <section aria-labelledby="login-title" className="mt-14">
          <p className="text-sm font-semibold text-primary">راهنمای متنی</p>
          <h2 id="login-title" className="mt-2 text-2xl font-bold">
            ورود و تنظیم اولیه اکانت
          </h2>
          <div className="mt-6">
            <GuidePhaseCard phase={LOGIN_PHASE} />
          </div>
        </section>

        <section aria-labelledby="home-xbox-title" className="mt-16">
          <p className="text-sm font-semibold text-primary">مرحله حساس</p>
          <h2 id="home-xbox-title" className="mt-2 text-2xl font-bold">
            در صفحه Make this your Home Xbox چه انتخابی بزنم؟
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <HomeChoice
              label="ظرفیت Home"
              choice="Make This My Home Xbox"
              description="این گزینه را انتخاب کن. پس از فعال‌شدن، از اکانت خریداری‌شده خارج شو، به اکانت شخصی برو و بازی یا Game Pass را با همان اکانت شخصی اجرا کن."
              className="border-emerald-500/30 bg-emerald-500/5"
            />
            <HomeChoice
              label="ظرفیت Switch"
              choice="Maybe Later"
              description="این گزینه را انتخاب کن و هرگز Make This My Home Xbox را نزن. اکانت خریداری‌شده باید روی کنسول باقی بماند و اینترنت هنگام بازی متصل باشد."
              className="border-destructive/30 bg-destructive/5"
            />
          </div>
        </section>

        <section aria-labelledby="verify-title" className="mt-16">
          <h2 id="verify-title" className="text-2xl font-bold">
            بررسی نهایی و دانلود بازی
          </h2>
          <div className="mt-6 space-y-5">
            {VERIFY_PHASES.map((phase) => (
              <GuidePhaseCard key={phase.title} phase={phase} />
            ))}
          </div>
        </section>

        <section aria-labelledby="usage-title" className="mt-16">
          <h2 id="usage-title" className="text-2xl font-bold">
            بعد از فعال‌سازی چطور بازی کنم؟
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <HomeChoice
              label="استفاده از Home"
              choice="از اکانت شخصی اجرا کن"
              description="وارد اکانت شخصی شو، از My Games & Apps → Full Library بازی را دانلود و اجرا کن. بعد از فعال‌سازی دوباره وارد اکانت خریداری‌شده نشو."
              className="border-emerald-500/30 bg-emerald-500/5"
            />
            <HomeChoice
              label="استفاده از Switch"
              choice="اکانت خریداری‌شده را متصل نگه دار"
              description="اکانت خریداری‌شده باید روی کنسول وارد بماند. سپس از Profile & System به اکانت شخصی سوئیچ کن و با اینترنت فعال بازی را اجرا کن."
              className="border-sky-500/30 bg-sky-500/5"
            />
          </div>
        </section>

        <aside className="mt-14 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center backdrop-blur-sm">
          <ShieldAlert className="mx-auto size-7 text-destructive" />
          <h2 className="mt-3 text-lg font-bold">
            اطلاعات یا تنظیمات اکانت را تغییر نده
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            رمز عبور را تغییر نده، اکانت را حذف یا Sign out نکن و Home Xbox را
            بدون هماهنگی پشتیبانی تغییر نده. در ظرفیت Home نیز پس از فعال‌سازی
            دوباره وارد اکانت خریداری‌شده نشو. برای کد تأیید یا خطای فعال‌سازی
            با پشتیبانی تماس بگیر.
          </p>
          <Button
            render={<Link to="/dashboard" search={{ page: 1, status: "" }} />}
            nativeButton={false}
            variant="outline"
            className="mt-5"
          >
            رفتن به سفارش‌ها
          </Button>
        </aside>
      </div>
    </main>
  )
}

function PrepItem({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/60 p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <span className="text-xs leading-6 text-muted-foreground">{text}</span>
    </li>
  )
}

function GuidePhaseCard({ phase }: { phase: GuidePhase }) {
  const Icon = phase.icon
  return (
    <article className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="font-bold">{phase.title}</h3>
          <p className="mt-1 text-sm leading-7 text-muted-foreground">
            {phase.description}
          </p>
        </div>
      </div>
      <ol className="mt-6 space-y-3">
        {phase.steps.map((step, index) => (
          <Step key={step} number={phase.start + index} text={step} />
        ))}
      </ol>
    </article>
  )
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-border/60 bg-background/60 text-xs font-bold text-primary tabular-nums">
        {number.toLocaleString("fa-IR")}
      </span>
      <p className="pt-0.5 text-sm leading-7 text-foreground/90">{text}</p>
    </li>
  )
}

function CapacitySummary({
  label,
  title,
  points,
  className,
}: {
  label: string
  title: string
  points: readonly string[]
  className: string
}) {
  return (
    <article className={`rounded-2xl border p-5 ${className}`}>
      <Gamepad2 className="size-5 text-primary" />
      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {label}
      </p>
      <h3 className="mt-1 font-bold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {points.map((point) => (
          <li
            key={point}
            className="flex gap-2 text-sm leading-6 text-foreground/80"
          >
            <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-primary" />
            {point}
          </li>
        ))}
      </ul>
    </article>
  )
}

function HomeChoice({
  label,
  choice,
  description,
  className,
}: {
  label: string
  choice: string
  description: string
  className: string
}) {
  return (
    <article className={`rounded-2xl border p-5 ${className}`}>
      <Settings className="size-5 text-primary" />
      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {label}
      </p>
      <h3 className="mt-1 font-bold" dir="auto">
        {choice}
      </h3>
      <p className="mt-2 text-sm leading-7 text-foreground/80">{description}</p>
    </article>
  )
}
