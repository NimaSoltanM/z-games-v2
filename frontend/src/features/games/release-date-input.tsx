import type { FormEvent } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ReleaseDateInputProps = {
  id: string
  label: string
  value: string
  onValueChange: (value: string) => void
  inputClassName?: string
}

// API timestamps include a time and zone, while a native date input accepts only
// YYYY-MM-DD. Keeping the conversion here makes create/edit and quick actions use
// the same lossless value.
export function releaseDateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : ""
}

export function ReleaseDateInput({
  id,
  label,
  value,
  onValueChange,
  inputClassName,
}: ReleaseDateInputProps) {
  const handleInput = (event: FormEvent<HTMLInputElement>) => {
    onValueChange(event.currentTarget.value)
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        dir="ltr"
        className={inputClassName}
        value={value}
        onInput={handleInput}
      />
    </div>
  )
}
