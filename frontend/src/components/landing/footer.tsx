import { Link } from "@tanstack/react-router"

import { GAMES_DEFAULT_SEARCH } from "@/features/games"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-7 sm:flex-row">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Z-Games"
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
            <a
              href="#buy-back"
              className="transition-colors hover:text-foreground"
            >
              بازخرید
            </a>
            <Link
              to="/returns/rules"
              className="transition-colors hover:text-foreground"
            >
              قوانین بازگشت
            </Link>
            <Link
              to="/auth"
              search={{ redirect: undefined }}
              className="transition-colors hover:text-foreground"
            >
              ورود
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          © {year} Z-Games — تمامی حقوق محفوظ است.
        </div>
      </div>
    </footer>
  )
}
