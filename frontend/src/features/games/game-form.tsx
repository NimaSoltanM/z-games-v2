import { useRef } from "react"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MoneyInput } from "@/components/money-input"
import { ImageUpload } from "@/features/uploads"
import { createGame, updateGame } from "./api"
import { PLATFORM_LABEL, ZARFIAT_LABEL } from "./types"
import type {
  AlertVariant,
  ConsolePlatform,
  Game,
  GameFormPayload,
  GamePriceInput,
  Platform,
  PriceMode,
  ReleaseStatus,
  Zarfiat,
} from "./types"

const CONSOLES: ConsolePlatform[] = ["ps4", "ps5"]
const ZARFIATS_ALL: Zarfiat[] = ["z1", "z2", "z3"]
const PLATFORMS: Platform[] = ["ps4", "ps5", "ps4_ps5"]

const cellIndex = (con: ConsolePlatform, zf: Zarfiat) =>
  CONSOLES.indexOf(con) * ZARFIATS_ALL.length + ZARFIATS_ALL.indexOf(zf)

const consolesFor = (p: Platform): ConsolePlatform[] =>
  p === "ps4_ps5" ? ["ps4", "ps5"] : [p]

type Cell = {
  platform: ConsolePlatform
  zarfiat: Zarfiat
  price: string
  slots: string
}
type FormValues = {
  name: string
  platform: Platform
  price_mode: PriceMode
  cover_image: string | null
  prices: Cell[]
  links: { url: string }[]
  release_status: ReleaseStatus
  release_date: string
  alert_message: string
  alert_variant: AlertVariant
}

function emptyCells(): Cell[] {
  const cells: Cell[] = []
  for (const p of CONSOLES)
    for (const zf of ZARFIATS_ALL)
      cells.push({ platform: p, zarfiat: zf, price: "", slots: "" })
  return cells
}

function initialValues(game?: Game): FormValues {
  const cells = emptyCells()
  if (game) {
    for (const pr of game.prices) {
      const cell = cells[cellIndex(pr.platform, pr.zarfiat)]
      cell.price =
        game.price_mode === "fixed"
          ? (pr.price_toman?.toString() ?? "")
          : (pr.price_usd ?? "")
      cell.slots = pr.slots?.toString() ?? ""
    }
  }
  return {
    name: game?.name ?? "",
    platform: game?.platform ?? "ps5",
    price_mode: game?.price_mode ?? "dynamic",
    cover_image: game?.cover_image ?? null,
    prices: cells,
    links: game?.links.map((l) => ({ url: l.url })) ?? [],
    release_status: game?.release_status ?? "released",
    release_date: game?.release_date ? game.release_date.slice(0, 10) : "",
    alert_message: game?.alert_message ?? "",
    alert_variant: game?.alert_variant ?? "info",
  }
}

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "نام بازی الزامی است")
      .max(200, "نام بازی بیش از حد طولانی است"),
    platform: z.enum(["ps4", "ps5", "ps4_ps5"]),
    price_mode: z.enum(["dynamic", "fixed"]),
    cover_image: z.string().nullable(),
    prices: z.array(
      z.object({
        platform: z.enum(["ps4", "ps5"]),
        zarfiat: z.enum(["z1", "z2", "z3"]),
        price: z.string(),
        slots: z.string(),
      })
    ),
    links: z.array(z.object({ url: z.string() })),
    release_status: z.enum(["released", "pre_order"]),
    release_date: z.string(),
    alert_message: z.string().max(500, "متن اعلان بیش از حد طولانی است"),
    alert_variant: z.enum(["info", "warning"]),
  })
  .superRefine((val, ctx) => {
    const consoles = consolesFor(val.platform)
    val.prices.forEach((cell, i) => {
      if (!consoles.includes(cell.platform)) return
      const p = cell.price.trim()
      if (p !== "") {
        const n = Number(p)
        if (!Number.isFinite(n) || n <= 0) {
          ctx.addIssue({
            code: "custom",
            path: ["prices", i, "price"],
            message: "قیمت باید بزرگ‌تر از صفر باشد",
          })
        }
      }
      const s = cell.slots.trim()
      if (s !== "") {
        const n = Number(s)
        if (!Number.isInteger(n) || n < 0) {
          ctx.addIssue({
            code: "custom",
            path: ["prices", i, "slots"],
            message: "تعداد نامعتبر است",
          })
        }
      }
    })
    val.links.forEach((l, i) => {
      const u = l.url.trim()
      if (u !== "" && !/^https?:\/\//i.test(u)) {
        ctx.addIssue({
          code: "custom",
          path: ["links", i, "url"],
          message: "آدرس باید با http یا https شروع شود",
        })
      }
    })
  })

function toPayload(v: FormValues, active: boolean): GameFormPayload {
  const consoles = consolesFor(v.platform)
  const prices: GamePriceInput[] = []
  for (const cell of v.prices) {
    if (!consoles.includes(cell.platform)) continue
    const p = cell.price.trim()
    if (p === "") continue
    const num = Number(p)
    prices.push({
      platform: cell.platform,
      zarfiat: cell.zarfiat,
      price_usd: v.price_mode === "dynamic" ? num : null,
      price_toman: v.price_mode === "fixed" ? Math.round(num) : null,
      slots: cell.slots.trim() === "" ? null : Number(cell.slots),
    })
  }
  const alertMessage = v.alert_message.trim()
  return {
    name: v.name.trim(),
    platform: v.platform,
    price_mode: v.price_mode,
    cover_image: v.cover_image,
    active,
    release_status: v.release_status,
    release_date:
      v.release_status === "pre_order" && v.release_date.trim() !== ""
        ? v.release_date
        : null,
    alert_message: alertMessage === "" ? null : alertMessage,
    alert_variant: alertMessage === "" ? null : v.alert_variant,
    prices,
    links: v.links.map((l) => l.url.trim()).filter(Boolean),
  }
}

function errText(errors: unknown[]): string {
  return errors
    .map((e) =>
      typeof e === "string" ? e : ((e as { message?: string }).message ?? "")
    )
    .filter(Boolean)
    .join("، ")
}

export function GameForm({ game }: { game?: Game }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const published = game?.active ?? false
  // Which "active" the next submit applies, set by the Draft / Publish button.
  const activeRef = useRef(published)

  const mutation = useMutation({
    mutationFn: (payload: GameFormPayload) =>
      game ? updateGame(game.id, payload) : createGame(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "games"] })
      queryClient.invalidateQueries({ queryKey: ["games"] })
      toast.success(game ? "بازی ذخیره شد" : "بازی ساخته شد")
      navigate({ to: "/admin/games" })
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "خطا در ذخیره بازی"),
  })

  const form = useForm({
    defaultValues: initialValues(game),
    validators: { onChange: schema },
    onSubmit: ({ value }) =>
      mutation.mutateAsync(toPayload(value, activeRef.current)),
  })

  const submitAs = (active: boolean) => {
    activeRef.current = active
    form.handleSubmit()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submitAs(published)
      }}
      className="space-y-6"
    >
      {game && (
        <Badge
          variant="secondary"
          className={
            published
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }
        >
          {published ? "وضعیت: منتشر شده" : "وضعیت: پیش‌نویس"}
        </Badge>
      )}

      {/* Name */}
      <Card>
        <form.Field name="name">
          {(field) => {
            const invalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <div className="space-y-1.5">
                <Label htmlFor="game-name">نام بازی</Label>
                <Input
                  id="game-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={invalid}
                  placeholder="مثلاً Cyberpunk 2077"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </div>
            )
          }}
        </form.Field>
      </Card>

      {/* Platform + price mode */}
      <Card className="grid gap-5 sm:grid-cols-2">
        <form.Field name="platform">
          {(field) => (
            <div className="space-y-1.5">
              <Label>کنسول</Label>
              <ToggleGroup
                value={[field.state.value]}
                onValueChange={(v) =>
                  v[0] && field.handleChange(v[0] as Platform)
                }
                variant="outline"
                size="sm"
                spacing={0}
              >
                {PLATFORMS.map((p) => (
                  <ToggleGroupItem key={p} value={p} className="px-3 text-xs">
                    {PLATFORM_LABEL[p]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}
        </form.Field>

        <form.Field name="price_mode">
          {(field) => (
            <div className="space-y-1.5">
              <Label>نوع قیمت‌گذاری</Label>
              <ToggleGroup
                value={[field.state.value]}
                onValueChange={(v) =>
                  v[0] && field.handleChange(v[0] as PriceMode)
                }
                variant="outline"
                size="sm"
                spacing={0}
              >
                <ToggleGroupItem value="dynamic" className="px-3 text-xs">
                  داینامیک (دلار)
                </ToggleGroupItem>
                <ToggleGroupItem value="fixed" className="px-3 text-xs">
                  ثابت (تومان)
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
        </form.Field>
      </Card>

      {/* Pricing matrix */}
      <Card>
        <p className="mb-1 text-sm font-semibold">قیمت‌ها</p>
        <form.Subscribe
          selector={(s) => ({
            platform: s.values.platform,
            mode: s.values.price_mode,
          })}
        >
          {({ platform, mode }) => {
            const dynamic = mode === "dynamic"
            return (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  فقط ظرفیت‌هایی که قیمت دارند فروخته می‌شوند؛ بقیه را خالی
                  بگذارید.{" "}
                  {dynamic ? (
                    <>
                      مبلغ به{" "}
                      <span className="font-medium text-foreground">دلار</span>{" "}
                      است و می‌توانید اعشار وارد کنید (مثلاً{" "}
                      <span dir="ltr">۶۹.۹۹</span> یا <span dir="ltr">۶۹</span>
                      ). قیمت نهایی تومان بر اساس نرخ ارز محاسبه می‌شود.
                    </>
                  ) : (
                    <>
                      مبلغ به{" "}
                      <span className="font-medium text-foreground">تومان</span>{" "}
                      است؛ جداکننده‌ی هزارگان خودکار اضافه می‌شود (کافی است عدد
                      را وارد کنید، مثلاً <span dir="ltr">۹۵۰۰۰</span> →{" "}
                      <span dir="ltr">95,000</span>).
                    </>
                  )}
                </p>
                {consolesFor(platform).map((con) => (
                  <div key={con} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {con.toUpperCase()}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {ZARFIATS_ALL.map((zf) => {
                        const i = cellIndex(con, zf)
                        return (
                          <div
                            key={zf}
                            className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3"
                          >
                            <p className="text-xs text-muted-foreground">
                              {ZARFIAT_LABEL[zf]}
                            </p>
                            <form.Field name={`prices[${i}].price`}>
                              {(field) => {
                                const invalid =
                                  field.state.meta.isTouched &&
                                  !field.state.meta.isValid
                                return (
                                  <div className="space-y-1">
                                    <MoneyInput
                                      decimals={dynamic}
                                      placeholder={
                                        dynamic ? "قیمت ($)" : "قیمت (تومان)"
                                      }
                                      className="h-8 text-xs"
                                      value={field.state.value}
                                      onChange={field.handleChange}
                                      onBlur={field.handleBlur}
                                      aria-invalid={invalid}
                                    />
                                    {invalid && (
                                      <FieldError
                                        errors={field.state.meta.errors}
                                      />
                                    )}
                                  </div>
                                )
                              }}
                            </form.Field>
                            <form.Field name={`prices[${i}].slots`}>
                              {(field) => (
                                <Input
                                  dir="ltr"
                                  inputMode="numeric"
                                  placeholder="ظرفیت (اختیاری)"
                                  className="h-8 text-xs"
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                />
                              )}
                            </form.Field>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          }}
        </form.Subscribe>
      </Card>

      {/* Cover */}
      <Card>
        <form.Field name="cover_image">
          {(field) => (
            <div className="space-y-1.5">
              <Label>تصویر کاور</Label>
              <ImageUpload
                value={field.state.value}
                onChange={field.handleChange}
              />
            </div>
          )}
        </form.Field>
      </Card>

      {/* Pre-order */}
      <Card className="space-y-3">
        <p className="text-sm font-semibold">انتشار / پیش‌خرید</p>
        <form.Field name="release_status">
          {(field) => (
            <div className="space-y-3">
              <ToggleGroup
                value={[field.state.value]}
                onValueChange={(v) =>
                  v[0] && field.handleChange(v[0] as ReleaseStatus)
                }
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
              {field.state.value === "pre_order" && (
                <form.Field name="release_date">
                  {(dateField) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="release-date">
                        تاریخ انتشار (تخمینی)
                      </Label>
                      <Input
                        id="release-date"
                        type="date"
                        dir="ltr"
                        className="w-48"
                        value={dateField.state.value}
                        onChange={(e) => dateField.handleChange(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        فروش پیش‌خرید یک روز پیش از این تاریخ بسته می‌شود.
                      </p>
                    </div>
                  )}
                </form.Field>
              )}
            </div>
          )}
        </form.Field>
      </Card>

      {/* Alert */}
      <Card className="space-y-3">
        <div>
          <p className="text-sm font-semibold">اعلان بازی (اختیاری)</p>
          <p className="text-xs text-muted-foreground">
            یک پیام در صفحه‌ی بازی نمایش داده می‌شود. خالی بگذارید تا اعلانی
            نباشد.
          </p>
        </div>
        <form.Field name="alert_message">
          {(field) => (
            <Textarea
              placeholder="مثلاً: تحویل این بازی ممکن است تا ۲۴ ساعت طول بکشد."
              className="min-h-20 text-sm"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>
        <form.Field name="alert_variant">
          {(field) => (
            <ToggleGroup
              value={[field.state.value]}
              onValueChange={(v) =>
                v[0] && field.handleChange(v[0] as AlertVariant)
              }
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
          )}
        </form.Field>
      </Card>

      {/* Links */}
      <Card>
        <p className="mb-3 text-sm font-semibold">لینک‌ها</p>
        <form.Field name="links" mode="array">
          {(field) => (
            <div className="space-y-2">
              {field.state.value.map((_, i) => (
                <form.Field key={i} name={`links[${i}].url`}>
                  {(sub) => {
                    const invalid =
                      sub.state.meta.isTouched && !sub.state.meta.isValid
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Input
                            dir="ltr"
                            placeholder="https://store.playstation.com/..."
                            value={sub.state.value}
                            onBlur={sub.handleBlur}
                            onChange={(e) => sub.handleChange(e.target.value)}
                            aria-invalid={invalid}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => field.removeValue(i)}
                            aria-label="حذف لینک"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        {invalid && (
                          <FieldError errors={sub.state.meta.errors} />
                        )}
                      </div>
                    )
                  }}
                </form.Field>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => field.pushValue({ url: "" })}
              >
                <Plus className="size-3.5" />
                افزودن لینک
              </Button>
            </div>
          )}
        </form.Field>
      </Card>

      {/* Actions: draft vs publish */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate({ to: "/admin/games" })}
          disabled={mutation.isPending}
        >
          انصراف
        </Button>
        <form.Subscribe
          selector={(s) => [s.canSubmit, s.isSubmitting] as const}
        >
          {([canSubmit, isSubmitting]) => {
            const busy = isSubmitting || mutation.isPending
            return (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  disabled={!canSubmit || busy}
                  onClick={() => submitAs(false)}
                >
                  ذخیره پیش‌نویس
                </Button>
                <Button
                  type="button"
                  className="gap-1.5"
                  disabled={!canSubmit || busy}
                  onClick={() => submitAs(true)}
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {published ? "ذخیره و انتشار" : "انتشار"}
                </Button>
              </>
            )
          }}
        </form.Subscribe>
      </div>
    </form>
  )
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm ${className ?? ""}`}
    >
      {children}
    </div>
  )
}

function FieldError({ errors }: { errors: unknown[] }) {
  const text = errText(errors)
  if (!text) return null
  return <p className="text-xs text-destructive">{text}</p>
}
