import { Check, Infinity as InfinityIcon } from "lucide-react"

type Tier = {
  badge: string
  name: string
  tagline: string
  features: string[]
  highlighted?: boolean
}

const TIERS: Tier[] = [
  {
    badge: "محبوب‌ترین",
    name: "ظرفیت دوم",
    tagline: "بازی برای همیشه روی کنسول خودت — حتی آفلاین.",
    features: [
      "اکانت رو روی کنسولت primary می‌کنی",
      "بازی به‌صورت دائمی نصب می‌مونه، حتی بدون اینترنت",
      "هم‌زمان با اکانت خودت هم می‌تونی بازی کنی",
      "گارانتی مادام‌العمر",
    ],
    highlighted: true,
  },
  {
    badge: "مقرون‌به‌صرفه",
    name: "ظرفیت سوم",
    tagline: "همون بازی، با قیمت کمتر.",
    features: [
      "مستقیم روی اکانت ارائه‌شده بازی می‌کنی",
      "بدون نیاز به primary کردن کنسول",
      "برای بازی باید آنلاین بمونی",
      "گارانتی مادام‌العمر",
    ],
  },
]

export function Tiers() {
  return (
    <section className="relative bg-background bg-grid-lines py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            ظرفیت چیه و کدوم رو بگیرم؟
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            هر بازی رو می‌تونی با یکی از دو ظرفیت بگیری. هر دو گارانتی
            مادام‌العمر دارن — فقط نحوه‌ی دسترسی فرق می‌کنه.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border bg-card/75 p-7 backdrop-blur-sm ${
                tier.highlighted
                  ? "border-primary/40 ring-1 ring-primary/20"
                  : "border-border/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    tier.highlighted
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {tier.badge}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {tier.tagline}
              </p>

              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => {
                  const isGuarantee = f.includes("گارانتی")
                  const Icon = isGuarantee ? InfinityIcon : Check
                  return (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Icon
                        className={`mt-0.5 size-4 shrink-0 ${
                          isGuarantee ? "text-violet-400" : "text-primary"
                        }`}
                      />
                      <span
                        className={
                          isGuarantee
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {f}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted-foreground/80">
          مطمئن نیستی کدوم برات بهتره؟ ظرفیت دوم برای تجربه‌ی کامل و بدون دغدغه،
          و ظرفیت سوم برای صرفه‌جویی بیشتر مناسبه.
        </p>
      </div>
    </section>
  )
}
