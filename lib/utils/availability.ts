import type { Availability } from '../supabase/types'

export interface RankedDate {
  date: string
  availableCount: number
  maybeCount: number
  allAvailable: boolean
}

export function rankDates(rows: Availability[]): RankedDate[] {
  const dateMap = new Map<string, { available: Set<string>; maybe: Set<string>; all: Set<string> }>()

  for (const row of rows) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, { available: new Set(), maybe: new Set(), all: new Set() })
    }
    const entry = dateMap.get(row.date)!
    entry.all.add(row.member_id)
    if (row.status === 'available') entry.available.add(row.member_id)
    if (row.status === 'maybe') entry.maybe.add(row.member_id)
  }

  const ranked: RankedDate[] = Array.from(dateMap.entries()).map(([date, counts]) => ({
    date,
    availableCount: counts.available.size,
    maybeCount: counts.maybe.size,
    allAvailable: counts.available.size === counts.all.size && counts.all.size > 0,
  }))

  return ranked.sort((a, b) => {
    if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount
    return b.maybeCount - a.maybeCount
  })
}

export function getBestDates(rows: Availability[], memberCount: number): RankedDate[] {
  const ranked = rankDates(rows)
  return ranked.slice(0, 2).map(d => ({
    ...d,
    allAvailable: d.availableCount === memberCount,
  }))
}
