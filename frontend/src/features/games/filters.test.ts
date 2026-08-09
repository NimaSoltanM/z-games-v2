import { describe, expect, it } from "vitest"

import {
  capacityFilterGroups,
  consoleFilterGroups,
  normalizeCatalogFilters,
} from "./filters"
import type { ExchangeRate } from "./types"

const catalog: NonNullable<ExchangeRate> = {
  consoles: [
    {
      code: "ps4",
      family: "playstation",
      label_fa: "پلی‌استیشن ۴",
      capacities: [
        { code: "z1", label_fa: "ظرفیت ۱", sort_order: 1 },
        { code: "z2", label_fa: "ظرفیت ۲", sort_order: 2 },
        { code: "z3", label_fa: "ظرفیت ۳", sort_order: 3 },
      ],
    },
    {
      code: "ps5",
      family: "playstation",
      label_fa: "پلی‌استیشن ۵",
      capacities: [
        { code: "z1", label_fa: "ظرفیت ۱", sort_order: 1 },
        { code: "z2", label_fa: "ظرفیت ۲", sort_order: 2 },
        { code: "z3", label_fa: "ظرفیت ۳", sort_order: 3 },
      ],
    },
    {
      code: "xbox_series",
      family: "xbox",
      label_fa: "ایکس‌باکس سری X|S",
      capacities: [
        { code: "home", label_fa: "Home", sort_order: 1 },
        { code: "switch", label_fa: "Switch", sort_order: 2 },
      ],
    },
    {
      code: "steam",
      family: "pc",
      label_fa: "استیم",
      capacities: [
        {
          code: "key",
          label_fa: "کلید فعال‌سازی",
          sort_order: 1,
        },
      ],
    },
  ],
}

describe("catalog-backed game filters", () => {
  it("builds console options from catalog data, including future platforms", () => {
    expect(
      consoleFilterGroups(catalog).flatMap((group) => group.options)
    ).toEqual([
      { value: "ps4", label: "پلی‌استیشن ۴" },
      { value: "ps5", label: "پلی‌استیشن ۵" },
      { value: "xbox_series", label: "ایکس‌باکس سری X|S" },
      { value: "steam", label: "استیم" },
    ])
  })

  it("shows only capacities belonging to the selected console", () => {
    expect(
      capacityFilterGroups(catalog, "ps4").flatMap((group) => group.options)
    ).toEqual([
      { value: "z1", label: "ظرفیت ۱" },
      { value: "z2", label: "ظرفیت ۲" },
      { value: "z3", label: "ظرفیت ۳" },
    ])
    expect(
      capacityFilterGroups(catalog, "xbox_series").flatMap(
        (group) => group.options
      )
    ).toEqual([
      { value: "home", label: "Home" },
      { value: "switch", label: "Switch" },
    ])
  })

  it("deduplicates shared family capacities when no console is selected", () => {
    const options = capacityFilterGroups(catalog, "").flatMap(
      (group) => group.options
    )
    expect(options.filter((option) => option.value === "z1")).toHaveLength(1)
    expect(options).toContainEqual({ value: "key", label: "کلید فعال‌سازی" })
  })

  it("clears impossible pairs and preserves valid independent filters", () => {
    expect(normalizeCatalogFilters(catalog, "ps4", "home")).toEqual({
      platform: "ps4",
      capacity: "",
    })
    expect(normalizeCatalogFilters(catalog, "xbox_series", "z1")).toEqual({
      platform: "xbox_series",
      capacity: "",
    })
    expect(normalizeCatalogFilters(catalog, "ps4", "z1")).toEqual({
      platform: "ps4",
      capacity: "z1",
    })
    expect(normalizeCatalogFilters(catalog, "", "home")).toEqual({
      platform: "",
      capacity: "home",
    })
  })

  it("removes unknown URL values after catalog changes", () => {
    expect(
      normalizeCatalogFilters(catalog, "retired_console", "unknown")
    ).toEqual({ platform: "", capacity: "" })
  })
})
