import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// Shared page navigator. RTL: "قبلی" (previous) sits on the right via flow order.
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronRight className="size-4" />
        قبلی
      </Button>

      <div className="hidden items-center gap-1 sm:flex">
        {getPages(page, totalPages).map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e-${i}`} className="px-1 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-9"
              onClick={() => onPage(p)}
            >
              {p}
            </Button>
          )
        )}
      </div>

      <span className="px-3 text-sm tabular-nums text-muted-foreground sm:hidden">
        {page} / {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
      >
        بعدی
        <ChevronLeft className="size-4" />
      </Button>
    </div>
  )
}

function getPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "ellipsis")[] = [1]
  if (current > 3) pages.push("ellipsis")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("ellipsis")
  pages.push(total)
  return pages
}
