import { Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Check,
  CircleDollarSign,
  Film,
  Gamepad2,
  WalletCards,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const STEPS = [
  {
    icon: Gamepad2,
    title: "بازی رو تموم کن",
    desc: "اگر بازی برچسب «قابل بازگشت» داشته باشه، می‌تونی اکانتش رو به ما بفروشی.",
  },
  {
    icon: Film,
    title: "خروج از اکانت رو ثبت کن",
    desc: "یک ویدیوی پیوسته از حذف اکانت می‌فرستی تا مالکیت با خیال راحت منتقل بشه.",
  },
  {
    icon: WalletCards,
    title: "برای بازی بعدی اعتبار بگیر",
    desc: "بعد از تأیید، اعتبار مستقیم به کیف پول Z-Games اضافه می‌شه.",
  },
] as const

export function BuyBack() {
  return (
    <section
      id="buy-back"
      className="relative scroll-mt-20 overflow-hidden bg-background py-16 sm:py-24"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="relative order-2 mx-auto w-full max-w-xl lg:max-w-none">
            <div className="rounded-3xl border border-border/60 bg-card/85 p-4 sm:p-6">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-5 sm:p-7">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <Badge variant="secondary">قابل بازگشت</Badge>
                    <p className="mt-4 text-xl font-bold">
                      ارزش بازی از بین نمی‌ره
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      بازی تموم شده، اما می‌تونه هزینه‌ی بازی بعدی رو کمتر کنه.
                    </p>
                  </div>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <CircleDollarSign className="size-5" />
                  </div>
                </div>

                <div className="my-7 h-px bg-border/60" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">مبنای محاسبه</span>
                    <span className="font-semibold">قیمت روز بازی</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">محل دریافت</span>
                    <span className="font-semibold">کیف پول Z-Games</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">کاربرد</span>
                    <span className="font-semibold">هر خرید بعدی</span>
                  </div>
                </div>

                <div className="mt-7 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 p-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-4" />
                  </span>
                  <p className="text-sm font-medium">
                    یک بازی کمتر در کتابخانه، یک بازی جدید نزدیک‌تر
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1">
            <p className="text-sm font-semibold text-primary">بازخرید اکانت</p>
            <h2 className="mt-3 max-w-2xl text-3xl leading-[1.45] font-black sm:text-4xl">
              هزینه‌ی واقعی بازی، قیمتی نیست که روز اول می‌بینی.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              بیشتر فروشگاه‌ها بعد از خرید، کارشون با تو تموم می‌شه. اینجا اگر
              بازی واجد شرایط باشه، بعد از تموم کردنش اکانت رو پس می‌گیریم و
              بخشی از ارزش روزش رو برای انتخاب بعدی به کیف پولت برمی‌گردونیم.
            </p>

            <div className="mt-8 space-y-5">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/85 text-primary">
                    <step.icon className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {(index + 1).toLocaleString("fa-IR")}
                      </span>
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button
                render={<Link to="/buyback" search={{ page: 1 }} />}
                nativeButton={false}
                className="h-10 gap-2 px-5"
              >
                جزئیات و بازی‌های قابل بازخرید
                <ArrowLeft className="size-4" />
              </Button>
              <p className="max-w-md text-xs leading-5 text-muted-foreground">
                اعتبار بر اساس قیمت روز محاسبه می‌شود. در حالت عادی ۲۵٪ کارمزد
                کسر می‌شود و اعتبار کیف پول قابل برداشت نقدی نیست.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
