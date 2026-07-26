import { Check, Gamepad2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { familyTextClass, platformBadgeClass } from "@/features/games"

const PLAYSTATION_OPTIONS = [
  { name: "Z1", desc: "تزریق مستقیم بازی؛ اقتصادی و بدون گارانتی" },
  { name: "Z2", desc: "اجرا با پروفایل خودت؛ قابل استفاده آفلاین" },
  { name: "Z3", desc: "اجرا روی اکانت ارائه‌شده؛ نیازمند اینترنت" },
] as const

const XBOX_OPTIONS = [
  { name: "Home", desc: "کنسول به‌عنوان Home تنظیم می‌شه؛ دسترسی دائمی" },
  { name: "Switch", desc: "ورود به اکانت ارائه‌شده؛ نیازمند اینترنت" },
] as const

export function Tiers() {
  return (
    <section className="relative overflow-hidden bg-background bg-grid-lines py-16 sm:py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-primary">
            انتخاب درست، قبل از خرید
          </p>
          <h2 className="mt-3 text-3xl leading-[1.45] font-black sm:text-4xl">
            هر کنسول، روش‌های دسترسی خودش رو داره.
          </h2>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            یک لیست مشترک و گیج‌کننده نداریم. گزینه‌هایی که می‌بینی مخصوص همان
            کنسول و همان بازی‌اند؛ چه PlayStation داشته باشی، چه Xbox.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <PlatformCard
            family="playstation"
            title="PlayStation"
            consoles={[
              { code: "ps4", label: "PS4" },
              { code: "ps5", label: "PS5" },
            ]}
            options={PLAYSTATION_OPTIONS}
          />
          <PlatformCard
            family="xbox"
            title="Xbox"
            consoles={[
              { code: "xbox_one", label: "Xbox One" },
              { code: "xbox_series", label: "Xbox Series X|S" },
            ]}
            options={XBOX_OPTIONS}
          />
        </div>

        <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-6 text-muted-foreground">
          همه‌ی بازی‌ها روی همه‌ی کنسول‌ها یا با همه‌ی روش‌های دسترسی عرضه
          نمی‌شن. گزینه‌های دقیق، قیمت و شرایط پشتیبانی قبل از خرید در صفحه‌ی هر
          بازی نمایش داده می‌شه.
        </p>
      </div>
    </section>
  )
}

type PlatformCardProps = {
  family: "playstation" | "xbox"
  title: string
  consoles: ReadonlyArray<{ code: string; label: string }>
  options: ReadonlyArray<{ name: string; desc: string }>
}

function PlatformCard({ family, title, consoles, options }: PlatformCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/85 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/60">
            <Gamepad2 className={`size-5 ${familyTextClass(family)}`} />
          </div>
          <div>
            <p className={`text-lg font-bold ${familyTextClass(family)}`}>
              {title}
            </p>
            <p className="text-xs text-muted-foreground">
              گزینه‌های مخصوص این خانواده
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {consoles.map((console) => (
            <Badge
              key={console.code}
              variant="outline"
              className={platformBadgeClass(console.code)}
            >
              {console.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-7 space-y-3">
        {options.map((option) => (
          <div
            key={option.name}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-4"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-3.5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{option.name}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {option.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
