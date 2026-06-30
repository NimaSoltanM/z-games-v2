import {
  createFileRoute,
  ErrorComponent,
  Link,
  useNavigate,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
  useQueryClient,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ShieldAlert, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard-shell"
import {
  ownedItemQueryOptions,
  createReturn,
  resubmitReturn,
  VideoUpload,
} from "@/features/returns"
import type { OwnedItem } from "@/features/returns"
import {
  formatToman,
  consoleLabel,
  capacityLabel,
  platformBadgeClass,
} from "@/features/games"
import { cn } from "@/lib/utils"

function ReturnError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/dashboard/games/$itemId/return")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(ownedItemQueryOptions(params.itemId))
  },
  component: ReturnPage,
  errorComponent: ReturnError,
})

function ReturnPage() {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <>
      <DashboardHeader
        title="بازگرداندن بازی"
        back={{
          to: "/dashboard/games",
          search: { page: 1 },
          label: "بازی‌های من",
        }}
      />
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<ReturnSkeleton />}>
          <ReturnForm />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function ReturnForm() {
  const { itemId } = Route.useParams()
  const { data: item } = useSuspenseQuery(ownedItemQueryOptions(itemId))
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [video, setVideo] = useState<File | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")

  if (!item) {
    return <Notice text="حساب موردنظر یافت نشد." />
  }
  if (!item.returnable && !item.return_status) {
    return <Notice text="امکان بازگرداندن این بازی وجود ندارد." />
  }
  // Only a brand-new account or a rejected (fixable) request is actionable here.
  const isResubmit = item.return_status === "rejected"
  if (item.return_status && !isResubmit) {
    return (
      <Notice
        text={
          item.return_status === "approved"
            ? "این بازی قبلاً بازگردانده شده و اعتبار آن واریز شده است."
            : item.return_status === "refused"
              ? "درخواست بازگشت این بازی رد شده است."
              : "درخواست بازگشت شما در حال بررسی است."
        }
      />
    )
  }

  async function submit() {
    if (!video || !agreed || !item) return
    setError("")
    setUploading(true)
    setProgress(0)
    try {
      if (isResubmit && item.return_id) {
        await resubmitReturn(
          { returnId: item.return_id, video, agreedTerms: true },
          { onProgress: setProgress }
        )
      } else {
        await createReturn(
          { orderItemId: item.item_id, video, agreedTerms: true },
          { onProgress: setProgress }
        )
      }
      await qc.invalidateQueries({ queryKey: ["returns"] })
      navigate({ to: "/dashboard/returns", search: { page: 1 } })
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("ارسال لغو شد")
      } else {
        setError(e instanceof Error ? e.message : "خطا در ارسال درخواست")
      }
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <GameSummary item={item} />
      <CreditEstimate item={item} />
      <RulesCard />

      <div className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
        <p className="mb-3 text-sm font-semibold">ویدیوی خروج از حساب</p>
        <p className="mb-4 text-xs text-muted-foreground">
          ویدیویی ضبط کنید که در آن حساب را از کنسول خود حذف/خارج می‌کنید. ویدیو
          نباید هیچ بُرش یا ویرایشی داشته باشد.
        </p>
        <VideoUpload
          value={video}
          onChange={setVideo}
          uploading={uploading}
          progress={progress}
          disabled={uploading}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-sm">
        <input
          type="checkbox"
          checked={agreed}
          disabled={uploading}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span className="text-sm text-muted-foreground">
          <Link
            to="/returns/rules"
            target="_blank"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            قوانین و شرایط بازگشت
          </Link>{" "}
          را خوانده‌ام و می‌پذیرم. می‌دانم در صورت تخلف (مثل بُرش‌خوردگی ویدیو)
          هیچ اعتبار یا بازگشتی تعلق نمی‌گیرد.
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full"
        disabled={!video || !agreed || uploading}
        onClick={submit}
      >
        {uploading
          ? `در حال ارسال… ${progress.toLocaleString("fa-IR")}٪`
          : isResubmit
            ? "ارسال مجدد درخواست"
            : "ثبت درخواست بازگشت"}
      </Button>
    </div>
  )
}

function GameSummary({ item }: { item: OwnedItem }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{item.game_name}</span>
        <Badge
          variant="secondary"
          className={cn("border text-xs", platformBadgeClass(item.console))}
        >
          {consoleLabel(item.console)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {capacityLabel(item.capacity)}
        </span>
      </div>
    </div>
  )
}

function CreditEstimate({ item }: { item: OwnedItem }) {
  const est = item.estimate
  return (
    <div className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="size-4" />
        اعتبار تقریبی بازگشت
      </div>
      {est.available ? (
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-2xl font-bold text-primary tabular-nums">
            {formatToman(est.net_credit)}
          </span>
          {est.promo && (
            <>
              <span className="text-sm text-muted-foreground tabular-nums line-through">
                {formatToman(est.normal_credit)}
              </span>
              <Badge
                variant="secondary"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              >
                تخفیف کارمزد بازگشت
              </Badge>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          این بازی در حال حاضر در فروشگاه موجود نیست؛ مبلغ اعتبار پس از بررسی
          توسط ما تعیین می‌شود.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        مبلغ نهایی پس از تأیید درخواست توسط پشتیبانی قطعی می‌شود و به کیف پول
        شما واریز می‌گردد.
      </p>
    </div>
  )
}

function RulesCard() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-orange-500" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-orange-600 dark:text-orange-400">
          پیش از ارسال حتماً بخوانید
        </p>
        <p className="text-muted-foreground">
          ویدیو باید بدون هیچ بُرش یا ویرایشی باشد. در صورت تخلف، حتی اگر حساب و
          اکانت خود را حذف کرده باشید، هیچ اقدامی انجام نمی‌شود — نه بازگشت وجه،
          نه بازگرداندن بازی.{" "}
          <Link
            to="/returns/rules"
            target="_blank"
            className="text-primary underline underline-offset-4"
          >
            مطالعه‌ی کامل قوانین
          </Link>
        </p>
      </div>
    </div>
  )
}

function Notice({ text }: { text: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-border/60 bg-card/75 p-8 text-center backdrop-blur-sm">
        <p className="mb-4 text-sm text-muted-foreground">{text}</p>
        <Link to="/dashboard/games" search={{ page: 1 }}>
          <Button variant="outline" size="sm">
            بازگشت به بازی‌های من
          </Button>
        </Link>
      </div>
    </div>
  )
}

function ReturnSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  )
}
