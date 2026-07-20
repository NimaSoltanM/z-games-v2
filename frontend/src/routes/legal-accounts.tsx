import { createFileRoute, Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"
import { seoHead } from "@/features/seo"

export const Route = createFileRoute("/legal-accounts")({
  head: () =>
    seoHead({
      title: "اکانت قانونی بازی چیست؟ راهنمای PlayStation و Xbox | زد گیمز",
      description:
        "اکانت قانونی بازی، تفاوت آن با دیسک و کد، ظرفیت‌های PlayStation و انواع Home و Switch در Xbox و نکات ورود امن را بشناسید.",
      path: "/legal-accounts",
    }),
  component: LegalAccountsPage,
})

function LegalAccountsPage() {
  return (
    <main className="min-h-screen bg-background bg-grid-lines">
      <article className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-primary">راهنمای اکانت بازی</p>
        <h1 className="mt-3 text-4xl leading-tight font-black sm:text-5xl">
          اکانت قانونی بازی چیست و دقیقاً چه چیزی تحویل می‌گیری؟
        </h1>
        <p className="mt-5 text-base leading-8 text-muted-foreground">
          در زد گیمز محصول، دسترسی به اکانتی است که بازی روی آن با گیفت‌کارت
          قانونی تهیه شده؛ دیسک فیزیکی یا کد فعال‌سازی مستقل تحویل نمی‌شود.
          اطلاعات لازم پس از بررسی سفارش در داشبوردت قرار می‌گیرد.
        </p>

        <div className="mt-12 space-y-5">
          <section className="rounded-2xl border border-border/60 bg-card/70 p-6">
            <h2 className="text-xl font-bold">ظرفیت‌های PlayStation</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              PS4 و PS5 در کاتالوگ زد گیمز می‌توانند ظرفیت ۱، ۲ یا ۳ داشته
              باشند. روش اجرا، نیاز به آنلاین ماندن و سطح پشتیبانی در هر ظرفیت
              فرق دارد؛ توضیح دقیق کنار گزینه خرید همان بازی نمایش داده می‌شود.
            </p>
          </section>
          <section className="rounded-2xl border border-border/60 bg-card/70 p-6">
            <h2 className="text-xl font-bold">Home و Switch در Xbox</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              برای Xbox One و Xbox Series X|S گزینه‌های Home و Switch ارائه
              می‌شوند. Home اکانت اصلی روی کنسول را در نظر می‌گیرد و Switch با
              ورود به اکانت ارائه‌شده و آنلاین ماندن استفاده می‌شود.
            </p>
          </section>
          <section className="rounded-2xl border border-border/60 bg-card/70 p-6">
            <h2 className="text-xl font-bold">ورود و نگهداری امن</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              اطلاعات ورود را فقط داخل حساب کاربری خودت ببین و برای شخص دیگری
              نفرست. مراحل ظرفیت انتخابی را دقیق انجام بده و اگر دوباره به کد
              تأیید نیاز داشتی، درخواست را از همان سفارش ثبت کن تا مدیر کد تازه
              را ارسال کند.
            </p>
          </section>
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <h2 className="text-xl font-bold">یک نکته شفاف</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              زد گیمز فروشنده مستقل است و شریک یا نماینده رسمی Sony و Microsoft
              نیست. عبارت «قانونی» به شیوه تهیه بازی با گیفت‌کارت قانونی اشاره
              دارد، نه نمایندگی رسمی سازنده کنسول.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
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
            مراحل خرید
          </Button>
        </div>
      </article>
    </main>
  )
}
