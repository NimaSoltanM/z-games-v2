import { Link } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

import { GAMES_DEFAULT_SEARCH } from "@/features/games"

const ENAMAD_TRUST_SEAL =
  "<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=764505&Code=eBOU95a3HqvFeOV2PyyMxJqGTn0gzZk0'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=764505&Code=eBOU95a3HqvFeOV2PyyMxJqGTn0gzZk0' alt='' style='cursor:pointer' code='eBOU95a3HqvFeOV2PyyMxJqGTn0gzZk0'></a>"

const ZARINPAL_TRUST_CODE =
  '<script src="https://www.zarinpal.com/webservice/TrustCode" type="text/javascript"></script>'

export function Footer() {
  const year = new Date().getFullYear()
  const zarinpalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = zarinpalRef.current
    if (!container || container.querySelector("a")) return

    const trustUrl = `https://www.zarinpal.com/trustPage/${window.location.hostname}`
    const link = document.createElement("a")
    link.href = trustUrl
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.title = "دروازه پرداخت معتبر"

    const logo = document.createElement("img")
    logo.src = "https://cdn.zarinpal.com/badges/trustLogo/1.png"
    logo.alt = "دروازه پرداخت معتبر"
    link.append(logo)

    const openTrustPage = (event: MouseEvent) => {
      event.preventDefault()
      window.open(
        trustUrl,
        "zarinpalTrust",
        "width=450,height=600,scrollbars=no,resizable=no"
      )
    }
    link.addEventListener("click", openTrustPage)
    container.append(link)

    return () => link.removeEventListener("click", openTrustPage)
  }, [])

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-7 sm:flex-row">
          <div className="flex items-center gap-3">
            <img
              src="/brand/logo-64.webp"
              alt="Z-Games"
              width={36}
              height={36}
              loading="lazy"
              decoding="async"
              className="size-9 object-contain"
            />
            <div>
              <p className="font-bold tracking-tight">Z-Games</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                بازی‌های PlayStation و Xbox؛ بیشتر بازی کن، هوشمندتر هزینه کن
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <Link
              to="/games"
              search={GAMES_DEFAULT_SEARCH}
              className="transition-colors hover:text-foreground"
            >
              همه‌ی بازی‌ها
            </Link>
            <Link
              to="/buyback"
              search={{ page: 1 }}
              className="transition-colors hover:text-foreground"
            >
              بازخرید
            </Link>
            <Link
              to="/games/platform/$platform"
              params={{ platform: "ps5" }}
              search={{ page: 1 }}
              className="transition-colors hover:text-foreground"
            >
              بازی‌های PS5
            </Link>
            <Link
              to="/games/platform/$platform"
              params={{ platform: "xbox_series" }}
              search={{ page: 1 }}
              className="transition-colors hover:text-foreground"
            >
              بازی‌های Xbox
            </Link>
            <Link
              to="/returns/rules"
              className="transition-colors hover:text-foreground"
            >
              قوانین بازگشت
            </Link>
            <Link
              to="/terms"
              className="transition-colors hover:text-foreground"
            >
              قوانین و مقررات
            </Link>
            <Link
              to="/auth"
              search={{ redirect: undefined }}
              className="transition-colors hover:text-foreground"
            >
              ورود
            </Link>
            <Link
              to="/about"
              className="transition-colors hover:text-foreground"
            >
              درباره ما
            </Link>
            <Link
              to="/how-it-works"
              className="transition-colors hover:text-foreground"
            >
              راهنمای خرید
            </Link>
            <Link
              to="/guides"
              className="transition-colors hover:text-foreground"
            >
              مرکز راهنما
            </Link>
            <Link
              to="/dashboard/support"
              search={{ page: 1 }}
              className="transition-colors hover:text-foreground"
            >
              پشتیبانی و پیگیری درخواست
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4 border-t border-border/40 pt-6">
          <div
            aria-label="نماد اعتماد الکترونیکی زد گیمز"
            className="flex min-h-24 min-w-24 items-center justify-center rounded-xl border border-border/60 bg-card/75 p-3 backdrop-blur-sm"
            dangerouslySetInnerHTML={{ __html: ENAMAD_TRUST_SEAL }}
          />
          <div
            ref={zarinpalRef}
            id="zarinpal"
            aria-label="نشان درگاه پرداخت معتبر زرین‌پال"
            className="flex min-h-24 min-w-24 items-center justify-center rounded-xl border border-border/60 bg-card/75 p-3 backdrop-blur-sm [&_img]:w-20"
            dangerouslySetInnerHTML={{ __html: ZARINPAL_TRUST_CODE }}
          />
        </div>

        <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          © {year} Z-Games — تمامی حقوق محفوظ است.
        </div>
      </div>
    </footer>
  )
}
