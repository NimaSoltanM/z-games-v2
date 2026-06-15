import { ListChecks, CreditCard, KeyRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type Step = {
  icon: LucideIcon
  title: string
  desc: string
}

const STEPS: Step[] = [
  {
    icon: ListChecks,
    title: "بازی و ظرفیت رو انتخاب کن",
    desc: "بین بازی‌های PS4 و PS5 بگرد، بازی دلخواهت رو پیدا کن و ظرفیت مناسب (دوم یا سوم) رو انتخاب کن.",
  },
  {
    icon: CreditCard,
    title: "امن پرداخت کن",
    desc: "پرداخت از طریق درگاه مطمئن زرین‌پال انجام می‌شه؛ سریع، رمزنگاری‌شده و بدون واسطه.",
  },
  {
    icon: KeyRound,
    title: "اکانت رو بگیر و بازی کن",
    desc: "اطلاعات اکانت توی صفحه‌ی سفارش‌هات قرار می‌گیره. روی کنسولت فعالش کن و بازی رو شروع کن.",
  },
]

export function HowItWorks() {
  return (
    <section className="relative bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">چطور کار می‌کنه؟</h2>
          <p className="mt-4 text-base text-muted-foreground">
            سه قدم ساده از انتخاب تا بازی کردن — بدون پیچیدگی.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm"
            >
              <span className="absolute end-5 top-5 text-5xl font-bold leading-none text-foreground/5 tabular-nums">
                {i + 1}
              </span>
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <step.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
