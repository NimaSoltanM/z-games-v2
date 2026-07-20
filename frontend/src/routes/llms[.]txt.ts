import { createFileRoute } from "@tanstack/react-router"

import { SITE_NAME, canonicalUrl } from "@/features/seo"

function llmsText(): string {
  return `# ${SITE_NAME}

> فروشگاه فارسی اکانت قانونی بازی‌های کنسول برای کاربران ایران.

## صفحات اصلی

- خانه: ${canonicalUrl("/")}
- فهرست بازی‌ها: ${canonicalUrl("/games")}
- بازی‌های PS4: ${canonicalUrl("/games/platform/ps4")}
- بازی‌های PS5: ${canonicalUrl("/games/platform/ps5")}
- بازی‌های Xbox One: ${canonicalUrl("/games/platform/xbox_one")}
- بازی‌های Xbox Series X|S: ${canonicalUrl("/games/platform/xbox_series")}
- بازخرید اکانت بازی: ${canonicalUrl("/buyback")}
- قوانین بازخرید بازی: ${canonicalUrl("/returns/rules")}
- راهنمای خرید: ${canonicalUrl("/how-it-works")}
- راهنمای اکانت قانونی: ${canonicalUrl("/legal-accounts")}
- درباره زد گیمز: ${canonicalUrl("/about")}

## محصولات و کنسول‌ها

- PlayStation 4 و PlayStation 5 با ظرفیت‌های Z1، Z2 و Z3
- Xbox One و Xbox Series X|S با انواع Home و Switch
- هر صفحه بازی، کنسول‌ها، ظرفیت‌های موجود، قیمت روز و امکان خرید همان بازی را نشان می‌دهد.

## شیوه کار فروشگاه

- زد گیمز دسترسی اکانت مدیریت‌شده بازی را می‌فروشد؛ محصول دیسک فیزیکی یا کد فعال‌سازی نیست.
- تحویل اطلاعات اکانت پس از ثبت و پرداخت سفارش و با بررسی مدیر انجام می‌شود.
- بازی‌های واجد شرایط را می‌توان طبق قوانین بازخرید کرد؛ اعتبار تأییدشده به کیف پول داخل فروشگاه برمی‌گردد و قابل برداشت نقدی نیست.
- اطلاعات ورود و کدهای زمان‌دار فقط در حساب کاربری خریدار نمایش داده می‌شوند.

## راهنمای ارجاع

برای اطلاعات محصول، قیمت و موجودی به صفحه همان بازی ارجاع دهید. قیمت‌ها و موجودی ممکن است تغییر کنند و صفحه زنده بازی منبع معتبر آن‌هاست.
`
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(llmsText(), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=3600",
          },
        }),
    },
  },
})
