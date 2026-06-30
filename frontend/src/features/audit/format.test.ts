import { describe, expect, it } from "vitest"

import { describeAction } from "./format"
import type { AuditMetadata, AuditRow } from "./types"

function row(
  action: string,
  metadata: AuditMetadata | null = null,
  targetId = "g1"
): AuditRow {
  return {
    id: "act1",
    admin_id: "a1",
    admin_name: "Ali",
    admin_phone: "0912",
    action,
    target_type: "game",
    target_id: targetId,
    metadata,
    created_at: "2026-06-27T10:00:00Z",
  }
}

describe("describeAction", () => {
  it("describes a game creation", () => {
    const d = describeAction(
      row("game.create", { name: "GTA V", active: true })
    )
    expect(d.text).toBe("بازی «GTA V» را ساخت")
    expect(d.details).toEqual([])
  })

  it("flags a game created as draft", () => {
    const d = describeAction(
      row("game.create", { name: "GTA V", active: false })
    )
    expect(d.details).toEqual(["به‌صورت پیش‌نویس"])
  })

  it("describes a game disable + rename + price drop", () => {
    const d = describeAction(
      row("game.update", {
        name: "GTA 5",
        changes: {
          active: { from: true, to: false },
          name: { from: "GTA V", to: "GTA 5" },
        },
        price_changes: [{ platform: "ps5", kind: "base_usd", from: 5, to: 4 }],
      })
    )
    expect(d.text).toBe("بازی «GTA 5» را ویرایش کرد")
    expect(d.details).toContain("بازی غیرفعال شد")
    expect(d.details).toContain("نام: «GTA V» ← «GTA 5»")
    expect(d.details).toContain("قیمت پایه PS5: $5 ← $4")
  })

  it("describes a console set change", () => {
    const d = describeAction(
      row("game.update", {
        name: "X",
        changes: {
          // consoles diff carries string arrays, not scalars
          consoles: { from: ["ps5"], to: ["ps5", "xbox_series"] } as never,
        },
      })
    )
    expect(d.details.some((l) => l.includes("کنسول‌ها"))).toBe(true)
    expect(d.details.some((l) => l.includes("Xbox Series"))).toBe(true)
  })

  it("renders a fixed (toman) price change with currency", () => {
    const d = describeAction(
      row("game.update", {
        name: "X",
        changes: {},
        price_changes: [
          {
            platform: "ps4",
            zarfiat: "z2",
            kind: "toman",
            from: 500000,
            to: 450000,
          },
        ],
      })
    )
    // numbers are localized to fa-IR
    expect(d.details[0]).toContain("قیمت PS4 / ظرفیت ۲")
    expect(d.details[0]).toContain("تومان")
    expect(d.details[0]).toContain("←")
  })

  it("shows 'no change' when an update changed nothing", () => {
    const d = describeAction(row("game.update", { name: "X", changes: {} }))
    expect(d.details).toEqual(["بدون تغییر"])
  })

  it("marks an added price line", () => {
    const d = describeAction(
      row("game.update", {
        name: "X",
        changes: {},
        price_changes: [
          { platform: "ps5", kind: "base_usd", from: null, to: 9 },
        ],
      })
    )
    expect(d.details[0]).toContain("افزوده شد")
  })

  it("describes a deletion", () => {
    expect(describeAction(row("game.delete", { name: "Old Game" })).text).toBe(
      "بازی «Old Game» را حذف کرد"
    )
  })

  it("describes a pre-order status change", () => {
    const d = describeAction(
      row("game.preorder", {
        name: "Upcoming",
        release_status: "pre_order",
        date_updated: true,
      })
    )
    expect(d.text).toBe("وضعیت انتشار «Upcoming» را به «پیش‌خرید» تغییر داد")
    expect(d.details).toContain("تاریخ انتشار به‌روزرسانی شد")
  })

  it("distinguishes setting vs clearing an alert", () => {
    expect(
      describeAction(row("game.alert", { name: "X", cleared: false })).text
    ).toBe("اعلان «X» را تنظیم کرد")
    expect(
      describeAction(row("game.alert", { name: "X", cleared: true })).text
    ).toBe("اعلان «X» را حذف کرد")
  })

  it("describes an exchange-rate update with the rate", () => {
    const d = describeAction(row("exchange_rate.set", { usd_to_toman: 95000 }))
    expect(d.text).toBe("تنظیمات قیمت‌گذاری را به‌روزرسانی کرد")
    expect(d.details[0]).toContain("نرخ دلار")
  })

  it("distinguishes fulfilled vs saved orders", () => {
    expect(
      describeAction(row("order.fulfill", { status: "fulfilled", items: 2 }))
        .text
    ).toBe("سفارشی را تحویل داد")
    expect(
      describeAction(row("order.fulfill", { status: "paid", items: 1 })).text
    ).toBe("اطلاعات سفارشی را ذخیره کرد")
  })

  it("describes an image upload", () => {
    expect(describeAction(row("image.upload")).text).toBe("یک تصویر آپلود کرد")
  })

  it("falls back to the raw key for an unknown action", () => {
    expect(describeAction(row("something.new")).text).toBe("something.new")
  })

  it("falls back to the target id when no name is present", () => {
    const d = describeAction(row("game.delete", null, "abc123"))
    expect(d.text).toBe("بازی «#abc123» را حذف کرد")
  })
})
