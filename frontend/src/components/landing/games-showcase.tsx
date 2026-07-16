import { Link } from "@tanstack/react-router"
import { ArrowLeft, CalendarPlus, Search, Shapes } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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

const rotate = (arr: string[], n: number) =>
  arr.map((_, i) => arr[(i + n) % arr.length])
const MARQUEE_IMAGES = [0, 2, 4, 6].flatMap((offset) => rotate(COVERS, offset))

const CATALOG_POINTS = [
  { icon: CalendarPlus, label: "بازی‌های تازه، هر روز" },
  { icon: Shapes, label: "جدید، کلاسیک و کمتر دیده‌شده" },
  { icon: Search, label: "جست‌وجو بین همه‌ی پلتفرم‌ها" },
] as const

export function GamesShowcase() {
  return (
    <section className="relative flex min-h-[42rem] w-full items-center justify-center overflow-hidden border-y border-border/50 bg-background sm:min-h-[48rem]">
      <ThreeDMarquee
        className="pointer-events-none absolute inset-0 h-full w-full"
        images={MARQUEE_IMAGES}
      />
      <div className="absolute inset-0 z-10 bg-background/85" />
      <div className="absolute inset-x-0 top-0 z-10 h-40 bg-linear-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 h-40 bg-linear-to-t from-background to-transparent" />

      <div className="relative z-20 mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <Badge
          variant="outline"
          className="border-border/60 bg-background/60 px-3 backdrop-blur-sm"
        >
          کاتالوگی که متوقف نمی‌شه
        </Badge>
        <h2 className="mt-5 text-3xl leading-[1.45] font-black sm:text-5xl">
          فقط بازی‌های ترند رو نمی‌فروشیم.
          <br />
          <span className="text-muted-foreground">دنبال انتخاب خودت بگرد.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
          خیلی از فروشگاه‌ها به چند عنوان جدید و معروف محدود می‌شن. ما هر روز
          کاتالوگ رو بزرگ‌تر می‌کنیم؛ از انتشارهای روز تا بازی‌های قدیمی‌تر و
          انتخاب‌های خاص‌تر برای PlayStation و Xbox.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {CATALOG_POINTS.map((point) => (
            <span
              key={point.label}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm"
            >
              <point.icon className="size-3.5 text-primary" />
              {point.label}
            </span>
          ))}
        </div>

        <div className="mt-9 flex items-center justify-center">
          <Button
            render={<Link to="/games" search={GAMES_DEFAULT_SEARCH} />}
            nativeButton={false}
            size="lg"
            className="h-11 gap-2 px-6"
          >
            جست‌وجو در همه‌ی بازی‌ها
            <ArrowLeft className="size-4" />
          </Button>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          بازی مدنظرت امروز نیست؟ دوباره سر بزن؛ عنوان‌های جدید روزانه اضافه
          می‌شن.
        </p>
      </div>
    </section>
  )
}
