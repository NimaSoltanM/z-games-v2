import { createFileRoute, Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"
import { seoHead } from "@/features/seo"

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    seoHead({
      title: "راهنمای خرید اکانت بازی از زد گیمز؛ از انتخاب تا تحویل",
      description:
        "مراحل انتخاب بازی و ظرفیت، پرداخت، تحویل امن اطلاعات اکانت، دریافت کد تأیید و بازخرید بازی در زد گیمز را بخوانید.",
      path: "/how-it-works",
    }),
  component: HowItWorksPage,
})

function HowItWorksPage() {
  const steps = [
    [
      "بازی، کنسول و ظرفیت را انتخاب کن",
      "صفحه هر بازی فقط گزینه‌های قابل خرید همان کنسول را نشان می‌دهد. توضیح ظرفیت و قیمت پیش از افزودن به سبد قابل مشاهده است.",
    ],
    [
      "با شماره موبایل وارد شو و سفارش را پرداخت کن",
      "سفارش به حساب کاربری متصل می‌شود تا وضعیت، اطلاعات تحویل و درخواست‌های پشتیبانی بعداً در دسترس بمانند.",
    ],
    [
      "منتظر بررسی و تحویل مدیر بمان",
      "تحویل اکانت عمداً با بررسی انسانی انجام می‌شود تا اطلاعات درست برای همان سفارش و ظرفیت ارسال شود.",
    ],
    [
      "اطلاعات را در داشبورد سفارش دریافت کن",
      "پس از تحویل، اطلاعات ورود و در صورت نیاز کد تأیید در حساب کاربری نمایش داده می‌شوند. کدهای زمان‌دار باید پیش از انقضا استفاده شوند.",
    ],
    [
      "اگر بازی واجد شرایط بود، بازخریدش کن",
      "بعد از پایان بازی می‌توانی درخواست بازخرید ثبت کنی. پس از تأیید، اعتبار بر اساس قیمت روز و شرایط همان سفارش به کیف پول اضافه می‌شود.",
    ],
  ] as const

  return (
    <main className="min-h-screen bg-background bg-grid-lines">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">راهنمای خرید</p>
          <h1 className="mt-3 text-4xl leading-tight font-black sm:text-5xl">
            از پیدا کردن بازی تا تحویل اکانت، مرحله‌به‌مرحله
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            این راهنما مسیر عادی سفارش را توضیح می‌دهد. شرایط دقیق هر ظرفیت،
            زمان تحویل و امکان بازخرید را همیشه در صفحه بازی و سفارش بررسی کن.
          </p>
        </header>

        <ol className="mt-12 space-y-4">
          {steps.map(([title, text], index) => (
            <li
              key={title}
              className="flex gap-4 rounded-2xl border border-border/60 bg-card/70 p-5 sm:p-6"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                {(index + 1).toLocaleString("fa-IR")}
              </span>
              <div>
                <h2 className="font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button
            render={<Link to="/games" search={GAMES_DEFAULT_SEARCH} />}
            nativeButton={false}
          >
            شروع انتخاب بازی
          </Button>
          <Button
            render={<Link to="/legal-accounts" />}
            nativeButton={false}
            variant="outline"
          >
            اکانت قانونی یعنی چه؟
          </Button>
        </div>
      </div>
    </main>
  )
}
