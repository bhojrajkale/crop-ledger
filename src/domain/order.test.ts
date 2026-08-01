import { describe, expect, it } from 'vitest'
import { byNewestFirst, byStartDateDesc, upsertSorted } from './order'

const row = (id: string, date: string, createdAt: string) => ({
  id,
  date,
  createdAt,
})

describe('byNewestFirst', () => {
  it('puts the later date first', () => {
    const rows = [
      row('a', '2026-06-01', '2026-06-01T00:00:00.000Z'),
      row('b', '2026-08-01', '2026-08-01T00:00:00.000Z'),
    ]
    expect([...rows].sort(byNewestFirst).map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('breaks a same-day tie by when it was recorded, latest first', () => {
    // Two expenses on one day: the one just entered belongs at the top, where
    // it can be checked against the bill still in hand.
    const rows = [
      row('first', '2026-06-01', '2026-06-01T09:00:00.000Z'),
      row('second', '2026-06-01', '2026-06-01T17:00:00.000Z'),
    ]
    expect([...rows].sort(byNewestFirst).map((r) => r.id)).toEqual([
      'second',
      'first',
    ])
  })
})

describe('byStartDateDesc', () => {
  it('puts the most recently sown crop first', () => {
    const crops = [{ startDate: '2025-06-01' }, { startDate: '2026-06-01' }]
    expect([...crops].sort(byStartDateDesc)[0]?.startDate).toBe('2026-06-01')
  })
})

describe('upsertSorted', () => {
  const rows = [
    row('b', '2026-08-01', '2026-08-01T00:00:00.000Z'),
    row('a', '2026-06-01', '2026-06-01T00:00:00.000Z'),
  ]

  it('inserts a new row in the right place', () => {
    const added = row('c', '2026-07-01', '2026-07-01T00:00:00.000Z')
    expect(upsertSorted(rows, added, byNewestFirst).map((r) => r.id)).toEqual([
      'b',
      'c',
      'a',
    ])
  })

  it('replaces a row with the same id rather than duplicating it', () => {
    // What an edit does. Two rows with one id would double the crop's total.
    const edited = row('a', '2026-09-01', '2026-06-01T00:00:00.000Z')
    const result = upsertSorted(rows, edited, byNewestFirst)
    expect(result.map((r) => r.id)).toEqual(['a', 'b'])
    expect(result).toHaveLength(2)
  })

  it('leaves the original array alone', () => {
    // The store hands these straight to React, which will not re-render on a
    // mutated array.
    const before = [...rows]
    upsertSorted(rows, row('c', '2026-07-01', '2026-07-01T00:00:00.000Z'), byNewestFirst)
    expect(rows).toEqual(before)
  })
})
