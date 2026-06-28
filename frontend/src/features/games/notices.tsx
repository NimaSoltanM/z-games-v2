import {
  Bookmark,
  CalendarClock,
  Clock,
  Info,
  Percent,
  TriangleAlert,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { daysUntilRelease, formatReleaseDate, gameFamilies } from "./types"
import type { ExchangeRate, Game } from "./types"

// Small brand dots marking which console families a game is on (blue = PlayStation,
// green = Xbox). Console identity is shown as an accent, not a filled pill — one dot
// per family, ringed for legibility over cover art.
export function ConsoleDots({
  consoles,
  rate,
  className,
}: {
  consoles: string[]
  rate?: ExchangeRate
  className?: string
}) {
  const families = gameFamilies(consoles, rate)
  if (families.length === 0) return null
  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      {families.map((f) => (
        <span
          key={f.family}
          title={f.label}
          aria-label={f.label}
          className={`size-2.5 rounded-full ring-2 ring-background/70 ${f.glow}`}
        />
      ))}
    </div>
  )
}

// A small "پیش‌خرید" badge for cards/headers when a game is taking pre-orders.
export function PreOrderBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={`border border-primary/30 bg-primary/10 text-primary ${className ?? ""}`}
    >
      <Bookmark className="size-3" />
      پیش‌خرید
    </Badge>
  )
}

// A "٪X تخفیف" badge for cards/headers when a discount is active. `percent` is the
// active discount (game.discount); render only when it is truthy.
export function DiscountBadge({
  percent,
  className,
}: {
  percent: number
  className?: string
}) {
  return (
    <Badge
      variant="secondary"
      className={`border border-rose-500/30 bg-rose-500/10 text-rose-600 tabular-nums dark:text-rose-400 ${className ?? ""}`}
    >
      <Percent className="size-3" />
      {percent.toLocaleString("fa-IR")}٪ تخفیف
    </Badge>
  )
}

// Tag/genre chips for a game. Renders nothing when there are no tags.
export function GameTags({
  tags,
  className,
}: {
  tags: string[]
  className?: string
}) {
  if (tags.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 text-xs text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

// The stacked notices shown on a game detail page: an optional free-form admin
// alert, plus the automatic pre-order explainer + countdown while the game is in
// its pre-order phase. The closing-window notice is rendered separately, in place
// of the purchase area (see ClosingSoonNotice).
export function GameNotices({ game }: { game: Game }) {
  const showPreOrder = game.phase === "pre_order"
  if (!game.alert_message && !showPreOrder) return null

  const days = daysUntilRelease(game.release_date)
  const releaseDate = formatReleaseDate(game.release_date)

  return (
    <div className="space-y-3">
      {game.alert_message && (
        <Alert variant={game.alert_variant ?? "info"}>
          {game.alert_variant === "warning" ? <TriangleAlert /> : <Info />}
          <AlertDescription>
            <p>{game.alert_message}</p>
          </AlertDescription>
        </Alert>
      )}

      {showPreOrder && (
        <Alert variant="info">
          <CalendarClock />
          <AlertTitle className="flex flex-wrap items-center gap-2">
            این بازی در مرحله‌ی پیش‌خرید است
            {days !== null && days > 0 && (
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 tabular-nums dark:text-sky-300">
                {days.toLocaleString("fa-IR")} روز تا انتشار
              </span>
            )}
          </AlertTitle>
          <AlertDescription>
            <p>
              نسخه‌ی پیش‌خرید بازی را برای شما تهیه می‌کنیم تا تمام پاداش‌ها و
              امتیازهای ویژه‌ی پیش‌خرید ناشر به شما تعلق بگیرد.
            </p>
            <p>
              اطلاعات حساب (ایمیل، رمز عبور و PSN-pass) پس از انتشار رسمی بازی
              در اختیار شما قرار می‌گیرد.
            </p>
            {releaseDate && (
              <p className="text-current/70">
                تاریخ انتشار تخمینی: {releaseDate}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Shown instead of the purchase tiles when a pre-order game is within the closing
// window: pre-order sales have ended but the game hasn't launched yet, so there's
// deliberately no buy option.
export function ClosingSoonNotice({ game }: { game: Game }) {
  const releaseDate = formatReleaseDate(game.release_date)
  return (
    <Alert variant="warning">
      <Clock />
      <AlertTitle>به‌زودی منتشر می‌شود</AlertTitle>
      <AlertDescription>
        <p>
          پیش‌خرید این بازی بسته شده است و فروش پس از انتشار رسمی از سر گرفته
          می‌شود.
          {releaseDate ? ` انتشار حدوداً ${releaseDate}.` : ""}
        </p>
        <p className="text-current/70">لطفاً کمی بعد دوباره سر بزنید.</p>
      </AlertDescription>
    </Alert>
  )
}
