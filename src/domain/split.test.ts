import { describe, expect, it } from 'vitest'
import { resolveSplit, splitEqually, validateCustomSplit } from './split'
import { sum, toPaise } from './money'
import type { Expense } from './types'

const expense = (overrides: Partial<Expense>): Expense => ({
  id: 'e1',
  cropId: 'c1',
  amount: toPaise(300),
  category: 'seeds',
  date: '2026-06-01',
  notes: '',
  paidBy: 'a',
  owedBy: ['a', 'b', 'c'],
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
})

describe('splitEqually', () => {
  it('divides evenly when it divides evenly', () => {
    const shares = splitEqually(toPaise(300), ['a', 'b', 'c'])
    expect(shares.map((s) => s.amount)).toEqual([10_000, 10_000, 10_000])
  })

  it('always sums to exactly the total, even when it does not divide', () => {
    // ₹100 across 3 is the classic drift case: 33.33 + 33.33 + 33.33 = 99.99.
    const total = toPaise(100)
    const shares = splitEqually(total, ['a', 'b', 'c'])
    expect(sum(shares.map((s) => s.amount))).toBe(total)
    expect(shares.map((s) => s.amount)).toEqual([3_334, 3_333, 3_333])
  })

  it('hands leftover paise to the earliest members deterministically', () => {
    const shares = splitEqually(10, ['a', 'b', 'c', 'd'])
    expect(shares.map((s) => s.amount)).toEqual([3, 3, 2, 2])
    expect(sum(shares.map((s) => s.amount))).toBe(10)
  })

  it('gives the same answer regardless of how often it is called', () => {
    const once = splitEqually(toPaise(100), ['a', 'b', 'c'])
    const twice = splitEqually(toPaise(100), ['a', 'b', 'c'])
    expect(once).toEqual(twice)
  })

  it('handles a single member and an empty list', () => {
    expect(splitEqually(toPaise(50), ['a'])).toEqual([
      { memberId: 'a', amount: toPaise(50) },
    ])
    expect(splitEqually(toPaise(50), [])).toEqual([])
  })

  it('never loses a paisa across many awkward totals', () => {
    for (let total = 1; total <= 500; total++) {
      for (let n = 1; n <= 7; n++) {
        const ids = Array.from({ length: n }, (_, i) => `m${i}`)
        expect(sum(splitEqually(total, ids).map((s) => s.amount))).toBe(total)
      }
    }
  })
})

describe('resolveSplit', () => {
  it('divides equally across owedBy when no custom amounts are set', () => {
    const shares = resolveSplit(expense({ amount: toPaise(300) }))
    expect(shares).toEqual([
      { memberId: 'a', amount: toPaise(100) },
      { memberId: 'b', amount: toPaise(100) },
      { memberId: 'c', amount: toPaise(100) },
    ])
  })

  it('prefers explicit custom amounts', () => {
    const custom = [
      { memberId: 'a', amount: toPaise(50) },
      { memberId: 'b', amount: toPaise(250) },
    ]
    expect(resolveSplit(expense({ splitAmounts: custom }))).toEqual(custom)
  })

  it('ignores an empty splitAmounts array and falls back to equal', () => {
    const shares = resolveSplit(
      expense({ amount: toPaise(300), splitAmounts: [] })
    )
    expect(shares).toHaveLength(3)
  })

  it('assigns the whole cost to one member when only they owe it', () => {
    const shares = resolveSplit(
      expense({ amount: toPaise(300), paidBy: 'a', owedBy: ['b'] })
    )
    expect(shares).toEqual([{ memberId: 'b', amount: toPaise(300) }])
  })
})

describe('validateCustomSplit', () => {
  it('accepts a split that adds up', () => {
    const result = validateCustomSplit(toPaise(300), [
      { memberId: 'a', amount: toPaise(100) },
      { memberId: 'b', amount: toPaise(200) },
    ])
    expect(result).toEqual({ valid: true, difference: 0 })
  })

  it('reports how far off an unbalanced split is', () => {
    expect(
      validateCustomSplit(toPaise(300), [
        { memberId: 'a', amount: toPaise(100) },
      ])
    ).toEqual({ valid: false, difference: toPaise(-200) })

    expect(
      validateCustomSplit(toPaise(300), [
        { memberId: 'a', amount: toPaise(400) },
      ])
    ).toEqual({ valid: false, difference: toPaise(100) })
  })
})
