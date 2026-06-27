import { useEffect, useRef, useState } from "react"
import { useForm } from "@tanstack/react-form"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Check, Loader2, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MoneyInput } from "@/components/money-input"
import { ImageUpload } from "@/features/uploads"
import { checkSlugAvailable, createGame, updateGame } from "./api"
import { adminPricingQueryOptions } from "./queries"
import { PLATFORM_LABEL, ZARFIAT_LABEL, formatToman, slugify } from "./types"
import type {
  AlertVariant,
  ConsolePlatform,
  Game,
  GameBasePriceInput,
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
  slug: string
  platform: Platform
  price_mode: PriceMode
  cover_image: string | null
  featured: boolean
  tags: string[]
  margin: string
  bases: Record<ConsolePlatform, string>
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
  if (game && game.price_mode === "fixed") {
    for (const pr of game.prices) {
      const cell = cells[cellIndex(pr.platform, pr.zarfiat)]
      cell.price = pr.price_toman?.toString() ?? ""
      cell.slots = pr.slots?.toString() ?? ""
    }
  }
  return {
    name: game?.name ?? "",
    slug: game?.slug ?? "",
    platform: game?.platform ?? "ps5",
    price_mode: game?.price_mode ?? "dynamic",
    cover_image: game?.cover_image ?? null,
    featured: game?.featured ?? false,
    tags: game?.tags ?? [],
    margin:
      game?.profit_margin_pct != null ? String(game.profit_margin_pct) : "",
    bases: {
      ps4: game?.base_prices.find((b) => b.platform === "ps4")?.base_usd ?? "",
      ps5: game?.base_prices.find((b) => b.platform === "ps5")?.base_usd ?? "",
    },
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
    slug: z
      .string()
      .trim()
      .min(1, "نامک الزامی است")
      .max(120, "نامک بیش از حد طولانی است")
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "نامک فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیره باشد"
      ),
    platform: z.enum(["ps4", "ps5", "ps4_ps5"]),
    price_mode: z.enum(["dynamic", "fixed"]),
    cover_image: z.string().nullable(),
    featured: z.boolean(),
    tags: z.array(z.string()),
    margin: z.string(),
    bases: z.object({ ps4: z.string(), ps5: z.string() }),
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
    if (val.price_mode === "dynamic") {
      for (const con of consoles) {
        const b = val.bases[con].trim()
        if (b !== "") {
          const n = Number(b)
          if (!Number.isFinite(n) || n <= 0) {
            ctx.addIssue({
              code: "custom",
              path: ["bases", con],
              message: "قیمت پایه باید بزرگ‌تر از صفر باشد",
            })
          }
        }
      }
      const m = val.margin.trim()
      if (m !== "") {
        const n = Number(m)
        if (!Number.isInteger(n) || n < 0) {
          ctx.addIssue({
            code: "custom",
            path: ["margin"],
            message: "درصد سود نامعتبر است",
          })
        }
      }
    } else {
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
    }
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
  const basePrices: GameBasePriceInput[] = []
  const prices: GamePriceInput[] = []
  let margin: number | null = null

  if (v.price_mode === "dynamic") {
    for (const con of consoles) {
      const b = v.bases[con].trim()
      if (b !== "") basePrices.push({ platform: con, base_usd: Number(b) })
    }
    margin = v.margin.trim() === "" ? null : Number(v.margin)
  } else {
    for (const cell of v.prices) {
      if (!consoles.includes(cell.platform)) continue
      const p = cell.price.trim()
      if (p === "") continue
      prices.push({
        platform: cell.platform,
        zarfiat: cell.zarfiat,
        price_toman: Math.round(Number(p)),
        slots: cell.slots.trim() === "" ? null : Number(cell.slots),
      })
    }
  }

  const alertMessage = v.alert_message.trim()
  return {
    name: v.name.trim(),
    slug: v.slug.trim(),
    platform: v.platform,
    price_mode: v.price_mode,
    cover_image: v.cover_image,
    active,
    featured: v.featured,
    tags: v.tags.map((t) => t.trim()).filter(Boolean),
    release_status: v.release_status,
    release_date:
      v.release_status === "pre_order" && v.release_date.trim() !== ""
        ? v.release_date
        : null,
    alert_message: alertMessage === "" ? null : alertMessage,
    alert_variant: alertMessage === "" ? null : v.alert_variant,
    profit_margin_pct: margin,
    base_prices: basePrices,
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

type SlugStatus = "idle" | "checking" | "available" | "taken"

export function GameForm({ game }: { game?: Game }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: pricing } = useSuspenseQuery(adminPricingQueryOptions())
  const published = game?.active ?? false
  const activeRef = useRef(published)

  // Slug auto-suggests from the name until the admin edits it by hand (always off
  // when editing an existing game, whose slug is already set). slugStatus drives the
  // live availability indicator and blocks submit on a known collision.
  const [slugAuto, setSlugAuto] = useState(!game)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle")
  const [tagInput, setTagInput] = useState("")

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
    if (slugStatus === "taken") {
      toast.error("این نامک قبلاً برای بازی دیگری ثبت شده است")
      return
    }
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

      <Card className="space-y-5">
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
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                    // Keep the slug mirroring the name until the admin edits it.
                    if (slugAuto)
                      form.setFieldValue("slug", slugify(e.target.value))
                  }}
                  aria-invalid={invalid}
                  placeholder="مثلاً Cyberpunk 2077"
                />
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </div>
            )
          }}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.slug}>
          {(slug) => (
            <SlugWatcher
              slug={slug}
              excludeId={game?.id}
              setStatus={setSlugStatus}
            />
          )}
        </form.Subscribe>
        <form.Field name="slug">
          {(field) => {
            const invalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <div className="space-y-1.5">
                <Label htmlFor="game-slug">نامک (در آدرس صفحه)</Label>
                <div className="relative">
                  <Input
                    id="game-slug"
                    dir="ltr"
                    className="pl-8"
                    value={field.state.value}
                    onChange={(e) => {
                      setSlugAuto(false)
                      field.handleChange(e.target.value)
                    }}
                    onBlur={() => {
                      field.handleChange(slugify(field.state.value))
                      field.handleBlur()
                    }}
                    aria-invalid={invalid || slugStatus === "taken"}
                    placeholder="cyberpunk-2077"
                  />
                  <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2">
                    {slugStatus === "checking" && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                    {slugStatus === "available" && (
                      <Check className="size-4 text-emerald-500" />
                    )}
                    {slugStatus === "taken" && (
                      <X className="size-4 text-destructive" />
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  /games/{field.state.value || "…"}
                </p>
                {invalid && <FieldError errors={field.state.meta.errors} />}
                {slugStatus === "taken" && (
                  <p className="text-xs text-destructive">
                    این نامک قبلاً برای بازی دیگری ثبت شده است
                  </p>
                )}
              </div>
            )
          }}
        </form.Field>
      </Card>

      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">منتخب</p>
            <p className="text-xs text-muted-foreground">
              در ردیف «منتخب» بالای صفحه بازی‌ها نمایش داده می‌شود.
            </p>
          </div>
          <form.Field name="featured">
            {(field) => (
              <Switch
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                aria-label="منتخب"
              />
            )}
          </form.Field>
        </div>

        <div className="space-y-1.5">
          <Label>برچسب‌ها / ژانر</Label>
          <p className="text-xs text-muted-foreground">
            برای دسته‌بندی و نمایش روی کارت بازی (مثلاً اکشن، آنلاین).
          </p>
          <form.Field name="tags" mode="array">
            {(field) => {
              const addTag = () => {
                const t = tagInput.trim()
                if (!t) return
                if (
                  field.state.value.some(
                    (x) => x.toLowerCase() === t.toLowerCase()
                  )
                ) {
                  setTagInput("")
                  return
                }
                field.pushValue(t)
                setTagInput("")
              }
              return (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                      placeholder="مثلاً اکشن"
                      maxLength={40}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={addTag}
                    >
                      <Plus className="size-3.5" />
                      افزودن
                    </Button>
                  </div>
                  {field.state.value.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {field.state.value.map((tag, i) => (
                        <span
                          key={`${tag}-${i}`}
                          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 text-xs"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => field.removeValue(i)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="حذف برچسب"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            }}
          </form.Field>
        </div>
      </Card>

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

      {/* Pricing */}
      <Card>
        <p className="mb-3 text-sm font-semibold">قیمت‌گذاری</p>
        <form.Subscribe selector={(s) => s.values.price_mode}>
          {(mode) =>
            mode === "dynamic" ? (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  یک{" "}
                  <span className="font-medium text-foreground">
                    قیمت پایه به دلار
                  </span>{" "}
                  برای هر کنسول وارد کنید؛ قیمت سه ظرفیت به‌صورت خودکار محاسبه
                  می‌شود. می‌توانید اعشار وارد کنید (مثلاً{" "}
                  <span dir="ltr">۶۹.۹۹</span>).
                </p>

                <form.Field name="margin">
                  {(field) => {
                    const invalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <div className="space-y-1.5">
                        <Label htmlFor="margin">درصد سود (اختیاری)</Label>
                        <Input
                          id="margin"
                          dir="ltr"
                          inputMode="numeric"
                          className="w-32"
                          placeholder={`پیش‌فرض ${pricing.default_margin_pct.toLocaleString("fa-IR")}٪`}
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(
                              e.target.value.replace(/\D/g, "")
                            )
                          }
                          aria-invalid={invalid}
                        />
                        {invalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </div>
                    )
                  }}
                </form.Field>

                <form.Subscribe
                  selector={(s) => ({
                    platform: s.values.platform,
                    margin: s.values.margin,
                    bases: s.values.bases,
                  })}
                >
                  {({ platform, margin, bases }) => (
                    <div className="space-y-4">
                      {consolesFor(platform).map((con) => (
                        <div
                          key={con}
                          className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3"
                        >
                          <form.Field name={`bases.${con}`}>
                            {(field) => {
                              const invalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid
                              return (
                                <div className="space-y-1.5">
                                  <Label>
                                    {con.toUpperCase()} — قیمت پایه ($)
                                  </Label>
                                  <MoneyInput
                                    decimals
                                    className="w-40"
                                    placeholder="69.99"
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
                          <DerivedPreview
                            base={bases[con]}
                            margin={margin}
                            config={pricing}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </form.Subscribe>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  قیمت هر ظرفیت را به{" "}
                  <span className="font-medium text-foreground">تومان</span>{" "}
                  وارد کنید؛ جداکننده‌ی هزارگان خودکار اضافه می‌شود. ظرفیت‌های
                  بدون قیمت فروخته نمی‌شوند.
                </p>
                <form.Subscribe selector={(s) => s.values.platform}>
                  {(platform) =>
                    consolesFor(platform).map((con) => (
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
                                          placeholder="قیمت (تومان)"
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
                    ))
                  }
                </form.Subscribe>
              </div>
            )
          }
        </form.Subscribe>
      </Card>

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
            خالی بگذارید تا اعلانی نباشد.
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

      {/* Actions */}
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
            const blocked = !canSubmit || busy || slugStatus === "taken"
            return (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={blocked}
                  onClick={() => submitAs(false)}
                >
                  ذخیره پیش‌نویس
                </Button>
                <Button
                  type="button"
                  className="gap-1.5"
                  disabled={blocked}
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

// Live preview of the three derived tier prices for a dynamic base price.
function DerivedPreview({
  base,
  margin,
  config,
}: {
  base: string
  margin: string
  config: {
    z1_pct: number
    z2_pct: number
    z3_pct: number
    default_margin_pct: number
    usd_to_toman: number | null
  }
}) {
  const b = Number(base.trim())
  if (!base.trim() || !Number.isFinite(b) || b <= 0) return null
  const m = margin.trim() === "" ? config.default_margin_pct : Number(margin)
  const rate = config.usd_to_toman
  const split: Record<Zarfiat, number> = {
    z1: config.z1_pct,
    z2: config.z2_pct,
    z3: config.z3_pct,
  }

  return (
    <div className="grid grid-cols-3 gap-2 pt-1">
      {ZARFIATS_ALL.map((zf) => {
        const usd = b * (1 + m / 100) * (split[zf] / 100)
        const toman = rate != null ? Math.round(usd * rate) : null
        return (
          <div
            key={zf}
            className="rounded-lg bg-background/60 px-2 py-1.5 text-center"
          >
            <p className="text-[10px] text-muted-foreground">
              {ZARFIAT_LABEL[zf]}
            </p>
            <p className="text-xs font-semibold text-primary">
              {toman != null ? formatToman(toman) : `$${usd.toFixed(2)}`}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// SlugWatcher debounces the current slug and reports its availability to the form.
// It renders nothing — the indicator is drawn from slugStatus in the slug field —
// and self-cancels stale requests so a fast typist never sees an out-of-order result.
function SlugWatcher({
  slug,
  excludeId,
  setStatus,
}: {
  slug: string
  excludeId?: string
  setStatus: (s: SlugStatus) => void
}) {
  useEffect(() => {
    const s = slug.trim()
    if (!s || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) {
      setStatus("idle")
      return
    }
    setStatus("checking")
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const r = await checkSlugAvailable(s, excludeId)
        if (!cancelled) setStatus(r.available ? "available" : "taken")
      } catch {
        if (!cancelled) setStatus("idle")
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slug, excludeId, setStatus])

  return null
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
