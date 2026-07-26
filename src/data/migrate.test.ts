import { describe, expect, it } from 'vitest'
import { migrateExpense, needsMigration } from './migrate'
import { computeBalances } from '../domain/settlement'
import { toPaise } from '../domain/money'
import type { Member } from '../domain/types'

const legacy = {
  id: 'e1',
  cropId: 'c1',
  amount: toPaise(900),
  category: 'seeds' as const,
  date: '2026-06-01',
  notes: 'from the old shape',
  paidBy: 'a',
  owedBy: ['a', 'b', 'c'],
  createdAt: '2026-06-01T00:00:00.000Z',
}

describe('migrateExpense', () => {
  it('turns the old single payer into one payment for the full amount', () => {
    const migrated = migrateExpense(legacy)
    expect(migrated.payments).toEqual([
      {
        id: 'e1-legacy',
        memberId: 'a',
        amount: toPaise(900),
        paidAt: '2026-06-01',
      },
    ])
  })

  it('drops the obsolete paidBy field', () => {
    expect('paidBy' in migrateExpense(legacy)).toBe(false)
  })

  it('keeps every other field untouched', () => {
    const migrated = migrateExpense(legacy)
    expect(migrated.notes).toBe('from the old shape')
    expect(migrated.owedBy).toEqual(['a', 'b', 'c'])
    expect(migrated.amount).toBe(toPaise(900))
    expect(migrated.createdAt).toBe('2026-06-01T00:00:00.000Z')
  })

  it('does not change balances that existed before the upgrade', () => {
    // The point of migrating rather than clearing: last season's settlement
    // must read exactly as it did before the app was updated.
    const members: Member[] = [
      { id: 'a', name: 'Anil' },
      { id: 'b', name: 'Bhau' },
      { id: 'c', name: 'Chandra' },
    ]
    const balances = computeBalances(members, [migrateExpense(legacy)])
    expect(Object.fromEntries(balances)).toEqual({
      a: toPaise(600),
      b: toPaise(-300),
      c: toPaise(-300),
    })
  })

  it('is idempotent — already-migrated rows pass through unchanged', () => {
    const once = migrateExpense(legacy)
    expect(migrateExpense(once)).toEqual(once)
  })

  it('preserves existing payments instead of overwriting them', () => {
    const { paidBy: _unused, ...rest } = legacy
    const current = {
      ...rest,
      payments: [
        { id: 'p1', memberId: 'b', amount: toPaise(400), paidAt: '2026-06-05' },
      ],
    }
    expect(migrateExpense(current).payments).toHaveLength(1)
    expect(migrateExpense(current).payments[0]!.memberId).toBe('b')
  })

  it('yields no payments when the old row had no payer', () => {
    const { paidBy: _paidBy, ...orphan } = legacy
    expect(migrateExpense(orphan).payments).toEqual([])
  })
})

describe('needsMigration', () => {
  it('spots a row without a payments array', () => {
    expect(needsMigration(legacy)).toBe(true)
  })

  it('leaves a current row alone', () => {
    expect(needsMigration(migrateExpense(legacy))).toBe(false)
  })
})
