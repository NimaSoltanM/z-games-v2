import { consoleLabel, capacityLabel } from "@/features/games"
import type { AuditRow, ChangeEntry, PriceChange } from "./types"

// Persian label for each known action key (used for the filter chips).
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "game.create": "ساخت بازی",
  "game.update": "ویرایش بازی",
  "game.delete": "حذف بازی",
  "game.preorder": "پیش‌خرید",
  "game.alert": "اعلان بازی",
  "exchange_rate.set": "قیمت‌گذاری",
  "order.fulfill": "تکمیل سفارش",
  "image.upload": "آپلود تصویر",
}

const RELEASE_LABEL: Record<string, string | undefined> = {
  released: "منتشر شده",
  pre_order: "پیش‌خرید",
}

const PRICE_MODE_LABEL: Record<string, string | undefined> = {
  dynamic: "دلاری",
  fixed: "ثابت",
}

function faNum(n: number): string {
  return n.toLocaleString("fa-IR")
}

function platformLabel(p: string): string {
  return consoleLabel(p)
}

function zarfiatLabel(z: string): string {
  return capacityLabel(z)
}

// Audit change values are usually scalars, but the `consoles` diff carries string
// arrays; read them defensively.
function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : []
}

// The game name from metadata, or a fallback to the target id.
function targetName(row: AuditRow): string {
  const name = typeof row.metadata?.name === "string" ? row.metadata.name : ""
  return name || (row.target_id ? `#${row.target_id}` : "")
}

function priceChangeLine(pc: PriceChange): string {
  const where =
    pc.kind === "base_usd"
      ? `قیمت پایه ${platformLabel(pc.platform)}`
      : `قیمت ${platformLabel(pc.platform)}${pc.zarfiat ? ` / ${zarfiatLabel(pc.zarfiat)}` : ""}`

  const fmt = (v: number | null): string => {
    if (v === null) return "—"
    return pc.kind === "base_usd" ? `$${v}` : `${faNum(v)} تومان`
  }

  if (pc.from === null) return `${where}: افزوده شد (${fmt(pc.to)})`
  if (pc.to === null) return `${where}: حذف شد (${fmt(pc.from)})`
  return `${where}: ${fmt(pc.from)} ← ${fmt(pc.to)}`
}

function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : ""
}

// Human-readable details for a game.update, derived from its field diff.
function updateDetails(
  changes: Record<string, ChangeEntry | undefined>,
  priceChanges: PriceChange[]
): string[] {
  const out: string[] = []

  const active = changes.active
  if (active) {
    const to = asBool(active.to)
    out.push(to === false ? "بازی غیرفعال شد" : "بازی فعال شد")
  }
  if (changes.name) {
    out.push(
      `نام: «${asString(changes.name.from)}» ← «${asString(changes.name.to)}»`
    )
  }
  if (changes.price_mode) {
    const from =
      PRICE_MODE_LABEL[asString(changes.price_mode.from)] ??
      asString(changes.price_mode.from)
    const to =
      PRICE_MODE_LABEL[asString(changes.price_mode.to)] ??
      asString(changes.price_mode.to)
    out.push(`حالت قیمت: ${from} ← ${to}`)
  }
  if (changes.consoles) {
    const fmtList = (v: unknown) =>
      asStringArray(v).map(platformLabel).join("، ") || "—"
    out.push(
      `کنسول‌ها: ${fmtList(changes.consoles.from)} ← ${fmtList(changes.consoles.to)}`
    )
  }
  if (changes.release_status) {
    const from =
      RELEASE_LABEL[asString(changes.release_status.from)] ??
      asString(changes.release_status.from)
    const to =
      RELEASE_LABEL[asString(changes.release_status.to)] ??
      asString(changes.release_status.to)
    out.push(`وضعیت انتشار: ${from} ← ${to}`)
  }
  if (changes.profit_margin_pct) {
    const f = changes.profit_margin_pct.from
    const t = changes.profit_margin_pct.to
    out.push(
      `سود: ${f === null ? "—" : `${faNum(Number(f))}٪`} ← ${t === null ? "—" : `${faNum(Number(t))}٪`}`
    )
  }
  if (changes.alert_message) out.push("متن اعلان تغییر کرد")
  if (changes.release_date) out.push("تاریخ انتشار تغییر کرد")
  if (changes.cover_image) out.push("تصویر کاور تغییر کرد")

  for (const pc of priceChanges) out.push(priceChangeLine(pc))

  return out
}

export type AuditDescription = { text: string; details: string[] }

// Turns one audit row into a Persian headline (what the admin did) plus a list
// of detail lines (exactly what changed). The admin name and timestamp are
// rendered separately by the page.
export function describeAction(row: AuditRow): AuditDescription {
  const meta = row.metadata ?? {}
  const name = targetName(row)

  switch (row.action) {
    case "game.create":
      return {
        text: `بازی «${name}» را ساخت`,
        details: meta.active === false ? ["به‌صورت پیش‌نویس"] : [],
      }

    case "game.update": {
      const details = updateDetails(
        meta.changes ?? {},
        meta.price_changes ?? []
      )
      return {
        text: `بازی «${name}» را ویرایش کرد`,
        details: details.length > 0 ? details : ["بدون تغییر"],
      }
    }

    case "game.delete":
      return { text: `بازی «${name}» را حذف کرد`, details: [] }

    case "game.preorder": {
      const status = asString(meta.release_status)
      const label = RELEASE_LABEL[status] ?? status
      const details = meta.date_updated ? ["تاریخ انتشار به‌روزرسانی شد"] : []
      return {
        text: `وضعیت انتشار «${name}» را به «${label}» تغییر داد`,
        details,
      }
    }

    case "game.alert":
      return {
        text: meta.cleared
          ? `اعلان «${name}» را حذف کرد`
          : `اعلان «${name}» را تنظیم کرد`,
        details: [],
      }

    case "exchange_rate.set": {
      const rate =
        typeof meta.usd_to_toman === "number" ? meta.usd_to_toman : null
      return {
        text: "تنظیمات قیمت‌گذاری را به‌روزرسانی کرد",
        details: rate !== null ? [`نرخ دلار: ${faNum(rate)} تومان`] : [],
      }
    }

    case "order.fulfill": {
      const fulfilled = meta.status === "fulfilled"
      return {
        text: fulfilled ? "سفارشی را تحویل داد" : "اطلاعات سفارشی را ذخیره کرد",
        details:
          typeof meta.items === "number" ? [`${faNum(meta.items)} آیتم`] : [],
      }
    }

    case "image.upload":
      return { text: "یک تصویر آپلود کرد", details: [] }

    default:
      return { text: row.action, details: [] }
  }
}
