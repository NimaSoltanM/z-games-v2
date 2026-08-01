import {
  BadgeCheck,
  Headphones,
  Infinity as InfinityIcon,
  ScanSearch,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

type Feature = {
  icon: LucideIcon
  eyebrow: string
  title: string
  desc: string
  wide?: boolean
  full?: boolean
}

const FEATURES: Feature[] = [
  {
    icon: Headphones,
    eyebrow: "قبل و بعد خرید",
    title: "پشتیبانی واقعی، نه یک شماره برای خالی نبودن صفحه",
    desc: "برای انتخاب نوع اکانت، راه‌اندازی روی کنسول یا مشکلی که بعداً پیش بیاد، تنها نمی‌مونی. هدف پشتیبانی فقط بستن تیکت نیست؛ باید بتونی بازی کنی.",
    wide: true,
  },
  {
    icon: InfinityIcon,
    eyebrow: "تعهد بلندمدت",
    title: "پشتیبانی مادام‌العمر برای ۹۰٪ اکانت‌ها",
    desc: "پوشش هر اکانت قبل از خرید مشخصه. اگر شامل پشتیبانی مادام‌العمر باشه، تعهدمون با تحویل سفارش تموم نمی‌شه.",
  },
  {
    icon: BadgeCheck,
    eyebrow: "منبع قانونی",
    title: "خرید از استور رسمی با گیفت‌کارت قانونی",
    desc: "بازی‌ها کرکی یا دستکاری‌شده نیستن. اکانتی وارد کنسولت می‌کنی که بازی روی اون به‌شکل قانونی تهیه شده.",
  },
  {
    icon: ScanSearch,
    eyebrow: "بررسی انسانی",
    title: "هر سفارش قبل از تحویل بررسی می‌شه",
    desc: "اطلاعات اکانت و نوع دسترسی با سفارش تطبیق داده می‌شه تا چیزی که تحویل می‌گیری همون انتخابی باشه که خریدی.",
    full: true,
  },
]

export function Features() {
  return (
    <section className="relative bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-primary">
            خریدی که پشتش آدم هست
          </p>
          <h2 className="mt-3 text-3xl leading-[1.45] font-black sm:text-4xl">
            اعتماد با لوگوی درگاه ساخته نمی‌شه.
          </h2>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            چیزی که مهمه، اصالت اکانت و مسئولیتی‌ست که قبل و بعد از تحویل قبول
            می‌کنیم.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className={`group rounded-2xl border border-border/60 bg-card/85 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md ${
                feature.full
                  ? "lg:col-span-4"
                  : feature.wide
                    ? "lg:col-span-2"
                    : ""
              }`}
            >
              <div className="flex items-start justify-between gap-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <feature.icon className="size-5" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {feature.eyebrow}
                </span>
              </div>
              <h3 className="mt-6 text-lg leading-7 font-bold">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
