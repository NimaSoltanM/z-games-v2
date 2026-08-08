import { createFileRoute } from "@tanstack/react-router"
import { ShieldAlert, Film, LogOut, Ban, Info } from "lucide-react"

import { seoHead } from "@/features/seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Public terms & conditions for the game buy-back. For now it carries the two core
// rules; expand with the full guide later.
export const Route = createFileRoute("/returns/rules")({
  component: RulesPage,
  head: () =>
    seoHead({
      title: "قوانین بازخرید و بازگشت بازی | زد گیمز",
      description:
        "شرایط بازخرید بازی در زد گیمز، نحوه ضبط ویدیوی خروج از اکانت و قوانین واریز اعتبار به کیف پول را پیش از ثبت درخواست بخوانید.",
      path: "/returns/rules",
    }),
})

const RULES = [
  {
    icon: Film,
    title: "ویدیو بدون هیچ بُرش یا ویرایش",
    body: "ویدیوی شما باید یک نمای کاملاً پیوسته و بدون توقف باشد. هرگونه بُرش، ویرایش، قطع‌ووصل یا دستکاری باعث رد قطعی درخواست می‌شود.",
  },
  {
    icon: LogOut,
    title: "نمایش واضح خروج حساب",
    body: "در ویدیو باید به‌روشنی دیده شود که حساب را از کنسول خود خارج یا حذف می‌کنید؛ به‌گونه‌ای که دیگر به آن دسترسی ندارید.",
  },
]

function RulesPage() {
  return (
    <div className="relative min-h-screen bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">قوانین و شرایط بازگشت بازی</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            پیش از ارسال درخواست بازگشت، این قوانین را با دقت بخوانید.
          </p>
        </div>

        <Alert variant="info" className="mb-6">
          <Info />
          <AlertTitle>این قوانین فعلاً مخصوص PlayStation است</AlertTitle>
          <AlertDescription>
            بازخرید بازی‌های Xbox در حال حاضر فعال نیست. اگر روش مطمئنی برای
            اثبات بازگشت اکانت فراهم شود، این امکان و راهنمای آن در آینده اضافه
            خواهد شد.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {RULES.map((r, i) => {
            const Icon = r.icon
            return (
              <div
                key={i}
                className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/60">
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">
                    {(i + 1).toLocaleString("fa-IR")}. {r.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{r.body}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex items-start gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-1.5 font-semibold text-destructive">
              <ShieldAlert className="size-4" />
              عواقب تخلف
            </p>
            <p className="text-muted-foreground">
              اگر هر یک از قوانین بالا را رعایت نکنید، حتی اگر حساب و اکانت خود
              را حذف کرده باشید، هیچ اقدامی از طرف ما انجام نخواهد شد: نه بازگشت
              وجه، نه واریز اعتبار، نه بازگرداندن بازی به شما. مسئولیت رعایت
              کامل قوانین بر عهده‌ی خود شماست.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          اعتبار بازگشت، معادل قیمت فعلی بازی در فروشگاه پس از کسر کارمزد است و
          تنها به کیف پول شما واریز می‌شود (قابل برداشت نقدی نیست).
        </p>
      </div>
    </div>
  )
}
