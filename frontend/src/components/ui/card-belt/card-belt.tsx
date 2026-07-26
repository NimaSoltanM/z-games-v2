import type { ReactNode } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CardBeltProps = {
  children: ReactNode
  className?: string
  /** Accessible label for the scroll region */
  label: string
  prevLabel?: string
  nextLabel?: string
}

/**
 * Horizontal storefront card belt.
 *
 * - Mobile: free swipe with momentum + scroll-snap, cards bleed to screen edge,
 *   next card "peeks" so users know there's more.
 * - Desktop (md+): prev/next arrow buttons that page by ~one viewport,
 *   auto-disabled (faded out) at each end.
 * - RTL-safe: works with the negative scrollLeft model used by modern browsers.
 */
export function CardBelt({
  children,
  className,
  label,
  prevLabel = "قبلی",
  nextLabel = "بعدی",
}: CardBeltProps) {
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    // Math.abs makes this correct in RTL, where scrollLeft goes negative
    const pos = Math.abs(el.scrollLeft)
    setCanPrev(pos > 1)
    setCanNext(pos < max - 1)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateArrows()
    el.addEventListener("scroll", updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      ro.disconnect()
    }
  }, [updateArrows])

  const scrollByPage = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    const isRTL = getComputedStyle(el).direction === "rtl"
    el.scrollBy({
      // ~90% of a page so the last visible card stays as a landmark
      left: dir * (isRTL ? -1 : 1) * el.clientWidth * 0.9,
      behavior: "smooth",
    })
  }

  return (
    <div className={cn("group/belt relative", className)}>
      {/* Edge fade: start side */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 start-0 z-10 hidden w-12 bg-linear-to-r from-background to-transparent transition-opacity duration-200 md:block rtl:bg-linear-to-l",
          canPrev ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Edge fade: end side */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 end-0 z-10 hidden w-12 bg-linear-to-l from-background to-transparent transition-opacity duration-200 md:block rtl:bg-linear-to-r",
          canNext ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Prev button */}
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={prevLabel}
        disabled={!canPrev}
        onClick={() => scrollByPage(-1)}
        className={cn(
          "absolute start-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-card/95 shadow-lg md:flex",
          "-translate-x-1/3 rtl:translate-x-1/3",
          canPrev
            ? "opacity-0 group-hover/belt:opacity-100 focus-visible:opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
      </Button>

      {/* Next button */}
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={nextLabel}
        disabled={!canNext}
        onClick={() => scrollByPage(1)}
        className={cn(
          "absolute end-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-card/95 shadow-lg md:flex",
          "translate-x-1/3 rtl:-translate-x-1/3",
          canNext
            ? "opacity-0 group-hover/belt:opacity-100 focus-visible:opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
      </Button>

      {/* Scroller */}
      <ul
        ref={scrollerRef}
        aria-label={label}
        tabIndex={0}
        className={cn(
          "flex snap-x snap-proximity gap-3 overflow-x-auto pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          // bleed to the screen edge on mobile so the belt feels full-width
          "-mx-4 scroll-px-4 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:scroll-px-0 md:px-0",
          // hide the scrollbar (still scrollable by touch/wheel/keyboard)
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {children}
      </ul>
    </div>
  )
}

/** A single slot in the belt: fixed width + snap alignment. */
export function CardBeltItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <li className={cn("w-36 shrink-0 snap-start sm:w-44 lg:w-48", className)}>
      {children}
    </li>
  )
}
