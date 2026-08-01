import { cn } from "@/lib/utils"
import React from "react"

export function BackgroundGradient({
  children,
  className,
  containerClassName,
}: {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
}) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-linear-to-br from-primary/35 via-border to-primary/10 p-px",
        containerClassName
      )}
    >
      <div className={cn("rounded-[inherit]", className)}>{children}</div>
    </div>
  )
}
