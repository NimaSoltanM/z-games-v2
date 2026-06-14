import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type QA = { q: string; a: string }

const FAQ: QA[] = [
  {
    q: "ظرفیت دوم با ظرفیت سوم چه فرقی دارن؟",
    a: "در ظرفیت دوم، اکانت رو روی کنسولت primary می‌کنی و بازی برای همیشه — حتی آفلاین — در دسترسته. در ظرفیت سوم، مستقیم روی اکانت ارائه‌شده بازی می‌کنی و برای بازی باید آنلاین بمونی. ظرفیت سوم ارزون‌تره؛ هر دو گارانتی مادام‌العمر دارن.",
  },
  {
    q: "گارانتی مادام‌العمر یعنی چی؟",
    a: "یعنی اگه در طول زمان روی اکانت مشکلی پیش بیاد، بدون هیچ هزینه‌ی اضافه‌ای با یک ظرفیت معادل جایگزینش می‌کنیم.",
  },
  {
    q: "بعد از پرداخت چقدر طول می‌کشه اکانت برسه؟",
    a: "هر سفارش به‌صورت دستی و مطمئن آماده می‌شه تا اطلاعات دقیق و سالم بهت برسه. به‌محض آماده شدن، اطلاعات اکانت توی صفحه‌ی سفارش‌هات قرار می‌گیره.",
  },
  {
    q: "پرداخت امنه؟",
    a: "بله. تمام پرداخت‌ها از طریق درگاه رسمی زرین‌پال انجام می‌شه و اطلاعات کارت شما هیچ‌وقت روی سایت ما ذخیره نمی‌شه.",
  },
  {
    q: "روی چه کنسول‌هایی کار می‌کنه؟",
    a: "بازی‌ها برای PS4 و PS5 ارائه می‌شن. موقع خرید، پلتفرم هر بازی مشخص شده.",
  },
]

export function Faq() {
  return (
    <section className="relative bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">سوال‌های پرتکرار</h2>
          <p className="mt-4 text-base text-muted-foreground">
            هر چیزی که قبل از خرید خوبه بدونی.
          </p>
        </div>

        <Accordion className="mt-12">
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="text-base">{item.q}</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
