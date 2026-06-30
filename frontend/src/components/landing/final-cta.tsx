import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"

export function FinalCta() {
  return (
    <section className="relative bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/75 px-6 py-16 text-center backdrop-blur-sm sm:px-12">
          {/* ambient glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-1/4 -bottom-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl leading-tight font-bold sm:text-4xl">
              آماده‌ای بازی رو شروع کنی؟
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              بازی دلخواهت رو انتخاب کن، امن پرداخت کن و با خیال راحت بازی کن —
              با گارانتی مادام‌العمر.
            </p>
            <div className="mt-8 flex items-center justify-center">
              <Link to="/games" search={GAMES_DEFAULT_SEARCH}>
                <Button size="lg" className="h-11 gap-2 px-6 text-sm">
                  مشاهده بازی‌ها
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
