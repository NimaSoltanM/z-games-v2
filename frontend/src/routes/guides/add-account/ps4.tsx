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
  Wifi,
  WifiOff,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { platformBadgeClass } from "@/features/games"
import { seoHead } from "@/features/seo"

export const Route = createFileRoute("/guides/add-account/ps4")({
  head: () =>
    seoHead({
      title: "آموزش ورود و فعال‌سازی اکانت روی PS4 | زد گیمز",
      description:
        "آموزش ویدیویی و مرحله‌به‌مرحله افزودن اکانت بازی به PS4، دانلود بازی و تنظیم صحیح ظرفیت‌های ۱، ۲ و ۳.",
      path: "/guides/add-account/ps4",
    }),
  component: Ps4AccountGuidePage,
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
    description: "ابتدا یک کاربر جدید برای اکانت خریداری‌شده بساز.",
    icon: LogIn,
    start: 1,
    steps: [
      "وارد Settings شو.",
      "گزینه Login Settings را انتخاب کن.",
      "وارد User Management شو.",
      "گزینه Create User را انتخاب کن.",
      "ایمیل و رمز عبور اکانت خریداری‌شده را وارد کن.",
      "اگر کد تأیید خواسته شد، کد را از جزئیات سفارش دریافت کن و وارد کن.",
      "اگر پیام تغییر دستگاه نمایش داده شد، برای ظرفیت ۱ و ۲ گزینه Change To This Device و برای ظرفیت ۳ گزینه Do Not Change را انتخاب کن.",
      "دکمه PS را نگه دار و از مسیر Power → Switch User وارد اکانت خریداری‌شده شو.",
    ],
  },
  {
    title: "افزودن بازی به دانلود",
    description: "دانلود را موقتاً متوقف کن تا تنظیم ظرفیت را انجام بدهی.",
    icon: Download,
    start: 9,
    steps: [
      "وارد Library شو.",
      "در بخش Purchased، بازی موردنظر را به فهرست دانلود اضافه کن.",
      "از مسیر Notifications → Downloads دانلود را روی Pause قرار بده.",
    ],
  },
]

const CAPACITY_GUIDES = [
  {
    id: "capacity-z1",
    label: "ظرفیت ۱",
    intro: "اکانت را Primary کن و نصب را در مهلت اعلام‌شده کامل کن.",
    steps: [
      "وارد Settings → Account Management شو.",
      "گزینه Activate as Your Primary PS4 را انتخاب کن.",
      "گزینه Activate را بزن.",
      "گزینه Restore Licenses را اجرا کن.",
      "به Downloads برگرد و دانلود بازی را از حالت Pause خارج کن.",
    ],
    warningTitle: "مهلت نصب ظرفیت ۱",
    warning:
      "برای نصب بازی فقط ۲۴ ساعت فرصت داری. پس از کامل‌شدن نصب، اتصال کنسول به اینترنت را قطع کن؛ در غیر این صورت ممکن است بازی قفل شود.",
    warningIcon: WifiOff,
    warningClass:
      "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  },
  {
    id: "capacity-z2",
    label: "ظرفیت ۲",
    intro: "اکانت را Primary کن و سپس دانلود را ادامه بده.",
    steps: [
      "وارد Settings → Account Management شو.",
      "گزینه Activate as Your Primary PS4 را انتخاب کن.",
      "گزینه Activate را بزن.",
      "گزینه Restore Licenses را اجرا کن.",
      "به Downloads برگرد و دانلود بازی را از حالت Pause خارج کن.",
    ],
    warningTitle: "تنظیم نهایی ظرفیت ۲",
    warning:
      "پس از اجرای Restore Licenses و شروع دوباره دانلود، مراحل راه‌اندازی اکانت کامل است.",
    warningIcon: CheckCircle2,
    warningClass:
      "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "capacity-z3",
    label: "ظرفیت ۳",
    intro: "اکانت نباید روی دستگاه تو به‌عنوان Primary فعال بماند.",
    steps: [
      "وارد Settings → Account Management شو.",
      "گزینه Activate as Your Primary PS4 را باز کن.",
      "اگر گزینه Deactivate نمایش داده می‌شود، آن را انتخاب کن. در پایان باید گزینه Activate را ببینی؛ آن را انتخاب نکن.",
      "گزینه Restore Licenses را اجرا کن.",
      "به Downloads برگرد و دانلود بازی را از حالت Pause خارج کن.",
    ],
    warningTitle: "از اکانت خارج نشو",
    warning:
      "به‌هیچ‌عنوان از اکانت Sign Out نکن. بازی ظرفیت ۳ فقط از همین اکانت و با اتصال اینترنت اجرا می‌شود.",
    warningIcon: Wifi,
    warningClass: "border-destructive/30 bg-destructive/5 text-destructive",
  },
] as const

function Ps4AccountGuidePage() {
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
              className={`border ${platformBadgeClass("ps4")}`}
            >
              PS4
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" />
              ویدیوی ۲ دقیقه‌ای
            </span>
          </div>
          <h1 className="mt-4 text-3xl leading-tight font-black sm:text-5xl">
            افزودن و راه‌اندازی اکانت بازی روی PS4
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            این راهنما برای اکانت‌های ظرفیت ۱، ۲ و ۳ است. مراحل ورود و دانلود
            برای هر سه ظرفیت یکسان‌اند؛ تفاوت مهم در تنظیم نهایی اکانت است.
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
                  این سه مورد را آماده کن تا وسط کار متوقف نشوی.
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
                text="اگر کد تأیید خواسته شد، آن را از همان سفارش دریافت کن."
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
              <span className="text-xs text-muted-foreground">۲:۰۱</span>
            </div>
            <video
              controls
              playsInline
              preload="metadata"
              aria-label="آموزش افزودن اکانت بازی به پلی‌استیشن ۴"
              className="aspect-video w-full bg-background object-contain"
            >
              <source src="/guides/add-account-ps4.mp4" type="video/mp4" />
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
              ابتدا این مراحل را انجام بده. پس از متوقف‌کردن موقت دانلود، تنظیم
              مخصوص ظرفیت خریداری‌شده را از بخش بعدی ادامه بده.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {SHARED_PHASES.map((phase) => (
              <GuidePhaseCard key={phase.title} phase={phase} />
            ))}
          </div>
        </section>

        <section aria-labelledby="capacity-title" className="mt-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">مرحله نهایی</p>
            <h2 id="capacity-title" className="mt-2 text-2xl font-bold">
              تنظیم مخصوص ظرفیت خریداری‌شده
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              فقط بخش مربوط به ظرفیت سفارش خودت را انجام بده. انتخاب اشتباه در
              این مرحله می‌تواند دسترسی به بازی را مختل کند.
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
                      <Step key={step} number={index + 12} text={step} />
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

        <aside className="mt-14 rounded-2xl border border-border/60 bg-card/75 p-6 text-center backdrop-blur-sm">
          <Gamepad2 className="mx-auto size-7 text-primary" />
          <h2 className="mt-3 text-lg font-bold">
            صفحه کنسول با این مراحل یکی نیست؟
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            ادامه نده و گزینه‌ای را حدس نزن. به جزئیات سفارش برگرد و از همان‌جا
            موضوع را با پشتیبانی پیگیری کن.
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
