import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThreeDMarquee } from "@/components/ui/3d-marquee"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"

const COVERS = [
  "/3d-marquee/gow-ragnarok.webp",
  "/3d-marquee/ghost-of-yotei.webp",
  "/3d-marquee/re9.jpg",
  "/3d-marquee/doom-eternal.jpg",
  "/3d-marquee/fc26.webp",
  "/3d-marquee/ds2.jpg",
  "/3d-marquee/dl-beast.jpg",
  "/3d-marquee/withcer3.png",
]

// Rotate the covers per column so the four columns don't show the same order.
const rotate = (arr: string[], n: number) => arr.map((_, i) => arr[(i + n) % arr.length])
const MARQUEE_IMAGES = [0, 2, 4, 6].flatMap((offset) => rotate(COVERS, offset))

export function GamesShowcase() {
  return (
    <section className="relative flex h-[36rem] w-full items-center justify-center overflow-hidden bg-background sm:h-[44rem]">
      <ThreeDMarquee
        className="pointer-events-none absolute inset-0 h-full w-full"
        images={MARQUEE_IMAGES}
      />
      {/* dim the wall so the copy stays readable, theme-aware */}
      <div className="absolute inset-0 z-10 bg-background/80" />

      <div className="relative z-20 mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="bg-gradient-to-b from-foreground to-foreground/55 bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-5xl">
          صدها بازی،{" "}
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            یک‌جا
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          از بازی‌های روز تا کلاسیک‌های محبوب — برای PS4 و PS5، با قیمتی که فقط
          اینجا پیدا می‌کنی.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link to="/games" search={GAMES_DEFAULT_SEARCH}>
            <Button size="lg" className="h-11 gap-2 px-6 text-sm">
              مشاهده همه بازی‌ها
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
