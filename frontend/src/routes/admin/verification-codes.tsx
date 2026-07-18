import {
  createFileRoute,
  ErrorComponent,
  Link,
  useNavigate,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useMutation,
  useQueryClient,
  useQueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Suspense, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  KeyRound,
  Search,
  ShieldCheck,
  TimerOff,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardHeader } from "@/components/dashboard-shell"
import { Pagination } from "@/components/pagination"
import {
  sendFreshVerificationCode,
  verificationRequestsQueryOptions,
} from "@/features/verification-codes"
import type {
  AdminVerificationRequest,
  DuplicateVerificationCodeError,
  VerificationCodeMatch,
  VerificationRequestStatus,
} from "@/features/verification-codes"
import {
  capacityLabel,
  consoleLabel,
  platformBadgeClass,
} from "@/features/games"
import { ApiError } from "@/lib/api-client"
import { cn } from "@/lib/utils"

type QueueSearch = {
  page: number
  status: VerificationRequestStatus | ""
  search: string
}

const FILTERS: { value: QueueSearch["status"]; label: string }[] = [
  { value: "", label: "همه" },
  { value: "pending", label: "در انتظار ارسال" },
  { value: "delivered", label: "معتبر" },
  { value: "expired", label: "منقضی‌شده" },
]

const STATUS_META = {
  pending: {
    label: "در انتظار ارسال",
    icon: Clock3,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  delivered: {
    label: "ارسال‌شده و معتبر",
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  expired: {
    label: "منقضی‌شده",
    icon: TimerOff,
    className: "border-border bg-muted/60 text-muted-foreground",
  },
} as const

function VerificationQueueError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/verification-codes")({
  validateSearch: (search: Record<string, unknown>): QueueSearch => ({
    page: Math.max(1, Number(search.page) || 1),
    status: ["pending", "delivered", "expired"].includes(String(search.status))
      ? (search.status as VerificationRequestStatus)
      : "",
    search: typeof search.search === "string" ? search.search : "",
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(verificationRequestsQueryOptions(deps))
  },
  component: VerificationQueuePage,
  errorComponent: VerificationQueueError,
})

function VerificationQueuePage() {
  const { reset } = useQueryErrorResetBoundary()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/verification-codes" })
  const [term, setTerm] = useState(search.search)

  return (
    <>
      <DashboardHeader
        title="کدهای ورود مجدد"
        description="درخواست‌های مشتریانی که برای ورود دوباره به حساب به کد تازه نیاز دارند"
      />

      <Alert variant="info" className="mb-6">
        <ShieldCheck className="size-4" />
        <AlertTitle>کدها فقط ۲۴ ساعت نگهداری می‌شوند</AlertTitle>
        <AlertDescription>
          پس از پایان مهلت، کد به‌طور خودکار از پایگاه داده حذف می‌شود اما
          سابقهٔ بدون کد برای پیگیری باقی می‌ماند.
        </AlertDescription>
      </Alert>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          navigate({ search: { ...search, search: term.trim(), page: 1 } })
        }}
      >
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="نام بازی، کاربر، موبایل یا شماره سفارش"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" size="icon" aria-label="جستجو">
          <Search className="size-4" />
        </Button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={search.status === filter.value ? "default" : "outline"}
            onClick={() =>
              navigate({
                search: { ...search, status: filter.value, page: 1 },
              })
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری درخواست‌های کد
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<QueueSkeleton />}>
          <VerificationQueue />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

type DuplicateState = {
  requestId: string
  code: string
  matches: VerificationCodeMatch[]
}

function VerificationQueue() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/verification-codes" })
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(verificationRequestsQueryOptions(search))
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [duplicate, setDuplicate] = useState<DuplicateState | null>(null)
  const mutation = useMutation({
    mutationFn: ({
      requestId,
      code,
      allowDuplicate,
    }: {
      requestId: string
      code: string
      allowDuplicate: boolean
    }) => sendFreshVerificationCode(requestId, code, allowDuplicate),
    onSuccess: () => {
      setDuplicate(null)
      queryClient.invalidateQueries({
        queryKey: ["admin", "verification-code-requests"],
      })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast.success("کد ورود برای مشتری ثبت شد")
    },
    onError: (error, variables) => {
      const matches = duplicateMatchesFrom(error)
      if (matches) {
        setDuplicate({
          requestId: variables.requestId,
          code: variables.code,
          matches,
        })
        return
      }
      toast.error(error instanceof Error ? error.message : "خطا در ارسال کد")
    },
  })

  if (data.requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75">
          <KeyRound className="size-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="font-semibold">درخواستی در این فهرست نیست</p>
          <p className="mt-1 text-sm text-muted-foreground">
            درخواست‌های ورود مجدد مشتریان اینجا نمایش داده می‌شوند.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.requests.map((request) => (
        <VerificationRow
          key={request.id}
          request={request}
          code={drafts[request.id] ?? ""}
          onCode={(code) =>
            setDrafts((current) => ({ ...current, [request.id]: code }))
          }
          duplicate={
            duplicate?.requestId === request.id ? duplicate.matches : null
          }
          pending={
            mutation.isPending && mutation.variables.requestId === request.id
          }
          onCancelDuplicate={() => setDuplicate(null)}
          onSend={(allowDuplicate) => {
            const code = (drafts[request.id] ?? "").trim()
            if (!code) {
              toast.error("کد ورود را وارد کنید")
              return
            }
            mutation.mutate({ requestId: request.id, code, allowDuplicate })
          }}
        />
      ))}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        onPage={(page) => navigate({ search: { ...search, page } })}
      />
    </div>
  )
}

function VerificationRow({
  request,
  code,
  onCode,
  duplicate,
  pending,
  onCancelDuplicate,
  onSend,
}: {
  request: AdminVerificationRequest
  code: string
  onCode: (value: string) => void
  duplicate: VerificationCodeMatch[] | null
  pending: boolean
  onCancelDuplicate: () => void
  onSend: (allowDuplicate: boolean) => void
}) {
  const meta = STATUS_META[request.status]
  const StatusIcon = meta.icon
  return (
    <article className="rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-semibold">{request.game_name}</h2>
            <Badge
              variant="secondary"
              className={cn(
                "border text-xs",
                platformBadgeClass(request.platform)
              )}
            >
              {consoleLabel(request.platform)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {capacityLabel(request.capacity)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {request.user_name.trim() || "کاربر"} ·{" "}
            <span dir="ltr" className="font-mono">
              {request.user_phone}
            </span>{" "}
            · درخواست در {formatDate(request.requested_at)}
          </p>
          <Button
            render={
              <Link
                to="/admin/orders/$orderId"
                params={{ orderId: request.order_id }}
                target="_blank"
              />
            }
            nativeButton={false}
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
          >
            سفارش #{request.order_number.toLocaleString("fa-IR")}
            <ExternalLink className="size-3" />
          </Button>
        </div>
        <Badge
          variant="secondary"
          className={cn("w-fit shrink-0 gap-1.5 border", meta.className)}
        >
          <StatusIcon className="size-3.5" />
          {meta.label}
        </Badge>
      </div>

      {request.status === "pending" && (
        <div className="mt-4 border-t border-border/60 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              dir="ltr"
              autoComplete="off"
              value={code}
              onChange={(event) => onCode(event.target.value)}
              placeholder="کد ورود تازه"
              className="sm:max-w-xs"
              disabled={pending}
            />
            <Button
              disabled={pending || !code.trim()}
              onClick={() => onSend(false)}
            >
              {pending ? "در حال ثبت…" : "ارسال کد"}
            </Button>
          </div>

          {duplicate && (
            <Alert variant="warning" className="mt-3">
              <AlertTriangle className="size-4" />
              <AlertTitle>این کد هنوز برای مشتری دیگری معتبر است</AlertTitle>
              <AlertDescription className="gap-3">
                <p>
                  ادامه دادن مسدود نیست، اما ابتدا سفارش‌های زیر را بررسی کنید
                  تا کد را اشتباهی برای دو مشتری نفرستید.
                </p>
                <div className="w-full space-y-2">
                  {duplicate.map((match) => (
                    <div
                      key={match.request_id}
                      className="rounded-lg border border-amber-500/25 bg-background/50 p-3"
                    >
                      <p className="text-xs">
                        {match.game_name} · {match.user_name.trim() || "کاربر"}{" "}
                        ·{" "}
                        <span dir="ltr" className="font-mono">
                          {match.user_phone}
                        </span>
                      </p>
                      <Button
                        render={
                          <Link
                            to="/admin/orders/$orderId"
                            params={{ orderId: match.order_id }}
                            target="_blank"
                          />
                        }
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                      >
                        مشاهده سفارش #
                        {match.order_number.toLocaleString("fa-IR")}
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex w-full flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={onCancelDuplicate}
                  >
                    بازگشت و اصلاح
                  </Button>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => onSend(true)}
                  >
                    با اطلاع از تکراری بودن ارسال کن
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {request.status === "delivered" && request.code && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            <p className="text-xs text-muted-foreground">کد فعال</p>
            <p dir="ltr" className="font-mono text-sm font-semibold">
              {request.code}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            انقضا: {formatDate(request.expires_at)}
          </p>
        </div>
      )}
      {request.status === "expired" && (
        <p className="mt-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          کد منقضی شده و مقدار آن از پایگاه داده حذف شده است.
        </p>
      )}
    </article>
  )
}

function duplicateMatchesFrom(error: unknown): VerificationCodeMatch[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  const data = error.data as Partial<DuplicateVerificationCodeError> | null
  if (
    !data ||
    data.code !== "DUPLICATE_VERIFICATION_CODE" ||
    !Array.isArray(data.matches)
  )
    return null
  return data.matches
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function QueueSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border/60 bg-card/75 p-4"
        >
          <div className="flex justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-7 w-36" />
            </div>
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
