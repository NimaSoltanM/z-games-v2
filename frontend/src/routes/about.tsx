import { createFileRoute, Link } from "@tanstack/react-router"
import { BadgeCheck, Gamepad2, Headphones, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"
import { seoHead } from "@/features/seo"

export const Route = createFileRoute("/about")({
  head: () =>
    seoHead({
      title: "درباره زد گیمز؛ فروشگاه اکانت بازی PlayStation و Xbox",
      description:
        "با شیوه کار زد گیمز، پشتیبانی پس از خرید، کاتالوگ رو‌به‌رشد و امکان بازخرید اکانت بازی‌های واجد شرایط آشنا شوید.",
      path: "/about",
    }),
  component: AboutPage,
})

function AboutPage() {
  const values = [
    {
      icon: Headphones,
      title: "پشتیبانی بعد از پرداخت تمام نمی‌شود",
      text: "تحویل و پشتیبانی سفارش‌ها توسط تیم فروشگاه پیگیری می‌شود. برای بیشتر اکانت‌ها پشتیبانی مادام‌العمر ارائه می‌شود؛ شرایط دقیق همان محصول و سفارش ملاک است.",
    },
    {
      icon: RefreshCcw,
      title: "یک بازی می‌تواند بخشی از هزینه بازی بعدی باشد",
      text: "بازی‌های واجد شرایط پس از بررسی قابل بازخریدند و اعتبار تأییدشده برای خرید بعدی به کیف پول فروشگاه برمی‌گردد.",
    },
    {
      icon: BadgeCheck,
      title: "تهیه بازی با گیفت‌کارت قانونی",
      text: "بازی‌ها با گیفت‌کارت قانونی تهیه می‌شوند. زد گیمز شریک رسمی Sony یا Microsoft نیست و ادعای نمایندگی رسمی ندارد.",
    },
    {
      icon: Gamepad2,
      title: "کاتالوگی فراتر از چند عنوان روز",
      text: "در کنار بازی‌های جدید و محبوب، عنوان‌های قدیمی‌تر و کم‌یاب‌تر هم به کاتالوگ اضافه می‌شوند و فهرست به‌مرور گسترش پیدا می‌کند.",
    },
  ]

  return (
    <main className="min-h-screen bg-background bg-grid-lines">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">درباره ما</p>
          <h1 className="mt-3 text-4xl leading-tight font-black sm:text-5xl">
            زد گیمز برای خرید یک‌باره ساخته نشده؛ برای چرخه بازی بعدی ساخته شده.
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            زد گیمز فروشگاه فارسی اکانت بازی برای PS4، PS5، Xbox One و Xbox
            Series X|S است. هدف ما این است که انتخاب بازی، تحویل اکانت و
            پشتیبانی بعد از خرید روشن و قابل پیگیری باشد.
          </p>
        </header>

        <section aria-labelledby="our-values" className="mt-14">
          <h2 id="our-values" className="text-2xl font-bold">
            چیزی که برای ما مهم است
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <article
                key={value.title}
                className="rounded-2xl border border-border/60 bg-card/70 p-6"
              >
                <value.icon className="size-6 text-primary" />
                <h3 className="mt-4 font-bold">{value.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {value.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button
            render={<Link to="/games" search={GAMES_DEFAULT_SEARCH} />}
            nativeButton={false}
          >
            مشاهده بازی‌ها
          </Button>
          <Button
            render={<Link to="/how-it-works" />}
            nativeButton={false}
            variant="outline"
          >
            خرید چطور انجام می‌شود؟
          </Button>
          <Button
            render={<Link to="/dashboard/support" search={{ page: 1 }} />}
            nativeButton={false}
            variant="outline"
          >
            <Headphones className="size-4" />
            ارتباط با پشتیبانی
          </Button>
        </div>
      </div>
    </main>
  )
}
