import { Bookmark, CalendarClock, Clock, Info, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { daysUntilRelease, formatReleaseDate } from "./types"
import type { Game } from "./types"

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
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium tabular-nums text-sky-700 dark:text-sky-300">
                {days.toLocaleString("fa-IR")} روز تا انتشار
              </span>
            )}
          </AlertTitle>
          <AlertDescription>
            <p>
              نسخه‌ی پیش‌خرید بازی را برای شما تهیه می‌کنیم تا تمام پاداش‌ها و امتیازهای ویژه‌ی
              پیش‌خرید ناشر به شما تعلق بگیرد.
            </p>
            <p>
              اطلاعات حساب (ایمیل، رمز عبور و PSN-pass) پس از انتشار رسمی بازی در اختیار شما قرار
              می‌گیرد.
            </p>
            {releaseDate && (
              <p className="text-current/70">تاریخ انتشار تخمینی: {releaseDate}</p>
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
          پیش‌خرید این بازی بسته شده است و فروش پس از انتشار رسمی از سر گرفته می‌شود.
          {releaseDate ? ` انتشار حدوداً ${releaseDate}.` : ""}
        </p>
        <p className="text-current/70">لطفاً کمی بعد دوباره سر بزنید.</p>
      </AlertDescription>
    </Alert>
  )
}
