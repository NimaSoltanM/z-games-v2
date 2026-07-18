import { apiFetch } from "@/lib/api-client"
import type { AdminReturnDetail } from "./types"

// Allowed video types + size cap, mirrored from the backend (internal/modules/
// uploads/video.go) so the UI rejects a bad file before spending the upload.
export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
]
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002"

export type UploadOptions = {
  /** Reports upload progress as a 0–100 percentage. */
  onProgress?: (percent: number) => void
  /** Aborts the in-flight upload. */
  signal?: AbortSignal
}

// xhrSubmit posts a multipart form via XHR (not fetch) so the UI can show real
// upload progress and cancel mid-flight. Rejects with an AbortError when aborted.
function xhrSubmit(
  url: string,
  form: FormData,
  opts: UploadOptions
): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.withCredentials = true
    xhr.responseType = "json"

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      const body = xhr.response ?? {}
      if (xhr.status >= 200 && xhr.status < 300 && body?.id) {
        resolve({ id: body.id as string })
      } else {
        reject(new Error(body?.message ?? "خطا در بارگذاری ویدیو"))
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

    xhr.send(form)
  })
}

// Opens a return request for a delivered account: the proof video + the accepted
// terms. Returns the new return id.
export function createReturn(
  input: { orderItemId: string; video: File; agreedTerms: boolean },
  opts: UploadOptions = {}
): Promise<{ id: string }> {
  const form = new FormData()
  form.append("order_item_id", input.orderItemId)
  form.append("agreed_terms", input.agreedTerms ? "true" : "false")
  form.append("video", input.video)
  return xhrSubmit(`${API_URL}/returns`, form, opts)
}

// Re-uploads the video on a rejected return and reopens it for review.
export function resubmitReturn(
  input: { returnId: string; video: File; agreedTerms: boolean },
  opts: UploadOptions = {}
): Promise<{ id: string }> {
  const form = new FormData()
  form.append("agreed_terms", input.agreedTerms ? "true" : "false")
  form.append("video", input.video)
  return xhrSubmit(`${API_URL}/returns/${input.returnId}/resubmit`, form, opts)
}

// --- admin review -----------------------------------------------------------

export function approveReturn(id: string, creditAmount: number) {
  return apiFetch<AdminReturnDetail>(`/admin/returns/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ credit_amount: creditAmount }),
  })
}

export function rejectReturn(id: string, reason: string) {
  return apiFetch<AdminReturnDetail>(`/admin/returns/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

export function refuseReturn(id: string, reason: string) {
  return apiFetch<AdminReturnDetail>(`/admin/returns/${id}/refuse`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

// The admin-only video stream URL for a return (played with crossOrigin creds).
export function returnVideoUrl(id: string): string {
  return `${API_URL}/admin/returns/${id}/video`
}

export function setReturnedAccountAvailability(id: string, available: boolean) {
  return apiFetch<{ available: boolean }>(
    `/admin/returned-accounts/${id}/availability`,
    {
      method: "PATCH",
      body: JSON.stringify({ available }),
    }
  )
}
