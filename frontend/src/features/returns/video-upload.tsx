import { useEffect, useRef, useState } from "react"
import { Film, RefreshCw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ACCEPTED_VIDEO_TYPES, MAX_VIDEO_BYTES } from "./api"

type Props = {
  /** The currently selected video file, or null when none is picked. */
  value: File | null
  /** Reports the picked file (or null on clear). The parent uploads it on submit. */
  onChange: (file: File | null) => void
  /** True while the parent is uploading this file — shows the progress bar. */
  uploading?: boolean
  /** Upload progress 0–100, driven by the parent's submit. */
  progress?: number
  disabled?: boolean
  className?: string
}

// A self-contained video picker for return clips: click or drag-drop a file, it
// validates type + size client-side (mirroring the server), previews it inline,
// and overlays a live progress bar while the parent uploads on submit. It does NOT
// upload on its own — the proof video is sent together with the accepted terms when
// the return form is submitted.
export function VideoUpload({
  value,
  onChange,
  uploading = false,
  progress = 0,
  disabled,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Keep an object URL for the <video> preview alive only while a file is selected.
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const busy = disabled || uploading
  const openPicker = () => inputRef.current?.click()

  function handleFile(file: File) {
    setError(null)
    const isVideo =
      ACCEPTED_VIDEO_TYPES.includes(file.type) ||
      /\.(mp4|mov|webm)$/i.test(file.name)
    if (!isVideo) {
      setError("فقط فایل ویدیویی (MP4، MOV یا WebM) مجاز است")
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("حجم ویدیو بیش از حد مجاز است (حداکثر ۵۰ مگابایت)")
      return
    }
    onChange(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = "" // allow re-picking the same file after a clear
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (busy) return
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_VIDEO_TYPES, ".mp4", ".mov", ".webm"].join(",")}
        className="hidden"
        onChange={onInputChange}
        disabled={busy}
      />

      {value && previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background/60">
          <video
            src={previewUrl}
            controls
            className="aspect-video w-full bg-black"
          />

          {uploading ? (
            <div className="space-y-1.5 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>در حال بارگذاری…</span>
                <span className="font-medium text-foreground tabular-nums">
                  {progress.toLocaleString("fa-IR")}٪
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2">
              <span className="min-w-0 flex-1 truncate px-1 text-xs text-muted-foreground">
                {value.name}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 gap-1.5 text-xs"
                disabled={busy}
                onClick={openPicker}
              >
                <RefreshCw className="size-3" />
                تعویض
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={() => {
                  setError(null)
                  onChange(null)
                }}
                aria-label="حذف ویدیو"
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault()
            if (!busy) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background/40 p-4 text-center transition-colors",
            dragging
              ? "border-primary/60 bg-primary/5"
              : "border-border/60 hover:border-primary/40",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <Film className="size-7 text-muted-foreground/60" />
          <span className="text-sm font-medium">انتخاب یا کشیدن ویدیو</span>
          <span className="text-[11px] text-muted-foreground">
            MP4، MOV یا WebM تا ۵۰ مگابایت
          </span>
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
