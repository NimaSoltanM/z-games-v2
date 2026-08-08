import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  KeyRound,
  LogIn,
  PlayCircle,
  Settings,
  ShieldAlert,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { platformBadgeClass } from "@/features/games"
import { seoHead } from "@/features/seo"

export const Route = createFileRoute("/guides/add-account/ps5")({
  head: () =>
    seoHead({
      title: "آموزش ورود و فعال‌سازی اکانت روی PS5 | زد گیمز",
      description:
        "آموزش ویدیویی و مرحله‌به‌مرحله افزودن اکانت بازی به PS5، دانلود بازی و تنظیم Console Sharing برای ظرفیت‌های ۱، ۲ و ۳.",
      path: "/guides/add-account/ps5",
    }),
  component: Ps5AccountGuidePage,
})

interface GuidePhase {
  title: string
  description: string
  icon: LucideIcon
  start: number
  steps: readonly string[]
}

const SHARED_PHASES: readonly GuidePhase[] = [
  {
    title: "ورود به اکانت",
    description: "اکانت خریداری‌شده را به‌عنوان یک کاربر جدید اضافه کن.",
    icon: LogIn,
    start: 1,
    steps: [
      "در صفحه اصلی PS5 روی تصویر پروفایل برو و Switch User را انتخاب کن.",
      "گزینه Add User را انتخاب کن.",
      "حتماً روی Get Started بزن.",
      "صفحه‌های ابتدایی را رد کن تا به صفحه ورود برسی.",
      "ایمیل و رمز عبور اکانت را از جزئیات سفارش وارد کن.",
      "کد تأیید دومرحله‌ای را نیز از همان بخش وارد کن.",
      "پس از پایان مراحل، صبر کن تا اکانت با موفقیت به کنسول اضافه شود.",
    ],
  },
  {
    title: "دانلود بازی",
    description: "بازی و نسخه مناسب کنسول را از مجموعه اکانت پیدا کن.",
    icon: Download,
    start: 8,
    steps: [
      "وارد Game Library شو.",
      "از بخش Your Collection بازی خریداری‌شده را انتخاب کن.",
      "اگر چند نسخه نمایش داده شد، نسخه موردنظر را انتخاب کن و دانلود را شروع کن. بعضی بازی‌ها فقط یک نسخه دارند و این انتخاب را نشان نمی‌دهند.",
    ],
  },
]

const CAPACITY_GUIDES = [
  {
    id: "capacity-z1",
    label: "ظرفیت ۱",
    intro: "اشتراک‌گذاری را فعال نگه دار، نصب را کامل کن و سپس آفلاین شو.",
    steps: [
      "مسیر Settings → Users and Accounts → Other → Console Sharing & Offline Play را باز کن.",
      "اشتراک‌گذاری را فعال نگه دار: اگر Enable می‌بینی، آن را انتخاب کن؛ اگر Disable می‌بینی، گزینه Don't Disable را بزن.",
      "پس از شروع دانلود، به اکانت شخصی خودت برو.",
      "صبر کن تا دانلود بازی کامل شود.",
      "دوباره وارد اکانت خریداری‌شده شو و مطمئن شو Console Sharing & Offline Play همچنان Enable است.",
      "به اکانت شخصی برگرد، حدود ۱۰ دقیقه بازی کن و اگر مشکلی نبود، اتصال کنسول به اینترنت را قطع کن.",
    ],
    warningTitle: "پس از آزمایش، آفلاین شو",
    warning:
      "ظرفیت ۱ باید پس از کامل‌شدن نصب و اطمینان از اجرای بازی به‌صورت آفلاین استفاده شود.",
    warningIcon: WifiOff,
    warningClass:
      "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  },
  {
    id: "capacity-z2",
    label: "ظرفیت ۲",
    intro: "اشتراک‌گذاری را فعال نگه دار و بازی را از اکانت شخصی اجرا کن.",
    steps: [
      "مسیر Settings → Users and Accounts → Other → Console Sharing & Offline Play را باز کن.",
      "اشتراک‌گذاری را فعال نگه دار: اگر Enable می‌بینی، آن را انتخاب کن؛ اگر Disable می‌بینی، گزینه Don't Disable را بزن.",
      "پس از شروع دانلود، وارد اکانت شخصی خودت شو.",
      "بازی را از اکانت شخصی اجرا کن.",
      "پس از آن به اکانت خریداری‌شده برنگرد؛ مگر با هماهنگی پشتیبانی.",
    ],
    warningTitle: "به اکانت خریداری‌شده برنگرد",
    warning:
      "پس از راه‌اندازی ظرفیت ۲، ورود دوباره به اکانت خریداری‌شده فقط باید با هماهنگی پشتیبانی انجام شود.",
    warningIcon: ShieldAlert,
    warningClass:
      "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  },
  {
    id: "capacity-z3",
    label: "ظرفیت ۳",
    intro:
      "اشتراک‌گذاری را غیرفعال کن و بازی را فقط از اکانت خریداری‌شده اجرا کن.",
    steps: [
      "مسیر Settings → Users and Accounts → Other → Console Sharing & Offline Play را باز کن.",
      "اشتراک‌گذاری را غیرفعال کن: اگر Don't Enable می‌بینی، آن را انتخاب کن؛ اگر Disable می‌بینی، همان گزینه را بزن.",
      "بازی را فقط از اکانت خریداری‌شده اجرا کن.",
    ],
    warningTitle: "فقط از اکانت خریداری‌شده بازی کن",
    warning:
      "در ظرفیت ۳ نباید بازی را از اکانت شخصی اجرا کنی یا تنظیم Console Sharing را تغییر بدهی.",
    warningIcon: UserRound,
    warningClass: "border-destructive/30 bg-destructive/5 text-destructive",
  },
] as const

function Ps5AccountGuidePage() {
  return (
    <main className="relative min-h-screen bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute right-1/3 -bottom-32 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
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
              className={`border ${platformBadgeClass("ps5")}`}
            >
              PS5
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" />
              ویدیوی ۲ دقیقه و ۲۳ ثانیه‌ای
            </span>
          </div>
          <h1 className="mt-4 text-3xl leading-tight font-black sm:text-5xl">
            افزودن و راه‌اندازی اکانت بازی روی PS5
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            این راهنما برای اکانت‌های ظرفیت ۱، ۲ و ۳ است. ورود و دانلود برای هر
            سه ظرفیت یکسان است؛ تفاوت اصلی در تنظیم Console Sharing & Offline
            Play و نحوه اجرای بازی است.
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
                  اینترنت و اطلاعات کامل اکانت را آماده کن.
                </p>
              </div>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              <PrepItem icon={Wifi} text="کنسول را به اینترنت متصل کن." />
              <PrepItem
                icon={KeyRound}
                text="ایمیل و رمز عبور را از جزئیات سفارش بردار."
              />
              <PrepItem
                icon={CheckCircle2}
                text="کد تأیید دومرحله‌ای را نیز از همان سفارش بردار."
              />
            </ul>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              اگر هر سه مورد ایمیل، رمز عبور و کد تأیید در سفارش قرار نگرفته
              است، مراحل را شروع نکن و با پشتیبانی در ارتباط باش.
            </p>
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

        <section
          id="guide-video"
          aria-labelledby="video-title"
          className="mt-8 scroll-mt-24"
        >
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-xl shadow-primary/5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <PlayCircle className="size-4 text-primary" />
                <h2 id="video-title" className="text-sm font-semibold">
                  آموزش ویدیویی کامل
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">۲:۲۳</span>
            </div>
            <video
              controls
              playsInline
              preload="metadata"
              aria-label="آموزش افزودن اکانت بازی به پلی‌استیشن ۵"
              className="aspect-video w-full bg-background object-contain"
            >
              <source src="/guides/add-account-ps5.mp4" type="video/mp4" />
              مرورگر شما امکان پخش این ویدیو را ندارد. مراحل کامل در ادامه همین
              صفحه نوشته شده‌اند.
            </video>
          </div>
        </section>

        <section aria-labelledby="written-guide" className="mt-14">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">راهنمای متنی</p>
            <h2 id="written-guide" className="mt-2 text-2xl font-bold">
              مراحل مشترک هر سه ظرفیت
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              ابتدا اکانت را اضافه کن و دانلود را شروع کن. سپس فقط بخش مربوط به
              ظرفیت سفارش خودت را انجام بده.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {SHARED_PHASES.map((phase) => (
              <GuidePhaseCard key={phase.title} phase={phase} />
            ))}
          </div>
        </section>

        <section aria-labelledby="sharing-title" className="mt-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">
              تنظیم حساس اکانت
            </p>
            <h2 id="sharing-title" className="mt-2 text-2xl font-bold">
              Console Sharing باید روشن باشد یا خاموش؟
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              متن دکمه به وضعیت فعلی کنسول بستگی دارد. نتیجه نهایی را با ظرفیت
              سفارش خودت تطبیق بده.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <SharingState
              capacities="ظرفیت ۱ و ۲"
              title="Console Sharing باید فعال باشد"
              description="اگر Enable می‌بینی، Enable را بزن. اگر Disable می‌بینی، Don't Disable را انتخاب کن."
              icon={CheckCircle2}
              className="border-emerald-500/30 bg-emerald-500/5"
            />
            <SharingState
              capacities="ظرفیت ۳"
              title="Console Sharing باید غیرفعال باشد"
              description="اگر Don't Enable می‌بینی، همان را بزن. اگر Disable می‌بینی، Disable را انتخاب کن."
              icon={WifiOff}
              className="border-destructive/30 bg-destructive/5"
            />
          </div>
        </section>

        <section aria-labelledby="capacity-title" className="mt-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">مرحله نهایی</p>
            <h2 id="capacity-title" className="mt-2 text-2xl font-bold">
              مراحل مخصوص ظرفیت خریداری‌شده
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              فقط بخش مربوط به ظرفیت سفارش خودت را انجام بده؛ رفتار نهایی هر
              ظرفیت متفاوت است.
            </p>
          </div>

          <nav
            aria-label="انتخاب ظرفیت"
            className="mt-5 flex gap-2 overflow-x-auto pb-1"
          >
            {CAPACITY_GUIDES.map((capacity) => (
              <Button
                key={capacity.id}
                render={<a href={`#${capacity.id}`} />}
                nativeButton={false}
                variant="outline"
                className="shrink-0"
              >
                {capacity.label}
              </Button>
            ))}
          </nav>

          <div className="mt-6 space-y-6">
            {CAPACITY_GUIDES.map((capacity) => {
              const WarningIcon = capacity.warningIcon
              return (
                <article
                  key={capacity.id}
                  id={capacity.id}
                  className="scroll-mt-24 rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{capacity.label}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {capacity.intro}
                      </p>
                    </div>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Settings className="size-5" />
                    </span>
                  </div>

                  <ol className="mt-6 space-y-3">
                    {capacity.steps.map((step, index) => (
                      <Step key={step} number={index + 11} text={step} />
                    ))}
                  </ol>

                  <div
                    className={`mt-6 flex items-start gap-3 rounded-xl border p-4 ${capacity.warningClass}`}
                  >
                    <WarningIcon className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">
                        {capacity.warningTitle}
                      </p>
                      <p className="mt-1 text-sm leading-7 text-foreground/80">
                        {capacity.warning}
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="mt-14 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center backdrop-blur-sm">
          <ShieldAlert className="mx-auto size-7 text-destructive" />
          <h2 className="mt-3 text-lg font-bold">تنظیمات اکانت را تغییر نده</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            اکانت را حذف نکن و اطلاعات ورود یا تنظیمات آن را بدون هماهنگی
            پشتیبانی تغییر نده؛ در غیر این صورت مسئولیت مشکلات احتمالی بر عهده
            کاربر خواهد بود.
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

function SharingState({
  capacities,
  title,
  description,
  icon: Icon,
  className,
}: {
  capacities: string
  title: string
  description: string
  icon: LucideIcon
  className: string
}) {
  return (
    <article className={`rounded-2xl border p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            {capacities}
          </p>
          <h3 className="mt-1 font-bold">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-foreground/80">
            {description}
          </p>
        </div>
      </div>
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
