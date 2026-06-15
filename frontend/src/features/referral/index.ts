// Referral capture. A `?ref=CODE` link (or a code typed at checkout) is kept in
// localStorage with last-touch semantics + a 30-day expiry. It's sent as the
// order's referral_code at checkout and stamped onto the account at signup.
const KEY = "z-games-ref"
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

type Stored = { code: string; at: number }

export function captureReferral(code: string) {
  if (typeof window === "undefined") return
  const c = code.trim()
  if (!c) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: c, at: Date.now() } satisfies Stored))
  } catch {
    // storage unavailable (private mode / quota) — referral is best-effort
  }
}

export function getReferral(): string {
  if (typeof window === "undefined") return ""
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return ""
    const s = JSON.parse(raw) as Stored | null
    if (!s || typeof s.code !== "string" || typeof s.at !== "number") return ""
    if (Date.now() - s.at > MAX_AGE_MS) {
      localStorage.removeItem(KEY)
      return ""
    }
    return s.code
  } catch {
    return ""
  }
}

// setReferral is used by the manual checkout field. Empty clears it.
export function setReferral(code: string) {
  if (typeof window === "undefined") return
  const c = code.trim()
  if (!c) {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
    return
  }
  captureReferral(c)
}
