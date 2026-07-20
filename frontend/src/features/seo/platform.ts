export type PlatformPageContent = {
  code: string
  title: string
  seoTitle: string
  description: string
  intro: string
}

// A platform is indexable only after it has useful, reviewed copy here. The game
// catalog remains data-driven; this explicit quality gate prevents a future console
// from accidentally publishing a thin search landing page.
export const PLATFORM_PAGES: Record<string, PlatformPageContent | undefined> = {
  ps4: {
    code: "ps4",
    title: "خرید اکانت بازی PS4",
    seoTitle: "خرید اکانت بازی PS4 با قیمت روز | زد گیمز",
    description:
      "فهرست بازی‌های PS4 با ظرفیت‌های ۱، ۲ و ۳؛ مقایسه قیمت روز، شرایط هر ظرفیت، پشتیبانی و امکان بازخرید بازی‌های واجد شرایط.",
    intro:
      "بازی‌های قابل خرید برای پلی‌استیشن ۴ را یک‌جا ببین، قیمت ظرفیت‌های موجود را مقایسه کن و پیش از سفارش، شرایط استفاده از هر ظرفیت را بخوان.",
  },
  ps5: {
    code: "ps5",
    title: "خرید اکانت بازی PS5",
    seoTitle: "خرید اکانت بازی PS5 با قیمت روز | زد گیمز",
    description:
      "فهرست بازی‌های PS5 با ظرفیت‌های ۱، ۲ و ۳؛ قیمت روز، راهنمای انتخاب ظرفیت، پشتیبانی و بازخرید بازی‌های واجد شرایط.",
    intro:
      "در این صفحه فقط بازی‌هایی را می‌بینی که برای پلی‌استیشن ۵ عرضه می‌شوند. ظرفیت مناسب را بر اساس شیوه اجرا انتخاب کن و قیمت هر گزینه را پیش از خرید ببین.",
  },
  xbox_one: {
    code: "xbox_one",
    title: "خرید اکانت بازی Xbox One",
    seoTitle: "خرید اکانت بازی Xbox One؛ Home و Switch | زد گیمز",
    description:
      "خرید اکانت بازی Xbox One در انواع Home و Switch؛ مشاهده قیمت روز، شرایط استفاده، پشتیبانی و بازی‌های قابل بازخرید.",
    intro:
      "کاتالوگ بازی‌های Xbox One را با گزینه‌های Home و Switch مرور کن. توضیح هر نوع اکانت و قیمت زنده آن کنار همان بازی نمایش داده می‌شود.",
  },
  xbox_series: {
    code: "xbox_series",
    title: "خرید اکانت بازی Xbox Series X|S",
    seoTitle: "خرید اکانت بازی Xbox Series X|S | زد گیمز",
    description:
      "خرید اکانت بازی Xbox Series X|S در انواع Home و Switch با قیمت روز، راهنمای انتخاب، پشتیبانی و امکان بازخرید بازی‌های واجد شرایط.",
    intro:
      "بازی‌های Xbox Series X|S را در یک فهرست اختصاصی پیدا کن، تفاوت Home و Switch را ببین و گزینه مناسب را با قیمت روز انتخاب کن.",
  },
}
