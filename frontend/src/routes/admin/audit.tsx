import {
  createFileRoute,
  ErrorComponent,
  useNavigate,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query"
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  Bell,
  DollarSign,
  PackageCheck,
  Image as ImageIcon,
  Activity,
  ChevronDown,
  ScrollText,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pagination } from "@/components/pagination"
import { DashboardHeader } from "@/components/dashboard-shell"
import {
  auditQueryOptions,
  auditActorsQueryOptions,
  describeAction,
  AUDIT_ACTION_LABELS,
} from "@/features/audit"
import type { AuditActor, AuditRow } from "@/features/audit"
import { cn } from "@/lib/utils"

type Search = { page: number; action: string; admin_id: string }

const ACTION_KEYS = Object.keys(AUDIT_ACTION_LABELS)

const ACTION_VISUAL: Record<string, { icon: LucideIcon; className: string }> = {
  "game.create": {
    icon: Plus,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "game.update": { icon: Pencil, className: "bg-primary/10 text-primary" },
  "game.delete": {
    icon: Trash2,
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  "game.preorder": {
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "game.alert": {
    icon: Bell,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "exchange_rate.set": {
    icon: DollarSign,
    className: "bg-primary/10 text-primary",
  },
  "order.fulfill": {
    icon: PackageCheck,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "image.upload": {
    icon: ImageIcon,
    className: "bg-muted text-muted-foreground",
  },
}
const DEFAULT_VISUAL = {
  icon: Activity,
  className: "bg-muted text-muted-foreground",
}

// Exact Jalali date + time, to the second.
function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const time = d.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  return `${date} — ${time}`
}

function actorLabel(row: AuditRow): string {
  return row.admin_name.trim() || row.admin_phone || "مدیر"
}

function AuditErrorComponent({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/admin/audit")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    page: Math.max(1, Number(s.page) || 1),
    action: typeof s.action === "string" ? s.action : "",
    admin_id: typeof s.admin_id === "string" ? s.admin_id : "",
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(auditQueryOptions(deps))
    context.queryClient.prefetchQuery(auditActorsQueryOptions())
  },
  component: AuditPage,
  errorComponent: AuditErrorComponent,
})

function AuditPage() {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <>
      <DashboardHeader
        title="تاریخچه فعالیت"
        description="هر اقدام مدیران با زمان دقیق ثبت می‌شود"
      />

      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              خطا در بارگذاری تاریخچه
            </p>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
              تلاش مجدد
            </Button>
          </div>
        )}
      >
        <Suspense fallback={<FeedSkeleton />}>
          <AuditContent />
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

function AuditContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: "/admin/audit" })
  const { data } = useSuspenseQuery(auditQueryOptions(search))
  const { data: actorsData } = useSuspenseQuery(auditActorsQueryOptions())

  const setAction = (action: string) =>
    navigate({ search: { ...search, action, page: 1 } })
  const setAdmin = (admin_id: string) =>
    navigate({ search: { ...search, admin_id, page: 1 } })

  return (
    <div className="space-y-5">
      <Filters
        action={search.action}
        adminId={search.admin_id}
        actors={actorsData.actors}
        onAction={setAction}
        onAdmin={setAdmin}
      />

      {data.actions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/75">
            <ScrollText className="size-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">
            {search.action || search.admin_id
              ? "موردی با این فیلترها پیدا نشد"
              : "هنوز فعالیتی ثبت نشده است"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {data.pagination.total.toLocaleString("fa-IR")} مورد
          </p>
          {data.actions.map((row) => (
            <ActionItem key={row.id} row={row} />
          ))}
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.total_pages}
            onPage={(p) => navigate({ search: { ...search, page: p } })}
          />
        </div>
      )}
    </div>
  )
}

function Filters({
  action,
  adminId,
  actors,
  onAction,
  onAdmin,
}: {
  action: string
  adminId: string
  actors: AuditActor[]
  onAction: (a: string) => void
  onAdmin: (id: string) => void
}) {
  const selectedActor = actors.find((a) => a.id === adminId)
  const adminLabel = adminId
    ? selectedActor?.name.trim() || selectedActor?.phone || "مدیر"
    : "همه مدیران"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="scrollbar-none overflow-x-auto">
        <ToggleGroup
          value={[action || "all"]}
          onValueChange={(v) => v[0] && onAction(v[0] === "all" ? "" : v[0])}
          variant="outline"
          size="sm"
          spacing={0}
        >
          <ToggleGroupItem value="all" className="px-3 text-xs">
            همه
          </ToggleGroupItem>
          {ACTION_KEYS.map((key) => (
            <ToggleGroupItem
              key={key}
              value={key}
              className="px-3 text-xs whitespace-nowrap"
            >
              {AUDIT_ACTION_LABELS[key]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="gap-1.5">
              {adminLabel}
              <ChevronDown className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="max-h-72 w-52 overflow-y-auto"
        >
          <DropdownMenuItem onClick={() => onAdmin("")}>
            همه مدیران
          </DropdownMenuItem>
          {actors.map((a) => (
            <DropdownMenuItem key={a.id} onClick={() => onAdmin(a.id)}>
              <span className="truncate">
                {a.name.trim() || a.phone || "مدیر"}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function ActionItem({ row }: { row: AuditRow }) {
  const desc = describeAction(row)
  const visual = ACTION_VISUAL[row.action] ?? DEFAULT_VISUAL
  const Icon = visual.icon

  return (
    <div className="rounded-xl border border-border/60 bg-card/75 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            visual.className
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">{actorLabel(row)}</span>{" "}
            <span className="text-muted-foreground">{desc.text}</span>
          </p>
          {desc.details.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {desc.details.map((d, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground tabular-nums"
                >
                  • {d}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground/80 tabular-nums">
            {formatTimestamp(row.created_at)}
          </p>
        </div>
      </div>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-full max-w-md rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card/75 p-4"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
