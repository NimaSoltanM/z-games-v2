import { useRef, useState } from "react"
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  resolveMediaUrl,
  uploadImage,
} from "./api"
import {
  downscaleImage,
  ImageTooSmallError,
  MIN_COVER_HEIGHT,
  MIN_COVER_WIDTH,
} from "./image-utils"

type Props = {
  /** Stored image path (e.g. "/uploads/x.jpg") or null when none is set. */
  value: string | null
  /** Called with the new stored path after a successful upload, or null on clear. */
  onChange: (url: string | null) => void
  disabled?: boolean
  className?: string
  /** Sizing for the preview/dropzone box. Defaults to a cover-friendly 3:4. */
  boxClassName?: string
  /** Center-crop uploads to this width/height ratio. Defaults to 3:4; pass null to keep aspect. */
  cropAspect?: number | null
}

// A self-contained image picker: click, drag-drop, or paste a file; it crops +
// downscales client-side, uploads with a live progress bar (cancelable), then
// reports the stored path via onChange. Shows the current image with
// replace/remove controls once one is set. Validation mirrors the server.
export function ImageUpload({
  value,
  onChange,
  disabled,
  className,
  boxClassName = "aspect-3/4 w-40",
  cropAspect = 3 / 4,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState("") // announced via aria-live

  const busy = disabled || uploading
  const openPicker = () => inputRef.current?.click()

  async function handleFile(file: File) {
    setError(null)
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("فقط فایل تصویری (JPEG، PNG، WebP یا AVIF) مجاز است")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("حجم تصویر بیش از حد مجاز است (حداکثر ۵ مگابایت)")
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setUploading(true)
    setProgress(0)
    setStatus("در حال بارگذاری تصویر")
    try {
      const prepared = await downscaleImage(file, {
        aspect: cropAspect ?? undefined,
        minWidth: MIN_COVER_WIDTH,
        minHeight: MIN_COVER_HEIGHT,
      })
      const { url } = await uploadImage(prepared, {
        onProgress: setProgress,
        signal: controller.signal,
      })
      onChange(url)
      setStatus("تصویر بارگذاری شد")
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setStatus("بارگذاری لغو شد")
      } else {
        const msg =
          e instanceof ImageTooSmallError
            ? "وضوح تصویر کافی نیست (حداقل ۶۰۰×۸۰۰ پیکسل)"
            : e instanceof Error
              ? e.message
              : "خطا در بارگذاری تصویر"
        setError(msg)
        setStatus(msg)
      }
    } finally {
      setUploading(false)
      abortRef.current = null
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = "" // let the same file be re-picked after a clear
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (busy) return
    const { files } = e.dataTransfer
    if (files.length > 0) handleFile(files[0])
  }

  function onPaste(e: React.ClipboardEvent) {
    if (busy) return
    const file = Array.from(e.clipboardData.files).find((f) =>
      f.type.startsWith("image/")
    )
    if (file) {
      e.preventDefault()
      handleFile(file)
    }
  }

  const cancel = () => abortRef.current?.abort()

  return (
    <div className={cn("space-y-2", className)} onPaste={onPaste}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={onInputChange}
        disabled={busy}
      />

      {value ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-border/60",
            boxClassName
          )}
        >
          <img
            src={resolveMediaUrl(value)}
            alt="تصویر بارگذاری‌شده"
            className="h-full w-full object-cover"
          />
          {uploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 backdrop-blur-sm">
              <ProgressRingLabel progress={progress} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={cancel}
              >
                لغو
              </Button>
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-linear-to-t from-background/90 to-transparent p-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 flex-1 gap-1.5 text-xs"
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
                aria-label="حذف تصویر"
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
          onClick={uploading ? cancel : openPicker}
          onDragOver={(e) => {
            e.preventDefault()
            if (!busy) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background/40 p-4 text-center transition-colors",
            boxClassName,
            dragging
              ? "border-primary/60 bg-primary/5"
              : "border-border/60 hover:border-primary/40",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          {uploading ? (
            <>
              <ProgressRingLabel progress={progress} />
              <span className="text-[11px] text-muted-foreground">
                برای لغو کلیک کنید
              </span>
            </>
          ) : (
            <>
              <ImagePlus className="size-6 text-muted-foreground/60" />
              <span className="text-xs font-medium">
                انتخاب، کشیدن یا چسباندن تصویر
              </span>
              <span className="text-[11px] text-muted-foreground">
                JPEG، PNG، WebP یا AVIF تا ۵ مگابایت
              </span>
              <span className="text-[11px] text-muted-foreground">
                حداقل وضوح ۶۰۰×۸۰۰ پیکسل
              </span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </div>
  )
}

// A compact spinner + percentage shown during an upload.
function ProgressRingLabel({ progress }: { progress: number }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      <span className="text-xs font-medium tabular-nums">
        {progress.toLocaleString("fa-IR")}٪
      </span>
    </div>
  )
}
