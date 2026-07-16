import type { ExchangeRate } from "./types"

export type CatalogFilterOption = { value: string; label: string }
export type CatalogFilterGroup = {
  family: string
  options: CatalogFilterOption[]
}

function groupedOptions(
  entries: { family: string; value: string; label: string }[]
): CatalogFilterGroup[] {
  const groups = new Map<string, CatalogFilterGroup>()
  for (const entry of entries) {
    let group = groups.get(entry.family)
    if (!group) {
      group = { family: entry.family, options: [] }
      groups.set(entry.family, group)
    }
    // Capacity codes are commonly shared by consoles in one family (PS4/PS5
    // both have z1/z2/z3). Show each semantic filter once per family.
    if (!group.options.some((option) => option.value === entry.value)) {
      group.options.push({ value: entry.value, label: entry.label })
    }
  }
  return [...groups.values()]
}

export function consoleFilterGroups(rate: ExchangeRate): CatalogFilterGroup[] {
  return groupedOptions(
    (rate?.consoles ?? []).map((console) => ({
      family: console.family || console.code,
      value: console.code,
      label: console.label_fa,
    }))
  )
}

export function capacityFilterGroups(
  rate: ExchangeRate,
  selectedConsole: string
): CatalogFilterGroup[] {
  const consoles = rate?.consoles ?? []
  const visibleConsoles = selectedConsole
    ? consoles.filter((console) => console.code === selectedConsole)
    : consoles

  return groupedOptions(
    visibleConsoles.flatMap((console) =>
      console.capacities.map((capacity) => ({
        family: console.family || console.code,
        value: capacity.code,
        label: capacity.label_fa,
      }))
    )
  )
}

// URL search values can be typed/bookmarked and may outlive a catalog change.
// Keep valid independent filters, but clear a capacity that does not belong to
// the selected console so the UI can never represent an impossible pair.
export function normalizeCatalogFilters(
  rate: ExchangeRate,
  platform: string,
  capacity: string
): { platform: string; capacity: string } {
  if (!rate) return { platform, capacity }

  const selected = rate.consoles.find((console) => console.code === platform)
  const normalizedPlatform = platform && !selected ? "" : platform
  const eligibleConsoles = normalizedPlatform
    ? selected
      ? [selected]
      : []
    : rate.consoles
  const capacityExists = eligibleConsoles.some((console) =>
    console.capacities.some((candidate) => candidate.code === capacity)
  )

  return {
    platform: normalizedPlatform,
    capacity: capacity && !capacityExists ? "" : capacity,
  }
}
