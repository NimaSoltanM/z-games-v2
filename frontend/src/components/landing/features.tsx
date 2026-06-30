import { ShieldCheck, Zap, Lock, BadgeCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type Feature = {
  icon: LucideIcon
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  {
    icon: ShieldCheck,
    title: "گارانتی مادام‌العمر",
    desc: "اگه روی اکانت مشکلی پیش بیاد، بدون هیچ هزینه‌ای برات تعویضش می‌کنیم. خیالت راحت.",
  },
  {
    icon: Zap,
    title: "تحویل سریع",
    desc: "بعد از پرداخت، سفارشت در سریع‌ترین زمان آماده و اطلاعات اکانت تحویل داده می‌شه.",
  },
  {
    icon: Lock,
    title: "پرداخت امن",
    desc: "تمام پرداخت‌ها از طریق درگاه رسمی و مطمئن زرین‌پال انجام می‌شه.",
  },
  {
    icon: BadgeCheck,
    title: "بازی اورجینال",
    desc: "بازی‌ها روی اکانت‌های واقعی و معتبر ارائه می‌شن — بدون کرک و دردسر.",
  },
]

export function Features() {
  return (
    <section className="relative bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">چرا Z-Games؟</h2>
          <p className="mt-4 text-base text-muted-foreground">
            خرید مطمئن، با خیال راحت — از اول تا آخر.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-sm transition-colors hover:border-primary/40"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
