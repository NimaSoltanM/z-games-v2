import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type QA = { q: string; a: string }

const FAQ: QA[] = [
  {
    q: "برای چه کنسول‌هایی بازی دارید؟",
    a: "در حال حاضر برای PS4، PS5، Xbox One و Xbox Series X|S بازی ارائه می‌کنیم. هر بازی ممکنه فقط روی بخشی از این کنسول‌ها موجود باشه؛ گزینه‌های واقعی همون بازی در صفحه‌ی خرید نمایش داده می‌شن.",
  },
  {
    q: "Z1، Z2، Z3، Home و Switch چه فرقی دارن؟",
    a: "Z1، Z2 و Z3 مخصوص PlayStation هستن و Home و Switch برای Xbox استفاده می‌شن. تفاوت اصلی در پروفایلیه که باهاش بازی می‌کنی، نیاز یا عدم نیاز به اینترنت و شرایط پشتیبانی. توضیح کوتاه و دقیق هر گزینه قبل از اضافه کردن به سبد خرید نوشته شده.",
  },
  {
    q: "بازخرید بازی دقیقاً چطور کار می‌کنه؟",
    a: "اگر بازی قابل بازگشت باشه، بعد از تحویل و تموم کردنش می‌تونی با یک ویدیوی پیوسته از خروج یا حذف اکانت درخواست ثبت کنی. بعد از تأیید، اعتبار بر اساس قیمت روز بازی و پس از کسر کارمزد به کیف پول Z-Games اضافه می‌شه تا برای خرید بعدی استفاده کنی؛ این اعتبار نقدی قابل برداشت نیست.",
  },
  {
    q: "همه‌ی بازی‌ها قابل بازگشت هستن؟",
    a: "نه. امکان بازگشت برای هر بازی جداگانه فعال می‌شه و ممکنه برای بعضی عنوان‌ها دوره‌ی کارمزد کمتر هم در نظر گرفته بشه.",
  },
  {
    q: "پشتیبانی مادام‌العمر شامل همه‌ی اکانت‌ها می‌شه؟",
    a: "حدود ۹۰٪ اکانت‌ها پشتیبانی مادام‌العمر دارن، اما نه همه‌ی اون‌ها؛ برای مثال Z1 بدون گارانتی ارائه می‌شه. اگر درباره‌ی پوشش انتخابت مطمئن نیستی، قبل از خرید از پشتیبانی بپرس.",
  },
  {
    q: "بازی‌ها قانونی تهیه می‌شن؟",
    a: "بله. بازی‌ها با گیفت‌کارت قانونی از استور رسمی تهیه می‌شن و اکانت‌ها کرکی یا دستکاری‌شده نیستن. این موضوع رو کوتاه می‌گیم چون باید استاندارد هر فروشگاه قابل‌اعتمادی باشه.",
  },
  {
    q: "بعد از خرید چطور اکانت رو تحویل می‌گیرم؟",
    a: "هر سفارش به‌صورت دستی بررسی و آماده می‌شه. بعد از آماده شدن، ایمیل، رمز و کد امنیتی متناسب با کنسولت داخل داشبورد سفارش قرار می‌گیره؛ اگر برای راه‌اندازی کمک بخوای، پشتیبانی کنارت هست.",
  },
]

export function Faq() {
  return (
    <section className="relative bg-background py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-primary">
            شفاف، قبل از پرداخت
          </p>
          <h2 className="mt-3 text-3xl leading-[1.45] font-black sm:text-5xl">
            چیزی مبهم نمونه.
          </h2>
          <p className="mt-5 max-w-md text-base leading-8 text-muted-foreground">
            فرق اکانت‌ها، شرایط بازگشت و نوع پشتیبانی باید قبل از خرید روشن
            باشه؛ نه وقتی که سفارش رو تحویل گرفتی.
          </p>
        </div>

        <Accordion className="border-t border-border/60">
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="py-5 text-start text-base leading-7 font-semibold">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
