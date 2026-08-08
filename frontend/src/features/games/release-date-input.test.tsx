import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReleaseDateInput, releaseDateInputValue } from "./release-date-input"

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

describe("ReleaseDateInput", () => {
  const mounted: Array<ReturnType<typeof createRoot>> = []

  afterEach(() => {
    for (const root of mounted) {
      act(() => root.unmount())
    }
    mounted.length = 0
  })

  it("initializes a native date input from an API timestamp", () => {
    const container = document.createElement("div")
    const root = createRoot(container)
    mounted.push(root)

    act(() => {
      root.render(
        <ReleaseDateInput
          id="release-date"
          label="تاریخ انتشار"
          value={releaseDateInputValue("2026-09-25T00:00:00Z")}
          onValueChange={() => undefined}
        />
      )
    })

    const input =
      container.querySelector<HTMLInputElement>('input[type="date"]')
    expect(input?.value).toBe("2026-09-25")
  })

  it("commits a native date input event immediately", () => {
    const container = document.createElement("div")
    const root = createRoot(container)
    mounted.push(root)
    const onValueChange = vi.fn()

    act(() => {
      root.render(
        <ReleaseDateInput
          id="release-date"
          label="تاریخ انتشار"
          value=""
          onValueChange={onValueChange}
        />
      )
    })

    const input =
      container.querySelector<HTMLInputElement>('input[type="date"]')
    expect(input).not.toBeNull()

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set
      valueSetter?.call(input, "2026-11-19")
      input?.dispatchEvent(new Event("input", { bubbles: true }))
    })

    expect(onValueChange).toHaveBeenCalledOnce()
    expect(onValueChange).toHaveBeenCalledWith("2026-11-19")
  })
})
