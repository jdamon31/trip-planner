import { rankDates, getBestDates } from './availability'
import type { Availability } from '../supabase/types'

const makeRow = (member_id: string, date: string, status: 'available' | 'maybe' | 'unavailable'): Availability => ({
  id: `${member_id}-${date}`,
  member_id,
  date,
  status,
})

describe('rankDates', () => {
  it('ranks dates by available count descending', () => {
    const rows: Availability[] = [
      makeRow('m1', '2026-06-01', 'available'),
      makeRow('m2', '2026-06-01', 'available'),
      makeRow('m1', '2026-06-02', 'available'),
      makeRow('m2', '2026-06-02', 'unavailable'),
    ]
    const ranked = rankDates(rows)
    expect(ranked[0].date).toBe('2026-06-01')
    expect(ranked[0].availableCount).toBe(2)
    expect(ranked[1].date).toBe('2026-06-02')
    expect(ranked[1].availableCount).toBe(1)
  })

  it('breaks ties by maybe count', () => {
    const rows: Availability[] = [
      makeRow('m1', '2026-06-01', 'available'),
      makeRow('m2', '2026-06-01', 'maybe'),
      makeRow('m1', '2026-06-02', 'available'),
      makeRow('m2', '2026-06-02', 'unavailable'),
    ]
    const ranked = rankDates(rows)
    expect(ranked[0].date).toBe('2026-06-01')
    expect(ranked[0].maybeCount).toBe(1)
  })

  it('returns empty array for no rows', () => {
    expect(rankDates([])).toEqual([])
  })
})

describe('getBestDates', () => {
  it('returns top 2 dates', () => {
    const rows: Availability[] = [
      makeRow('m1', '2026-06-01', 'available'),
      makeRow('m1', '2026-06-02', 'available'),
      makeRow('m1', '2026-06-03', 'available'),
      makeRow('m2', '2026-06-01', 'available'),
    ]
    const best = getBestDates(rows, 3)
    expect(best).toHaveLength(2)
    expect(best[0].date).toBe('2026-06-01')
  })

  it('marks allAvailable when every member is available', () => {
    const rows: Availability[] = [
      makeRow('m1', '2026-06-01', 'available'),
      makeRow('m2', '2026-06-01', 'available'),
    ]
    const best = getBestDates(rows, 2)
    expect(best[0].allAvailable).toBe(true)
  })
})
