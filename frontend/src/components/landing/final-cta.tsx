import { Link } from "@tanstack/react-router"
import { ArrowLeft, Gamepad2, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-background px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-border/60 bg-card/85 px-6 py-14 sm:px-12 sm:py-16">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
            <Gamepad2 className="size-3.5" />
            بازی امروز
            <ArrowLeft className="size-3" />
            <RefreshCcw className="size-3.5" />
            اعتبار بازی بعدی
          </div>
          <h2 className="mt-6 text-3xl leading-[1.45] font-black sm:text-4xl">
            بازی بعدی لازم نیست از صفر شروع بشه.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            بازی‌ای که دنبالش بودی رو پیدا کن. اگر امروز توی کاتالوگ نبود،
            به‌زودی دوباره سر بزن—انتخاب‌ها هر روز بیشتر می‌شن.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <Button
              render={<Link to="/games" search={GAMES_DEFAULT_SEARCH} />}
              nativeButton={false}
              size="lg"
              className="h-11 gap-2 px-6"
            >
              رفتن به فروشگاه
              <ArrowLeft className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
