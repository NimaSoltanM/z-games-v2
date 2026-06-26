import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { captureReferral, getReferral, setReferral } from "./index"

const KEY = "z-games-ref"
const DAY = 24 * 60 * 60 * 1000

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("captureReferral / getReferral", () => {
  it("stores and reads back a code", () => {
    captureReferral("FRIEND10")
    expect(getReferral()).toBe("FRIEND10")
  })

  it("trims surrounding whitespace", () => {
    captureReferral("  FRIEND10  ")
    expect(getReferral()).toBe("FRIEND10")
  })

  it("ignores an empty / whitespace-only code", () => {
    captureReferral("   ")
    expect(getReferral()).toBe("")
  })

  it("uses last-touch: a later capture overwrites the earlier one", () => {
    captureReferral("FIRST")
    captureReferral("SECOND")
    expect(getReferral()).toBe("SECOND")
  })

  it("returns empty when nothing was captured", () => {
    expect(getReferral()).toBe("")
  })
})

describe("expiry (30-day window)", () => {
  it("returns the code within the window", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    captureReferral("STILLGOOD")
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + 29 * DAY)
    expect(getReferral()).toBe("STILLGOOD")
  })

  it("drops and clears the code once past 30 days", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    captureReferral("EXPIRED")
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + 31 * DAY)
    expect(getReferral()).toBe("")
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})

describe("malformed storage", () => {
  it("returns empty for non-JSON garbage", () => {
    localStorage.setItem(KEY, "not-json{")
    expect(getReferral()).toBe("")
  })

  it("returns empty for a JSON value of the wrong shape", () => {
    localStorage.setItem(KEY, JSON.stringify({ nope: true }))
    expect(getReferral()).toBe("")
  })
})

describe("setReferral", () => {
  it("clears the stored code when given an empty value", () => {
    captureReferral("FRIEND10")
    setReferral("")
    expect(getReferral()).toBe("")
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it("updates the stored code when given a value", () => {
    captureReferral("OLD")
    setReferral("NEW")
    expect(getReferral()).toBe("NEW")
  })
})
