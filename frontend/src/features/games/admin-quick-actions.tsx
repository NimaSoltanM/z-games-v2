import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CalendarClock,
  Loader2,
  Megaphone,
  Percent,
  Star,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import {
  deleteGame,
  setGameAlert,
  setGameDiscount,
  setGamePreorder,
  updateGame,
} from "./api"
import { formatReleaseDate } from "./types"
import type {
  AlertVariant,
  Game,
  GameFormPayload,
  ReleaseStatus,
} from "./types"

function useInvalidateGames() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ["admin", "games"] })
    qc.invalidateQueries({ queryKey: ["games"] })
  }
}

// Rebuilds the full save payload from a loaded game, so a quick active toggle can
// reuse the update endpoint without a separate form (it preserves pre-order/alert).
function gameToPayload(game: Game): GameFormPayload {
  return {
    name: game.name,
    slug: game.slug,
    platform: game.platform,
    price_mode: game.price_mode,
    cover_image: game.cover_image,
    active: game.active,
    featured: game.featured,
    tags: game.tags,
    release_status: game.release_status,
    release_date: game.release_date,
    alert_message: game.alert_message,
    alert_variant: game.alert_variant,
    profit_margin_pct: game.profit_margin_pct,
    base_prices: game.base_prices.map((b) => ({
      platform: b.platform,
      base_usd: Number(b.base_usd),
    })),
    prices:
      game.price_mode === "fixed"
        ? game.prices.map((p) => ({
            platform: p.platform,
            zarfiat: p.zarfiat,
            price_toman: p.price_toman,
            slots: p.slots,
          }))
        : [],
    links: game.links.map((l) => l.url),
  }
}

export function ActiveToggle({ game }: { game: Game }) {
  const invalidate = useInvalidateGames()
  const m = useMutation({
    mutationFn: () =>
      updateGame(game.id, { ...gameToPayload(game), active: !game.active }),
    onSuccess: () => invalidate(),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "خطا در تغییر وضعیت"),
  })
  return (
    <Switch
      checked={game.active}
      onCheckedChange={() => m.mutate()}
      disabled={m.isPending}
      aria-label={game.active ? "غیرفعال کردن" : "فعال کردن"}
    />
  )
}

export function PreorderPopover({ game }: { game: Game }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<ReleaseStatus>(game.release_status)
  const [date, setDate] = useState(
    game.release_date ? game.release_date.slice(0, 10) : ""
  )
  const invalidate = useInvalidateGames()

  const m = useMutation({
    mutationFn: () =>
      setGamePreorder(game.id, {
        release_status: status,
        release_date: date === "" ? null : date,
      }),
    onSuccess: () => {
      invalidate()
      toast.success("وضعیت پیش‌خرید ذخیره شد")
      setOpen(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "خطا"),
  })

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          // Re-sync to the latest stored values whenever the editor opens.
          setStatus(game.release_status)
          setDate(game.release_date ? game.release_date.slice(0, 10) : "")
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 text-xs ${game.release_status === "pre_order" ? "text-primary" : ""}`}
          />
        }
      >
        <CalendarClock className="size-3.5" />
        {game.release_status === "pre_order" ? "پیش‌خرید" : "منتشر شده"}
      </PopoverTrigger>
      <PopoverContent className="w-72 gap-3">
        <p className="text-sm font-medium">وضعیت پیش‌خرید</p>
        <ToggleGroup
          value={[status]}
          onValueChange={(v) => v[0] && setStatus(v[0] as ReleaseStatus)}
          variant="outline"
          size="sm"
          spacing={0}
        >
          <ToggleGroupItem value="released" className="px-3 text-xs">
            منتشر شده
          </ToggleGroupItem>
          <ToggleGroupItem value="pre_order" className="px-3 text-xs">
            پیش‌خرید
          </ToggleGroupItem>
        </ToggleGroup>
        {status === "pre_order" && (
          <div className="space-y-1.5">
            <Label htmlFor={`rd-${game.id}`}>تاریخ انتشار</Label>
            <Input
              id={`rd-${game.id}`}
              type="date"
              dir="ltr"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}
        <Button
          size="sm"
          className="w-full gap-1.5"
          disabled={m.isPending}
          onClick={() => m.mutate()}
        >
          {m.isPending && <Loader2 className="size-4 animate-spin" />}
          ذخیره
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export function AlertPopover({ game }: { game: Game }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState(game.alert_message ?? "")
  const [variant, setVariant] = useState<AlertVariant>(
    game.alert_variant ?? "info"
  )
  const invalidate = useInvalidateGames()

  const m = useMutation({
    mutationFn: () => setGameAlert(game.id, { message, variant }),
    onSuccess: () => {
      invalidate()
      toast.success(message.trim() ? "اعلان ذخیره شد" : "اعلان حذف شد")
      setOpen(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "خطا"),
  })

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setMessage(game.alert_message ?? "")
          setVariant(game.alert_variant ?? "info")
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 text-xs ${game.alert_message ? "text-primary" : ""}`}
          />
        }
      >
        <Megaphone className="size-3.5" />
        {game.alert_message ? "اعلان •" : "اعلان"}
      </PopoverTrigger>
      <PopoverContent className="w-80 gap-3">
        <p className="text-sm font-medium">اعلان بازی</p>
        <Textarea
          placeholder="پیام اعلان (خالی = بدون اعلان)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-20 text-sm"
        />
        <ToggleGroup
          value={[variant]}
          onValueChange={(v) => v[0] && setVariant(v[0] as AlertVariant)}
          variant="outline"
          size="sm"
          spacing={0}
        >
          <ToggleGroupItem value="info" className="px-3 text-xs">
            اطلاع‌رسانی
          </ToggleGroupItem>
          <ToggleGroupItem value="warning" className="px-3 text-xs">
            هشدار
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          size="sm"
          className="w-full gap-1.5"
          disabled={m.isPending}
          onClick={() => m.mutate()}
        >
          {m.isPending && <Loader2 className="size-4 animate-spin" />}
          ذخیره
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export function FeaturedToggle({ game }: { game: Game }) {
  const invalidate = useInvalidateGames()
  const m = useMutation({
    mutationFn: () =>
      updateGame(game.id, { ...gameToPayload(game), featured: !game.featured }),
    onSuccess: () => invalidate(),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "خطا در تغییر وضعیت منتخب"),
  })
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${game.featured ? "text-amber-500" : "text-muted-foreground"}`}
      disabled={m.isPending}
      onClick={() => m.mutate()}
      aria-label={game.featured ? "حذف از منتخب" : "افزودن به منتخب"}
    >
      <Star className={`size-4 ${game.featured ? "fill-current" : ""}`} />
    </Button>
  )
}

export function DiscountPopover({ game }: { game: Game }) {
  const [open, setOpen] = useState(false)
  const [percent, setPercent] = useState("")
  const [days, setDays] = useState("")
  const invalidate = useInvalidateGames()

  const active = game.discount != null

  const start = useMutation({
    mutationFn: () =>
      setGameDiscount(game.id, {
        percent: Number(percent),
        days: Number(days),
      }),
    onSuccess: () => {
      invalidate()
      toast.success("تخفیف ذخیره شد")
      setOpen(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "خطا"),
  })

  const stop = useMutation({
    mutationFn: () => setGameDiscount(game.id, { percent: 0, days: 0 }),
    onSuccess: () => {
      invalidate()
      toast.success("تخفیف متوقف شد")
      setOpen(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "خطا"),
  })

  const validPercent = Number(percent) >= 1 && Number(percent) <= 99
  const validDays = Number(days) >= 1
  const busy = start.isPending || stop.isPending

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setPercent(game.discount != null ? String(game.discount) : "")
          setDays("")
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1.5 text-xs ${active ? "text-rose-500" : ""}`}
          />
        }
      >
        <Percent className="size-3.5" />
        {active ? `${game.discount!.toLocaleString("fa-IR")}٪ تخفیف` : "تخفیف"}
      </PopoverTrigger>
      <PopoverContent className="w-72 gap-3">
        <p className="text-sm font-medium">تخفیف زمان‌دار</p>
        {active && game.discount_ends_at && (
          <p className="text-xs text-muted-foreground">
            تخفیف فعلی تا {formatReleaseDate(game.discount_ends_at)} ادامه دارد.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={`disc-pct-${game.id}`}>درصد (۱ تا ۹۹)</Label>
            <Input
              id={`disc-pct-${game.id}`}
              dir="ltr"
              inputMode="numeric"
              placeholder="20"
              value={percent}
              onChange={(e) => setPercent(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`disc-days-${game.id}`}>مدت (روز)</Label>
            <Input
              id={`disc-days-${game.id}`}
              dir="ltr"
              inputMode="numeric"
              placeholder="7"
              value={days}
              onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
        <Button
          size="sm"
          className="w-full gap-1.5"
          disabled={busy || !validPercent || !validDays}
          onClick={() => start.mutate()}
        >
          {start.isPending && <Loader2 className="size-4 animate-spin" />}
          {active ? "به‌روزرسانی تخفیف" : "شروع تخفیف"}
        </Button>
        {active && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            disabled={busy}
            onClick={() => stop.mutate()}
          >
            {stop.isPending && <Loader2 className="size-4 animate-spin" />}
            توقف تخفیف
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function DeleteGameButton({ game }: { game: Game }) {
  const [open, setOpen] = useState(false)
  const invalidate = useInvalidateGames()
  const m = useMutation({
    mutationFn: () => deleteGame(game.id),
    onSuccess: () => {
      invalidate()
      toast.success("بازی حذف شد")
      setOpen(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "خطا در حذف"),
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="حذف بازی"
          />
        }
      >
        <Trash2 className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-3" align="end">
        <p className="text-sm font-medium">حذف بازی</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          «{game.name}» برای همیشه حذف می‌شود. این عمل بازگشت‌ناپذیر است.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={m.isPending}
          >
            انصراف
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => m.mutate()}
            disabled={m.isPending}
          >
            {m.isPending && <Loader2 className="size-4 animate-spin" />}
            حذف
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
