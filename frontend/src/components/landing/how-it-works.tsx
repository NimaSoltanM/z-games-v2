import { Gamepad2, KeyRound, Search, Undo2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type Step = {
  icon: LucideIcon
  title: string
  desc: string
}

const STEPS: Step[] = [
  {
    icon: Search,
    title: "بازی رو پیدا کن",
    desc: "بین عنوان‌های PlayStation و Xbox جست‌وجو کن؛ کاتالوگ هر روز بزرگ‌تر می‌شه.",
  },
  {
    icon: Gamepad2,
    title: "کنسول و نوع اکانت رو انتخاب کن",
    desc: "فقط گزینه‌های سازگار با کنسولت نمایش داده می‌شن و شرایط هرکدوم همون‌جا نوشته شده.",
  },
  {
    icon: KeyRound,
    title: "اکانت بررسی‌شده رو تحویل بگیر",
    desc: "سفارش به‌صورت دستی آماده می‌شه و اطلاعات دقیق اکانت در داشبوردت قرار می‌گیره.",
  },
  {
    icon: Undo2,
    title: "بازی کن؛ اگر خواستی برگردون",
    desc: "برای بازی‌های واجد شرایط، بعد از اتمام بازی درخواست بازگشت ثبت کن و اعتبار بگیر.",
  },
]

export function HowItWorks() {
  return (
    <section className="relative border-y border-border/50 bg-background bg-grid-lines py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">
              از انتخاب تا بازی بعدی
            </p>
            <h2 className="mt-3 text-3xl leading-[1.45] font-black sm:text-5xl">
              یک مسیر روشن، بدون حدس زدن.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">
            قبل از خرید می‌دونی چه چیزی برای کنسولت مناسبه، بعد از خرید می‌دونی
            سفارشت کجاست و بعد از تموم کردن بازی هم یک انتخاب دیگه داری.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm"
            >
              <span className="absolute -top-3 -left-1 text-7xl leading-none font-black text-foreground/5 tabular-nums">
                {(index + 1).toLocaleString("fa-IR")}
              </span>
              <div className="relative">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <step.icon className="size-4" />
                </div>
                <h3 className="mt-5 text-base leading-7 font-bold">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
