import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard-shell"
import { MoneyInput } from "@/components/money-input"
import { adminPricingQueryOptions } from "@/features/games"
import { setPricingConfig } from "@/features/games/api"

function PricingError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/games/pricing")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(adminPricingQueryOptions())
  },
  component: PricingPage,
  errorComponent: PricingError,
})

function PricingPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <div className="mx-auto max-w-3xl">
      <DashboardHeader
        title="تنظیمات قیمت‌گذاری"
        back={{ to: "/admin/games", label: "بازگشت به بازی‌ها" }}
      />
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری تنظیمات
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <PricingPanel />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

function PctField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        dir="ltr"
        inputMode="numeric"
        className="h-9 w-20"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
    </div>
  )
}

type ConsoleDraft = {
  code: string
  label: string
  margin: string
  capacities: { code: string; label: string; split: string }[]
}

function PricingPanel() {
  const { data: config } = useSuspenseQuery(adminPricingQueryOptions())
  const queryClient = useQueryClient()
  const [rate, setRate] = useState(
    config.usd_to_toman != null ? String(config.usd_to_toman) : ""
  )
  // One editable draft per console: its default margin + each capacity's split.
  const [consoles, setConsoles] = useState<ConsoleDraft[]>(() =>
    config.consoles.map((c) => ({
      code: c.code,
      label: c.label_fa,
      margin: String(c.default_margin_pct),
      capacities: c.capacities.map((cp) => ({
        code: cp.code,
        label: cp.label_fa,
        split: String(cp.split_pct),
      })),
    }))
  )

  const setMargin = (code: string, v: string) =>
    setConsoles((cs) =>
      cs.map((c) => (c.code === code ? { ...c, margin: v } : c))
    )
  const setSplit = (code: string, capCode: string, v: string) =>
    setConsoles((cs) =>
      cs.map((c) =>
        c.code === code
          ? {
              ...c,
              capacities: c.capacities.map((cp) =>
                cp.code === capCode ? { ...cp, split: v } : cp
              ),
            }
          : c
      )
    )

  const splitSum = (c: ConsoleDraft) =>
    c.capacities.reduce((s, cp) => s + Number(cp.split || 0), 0)
  const valid =
    Number(rate) > 0 &&
    consoles.every((c) => c.margin !== "" && splitSum(c) === 100)

  const m = useMutation({
    mutationFn: () =>
      setPricingConfig({
        usd_to_toman: Number(rate),
        consoles: consoles.map((c) => ({
          code: c.code,
          default_margin_pct: Number(c.margin),
          capacities: c.capacities.map((cp) => ({
            code: cp.code,
            split_pct: Number(cp.split),
          })),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "games"] })
      queryClient.invalidateQueries({ queryKey: ["games"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "pricing"] })
      toast.success("تنظیمات قیمت‌گذاری ذخیره شد")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "خطا در ذخیره"),
  })

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm">
      <div>
        <p className="text-sm font-medium">نرخ ارز و سود</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          نرخ ارز و، برای هر کنسول، درصد سود پیش‌فرض و سهم هر ظرفیت از قیمت کل.
          مجموع سهم ظرفیت‌های هر کنسول باید ۱۰۰ باشد.
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          نرخ ارز (دلار → تومان)
        </Label>
        <MoneyInput
          value={rate}
          onChange={setRate}
          className="h-9 w-36"
          placeholder="95,000"
        />
      </div>

      <div className="space-y-3">
        {consoles.map((c) => {
          const sum = splitSum(c)
          return (
            <div
              key={c.code}
              className="space-y-2 rounded-lg border border-border/60 p-3"
            >
              <p className="text-xs font-medium">{c.label}</p>
              <div className="flex flex-wrap items-end gap-3">
                <PctField
                  label="سود پیش‌فرض (٪)"
                  value={c.margin}
                  onChange={(v) => setMargin(c.code, v)}
                />
                {c.capacities.map((cp) => (
                  <PctField
                    key={cp.code}
                    label={`${cp.label} (٪)`}
                    value={cp.split}
                    onChange={(v) => setSplit(c.code, cp.code, v)}
                  />
                ))}
              </div>
              {sum !== 100 && (
                <p className="text-xs text-destructive">
                  مجموع درصد ظرفیت‌های {c.label} باید ۱۰۰ باشد (اکنون{" "}
                  {sum.toLocaleString("fa-IR")})
                </p>
              )}
            </div>
          )
        })}
      </div>

      <Button disabled={!valid || m.isPending} onClick={() => m.mutate()}>
        ذخیره
      </Button>
    </div>
  )
}
