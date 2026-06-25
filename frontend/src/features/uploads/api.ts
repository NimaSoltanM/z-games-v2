// Allowed image types + size cap, mirrored from the backend so the UI can reject
// bad files before spending a round trip. Keep in sync with internal/modules/uploads.
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export type UploadOptions = {
  /** Reports upload progress as a 0–100 percentage. */
  onProgress?: (percent: number) => void
  /** Aborts the in-flight upload. */
  signal?: AbortSignal
}

// Uploads one image to the admin-only endpoint and returns its stored path
// (e.g. "/uploads/ab12….jpg"). Uses XHR (not fetch) so the UI can show real
// upload progress and cancel mid-flight. Rejects with an AbortError when aborted.
export function uploadImage(file: File, opts: UploadOptions = {}): Promise<{ url: string }> {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3002"
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${apiUrl}/uploads`)
    xhr.withCredentials = true
    xhr.responseType = "json"

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      const body = xhr.response ?? {}
      if (xhr.status >= 200 && xhr.status < 300 && body?.url) {
        resolve({ url: body.url as string })
      } else {
        reject(new Error(body?.message ?? "خطا در بارگذاری تصویر"))
      }
    }
    xhr.onerror = () => reject(new Error("خطا در اتصال به سرور"))
    xhr.onabort = () => reject(new DOMException("Upload aborted", "AbortError"))

    if (opts.signal) {
      if (opts.signal.aborted) {
        reject(new DOMException("Upload aborted", "AbortError"))
        return
      }
      opts.signal.addEventListener("abort", () => xhr.abort(), { once: true })
    }

    const form = new FormData()
    form.append("file", file)
    xhr.send(form)
  })
}

// Resolves a stored media path to a loadable URL: an absolute URL is used as-is,
// a server-relative path is prefixed with the API origin.
export function resolveMediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3002"
  return `${apiUrl}${path}`
}
