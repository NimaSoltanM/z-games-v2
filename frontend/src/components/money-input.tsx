import type { ComponentProps } from "react"

import { Input } from "@/components/ui/input"

// Strips a typed value down to the raw number string we store (digits, plus one
// dot when decimals are allowed). Grouping separators are removed.
function clean(s: string, decimals: boolean): string {
  const v = s.replace(/[^\d.]/g, "")
  if (!decimals) return v.replace(/\./g, "")
  const firstDot = v.indexOf(".")
  if (firstDot === -1) return v
  // Keep only the first dot.
  return v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "")
}

// Formats the stored raw string for display with thousands separators, e.g.
// "95000" → "95,000" and "1234.5" → "1,234.5".
function format(raw: string, decimals: boolean): string {
  if (raw === "") return ""
  if (!decimals) {
    const digits = raw.replace(/\D/g, "")
    return digits === "" ? "" : Number(digits).toLocaleString("en-US")
  }
  const dot = raw.indexOf(".")
  const intDigits = (dot === -1 ? raw : raw.slice(0, dot)).replace(/\D/g, "")
  const intFmt =
    intDigits === "" ? "0" : Number(intDigits).toLocaleString("en-US")
  if (dot === -1) return intFmt
  const frac = raw.slice(dot + 1).replace(/\D/g, "")
  return `${intFmt}.${frac}`
}

type Props = {
  /** Raw number string (no separators), e.g. "95000" or "69.99". */
  value: string
  onChange: (raw: string) => void
  /** Allow a decimal point (USD prices). Default: integer-only (Toman). */
  decimals?: boolean
} & Omit<ComponentProps<typeof Input>, "value" | "onChange">

// A number input that shows grouped thousands as the admin types while storing a
// clean raw string. Used for Toman prices / exchange rate (integer) and USD
// prices (decimals).
export function MoneyInput({
  value,
  onChange,
  decimals = false,
  ...props
}: Props) {
  return (
    <Input
      dir="ltr"
      inputMode="decimal"
      value={format(value, decimals)}
      onChange={(e) => onChange(clean(e.target.value, decimals))}
      {...props}
    />
  )
}
