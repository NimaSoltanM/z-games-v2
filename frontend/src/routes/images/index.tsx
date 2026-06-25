import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { Check, Copy, ExternalLink, FlaskConical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ImageUpload, resolveMediaUrl, uploadImage } from "@/features/uploads"

function ImagesError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/images/")({
  component: ImagesPage,
  errorComponent: ImagesError,
})

function ImagesPage() {
  // Every successful upload (from any panel) is logged here so we can prove the
  // serve route + cross-origin loading actually render in the browser.
  const [gallery, setGallery] = useState<string[]>([])
  const logUpload = (url: string | null) => {
    if (url) setGallery((g) => (g.includes(url) ? g : [url, ...g]))
  }

  return (
    <div className="relative min-h-screen bg-background bg-grid-lines">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <FlaskConical className="size-5" />
            <h1 className="text-2xl font-bold">صفحه‌ی تست بارگذاری تصویر</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            این صفحه برای آزمایش کامل سیستم آپلود است. بارگذاری نیازمند ورود با حساب ادمین است؛ در غیر
            این صورت پیام خطای دسترسی نمایش داده می‌شود.
          </p>
          <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
            <li>کلیک روی کادر، کشیدن فایل، یا چسباندن تصویر از کلیپ‌بورد (Ctrl+V)</li>
            <li>نوار پیشرفت و دکمه‌ی «لغو» حین بارگذاری</li>
            <li>«تعویض» و «حذف» تصویر بارگذاری‌شده</li>
            <li>برش خودکار به نسبت‌های مختلف (پایین‌تر)</li>
            <li>پنل «آپلود خام» برای آزمایش ردّ شدن فایل غیرتصویری/بزرگ توسط سرور</li>
          </ul>
        </div>

        <Section title="۱) آپلودر اصلی (برش ۳:۴، مثل کاور بازی)">
          <SingleUploader cropAspect={3 / 4} boxClassName="aspect-3/4 w-40" onUploaded={logUpload} />
        </Section>

        <Section title="۲) نسبت‌های برش مختلف">
          <div className="flex flex-wrap gap-8">
            <Labeled label="مربع ۱:۱">
              <SingleUploader cropAspect={1} boxClassName="aspect-square w-36" onUploaded={logUpload} />
            </Labeled>
            <Labeled label="عریض ۱۶:۹">
              <SingleUploader cropAspect={16 / 9} boxClassName="aspect-video w-56" onUploaded={logUpload} />
            </Labeled>
            <Labeled label="بدون برش (نسبت اصلی)">
              <SingleUploader cropAspect={null} boxClassName="aspect-3/4 w-36" onUploaded={logUpload} />
            </Labeled>
          </div>
        </Section>

        <Section title="۳) آپلود خام — آزمایش اعتبارسنجی سرور">
          <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
            این پنل فایل را بدون اعتبارسنجی و فشرده‌سازی سمت کلاینت مستقیم به سرور می‌فرستد. یک فایل
            غیرتصویری (مثل .txt) یا تصویر بزرگ‌تر از ۵ مگابایت را امتحان کنید تا پیام خطای واقعی سرور را
            ببینید.
          </p>
          <RawUploader onUploaded={logUpload} />
        </Section>

        <Section title="۴) تصاویر سرو شده در این نشست">
          {gallery.length === 0 ? (
            <p className="text-xs text-muted-foreground">هنوز تصویری بارگذاری نشده است.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                اگر تصاویر زیر نمایش داده شوند، سرو شدن از سرور و بارگذاری بین‌مبدأ (cross-origin) درست
                کار می‌کند.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((url) => (
                  <ServedImage key={url} url={url} />
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

// A single ImageUpload plus a readout of the stored path it produced.
function SingleUploader({
  cropAspect,
  boxClassName,
  onUploaded,
}: {
  cropAspect: number | null
  boxClassName: string
  onUploaded: (url: string | null) => void
}) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div className="space-y-2">
      <ImageUpload
        value={value}
        boxClassName={boxClassName}
        cropAspect={cropAspect}
        onChange={(url) => {
          setValue(url)
          onUploaded(url)
        }}
      />
      {value && <PathReadout path={value} />}
    </div>
  )
}

// Sends an arbitrary file straight to the upload endpoint (no client-side checks)
// so the server's validation can be exercised, with live progress + cancel.
function RawUploader({ onUploaded }: { onUploaded: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send(file: File) {
    setError(null)
    setResult(null)
    setProgress(0)
    setBusy(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { url } = await uploadImage(file, { onProgress: setProgress, signal: controller.signal })
      setResult(url)
      onUploaded(url)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") setError("بارگذاری لغو شد")
      else setError(e instanceof Error ? e.message : "خطا")
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) send(f)
          e.target.value = ""
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          انتخاب هر فایلی
        </Button>
        {busy && (
          <>
            <span className="text-xs tabular-nums text-muted-foreground">
              {progress.toLocaleString("fa-IR")}٪
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={() => abortRef.current?.abort()}>
              لغو
            </Button>
          </>
        )}
      </div>
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          خطای سرور: {error}
        </p>
      )}
      {result && (
        <div className="space-y-2">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">بارگذاری موفق بود.</p>
          <PathReadout path={result} />
        </div>
      )}
    </div>
  )
}

// Shows a stored path, its resolved absolute URL, a copy button, and an open link.
function PathReadout({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)
  const absolute = resolveMediaUrl(path)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div className="rounded-lg border border-border/50 bg-background/50 p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span dir="ltr" className="truncate font-mono text-muted-foreground">
          {path}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" size="icon" variant="ghost" className="size-6" onClick={copy} aria-label="کپی مسیر">
            {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
          </Button>
          <a href={absolute} target="_blank" rel="noopener noreferrer" aria-label="باز کردن تصویر">
            <Button type="button" size="icon" variant="ghost" className="size-6">
              <ExternalLink className="size-3" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}

// Renders a served image (object-contain so its true stored aspect is visible),
// proving the GET /uploads/* route + cross-origin loading work.
function ServedImage({ url }: { url: string }) {
  return (
    <div className="space-y-1">
      <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background/40">
        <img src={resolveMediaUrl(url)} alt="تصویر سرو شده" className="max-h-full max-w-full object-contain" />
      </div>
      <Separator />
    </div>
  )
}
