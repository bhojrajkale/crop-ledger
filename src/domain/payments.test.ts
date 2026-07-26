import { describe, expect, it } from 'vitest'
import {
  amountOutstanding,
  amountPaid,
  applyPayment,
  computeOutstanding,
  isFullyPaid,
  isPending,
  isWhollyUnpaid,
  paidByMember,
  removePayment,
} from './payments'
import { toPaise } from './money'
import type { Expense, Payment } from './types'

const pay = (memberId: string, rupees: number, paidAt = '2026-06-05'): Payment => ({
  id: `p-${memberId}-${rupees}`,
  memberId,
  amount: toPaise(rupees),
  paidAt,
})

const expense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'e1',
  cropId: 'c1',
  amount: toPaise(1000),
  category: 'seeds',
  date: '2026-06-01',
  notes: '',
  payments: [],
  owedBy: ['a', 'b'],
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
})

describe('amountPaid / amountOutstanding', () => {
  it('treats an expense with no payments as wholly on credit', () => {
    const e = expense()
    expect(amountPaid(e)).toBe(0)
    expect(amountOutstanding(e)).toBe(toPaise(1000))
    expect(isWhollyUnpaid(e)).toBe(true)
    expect(isPending(e)).toBe(true)
    expect(isFullyPaid(e)).toBe(false)
  })

  it('tracks a part-payment', () => {
    const e = expense({ payments: [pay('a', 400)] })
    expect(amountPaid(e)).toBe(toPaise(400))
    expect(amountOutstanding(e)).toBe(toPaise(600))
    expect(isWhollyUnpaid(e)).toBe(false)
    expect(isPending(e)).toBe(true)
  })

  it('adds up instalments from different members', () => {
    const e = expense({ payments: [pay('a', 400), pay('b', 600)] })
    expect(amountPaid(e)).toBe(toPaise(1000))
    expect(amountOutstanding(e)).toBe(0)
    expect(isFullyPaid(e)).toBe(true)
    expect(isPending(e)).toBe(false)
  })

  it('never reports negative debt if an over-payment slipped in', () => {
    // Otherwise one mistyped payment would offset other expenses' outstanding.
    const e = expense({ payments: [pay('a', 1500)] })
    expect(amountOutstanding(e)).toBe(0)
  })
})

describe('applyPayment', () => {
  it('appends a payment', () => {
    const { expense: updated, trimmed } = applyPayment(expense(), pay('a', 400))
    expect(updated.payments).toHaveLength(1)
    expect(amountOutstanding(updated)).toBe(toPaise(600))
    expect(trimmed).toBe(false)
  })

  it('trims a payment that would overshoot what is owed', () => {
    const partly = expense({ payments: [pay('a', 800)] })
    const { expense: updated, trimmed } = applyPayment(partly, pay('b', 500))
    expect(trimmed).toBe(true)
    expect(amountPaid(updated)).toBe(toPaise(1000))
    expect(amountOutstanding(updated)).toBe(0)
  })

  it('does not mutate the original expense', () => {
    const original = expense()
    applyPayment(original, pay('a', 400))
    expect(original.payments).toHaveLength(0)
  })
})

describe('removePayment', () => {
  it('takes a payment back off, restoring the outstanding amount', () => {
    const e = expense({ payments: [pay('a', 400), pay('b', 600)] })
    const updated = removePayment(e, 'p-a-400')
    expect(amountPaid(updated)).toBe(toPaise(600))
    expect(amountOutstanding(updated)).toBe(toPaise(400))
  })

  it('is a no-op for an unknown id', () => {
    const e = expense({ payments: [pay('a', 400)] })
    expect(removePayment(e, 'nope').payments).toHaveLength(1)
  })
})

describe('paidByMember', () => {
  it('totals what each member has actually handed over', () => {
    const totals = paidByMember([
      expense({ id: 'e1', payments: [pay('a', 400), pay('b', 100)] }),
      expense({ id: 'e2', payments: [pay('a', 250)] }),
    ])
    expect(Object.fromEntries(totals)).toEqual({
      a: toPaise(650),
      b: toPaise(100),
    })
  })
})

describe('computeOutstanding', () => {
  const expenses = [
    expense({ id: 'e1', amount: toPaise(1000), date: '2026-06-03', owedTo: 'Patil Seeds' }),
    expense({
      id: 'e2',
      amount: toPaise(2000),
      date: '2026-06-01',
      payments: [pay('a', 500)],
      owedTo: 'Patil Seeds',
    }),
    expense({ id: 'e3', amount: toPaise(700), date: '2026-06-02' }),
    // Fully paid — must not appear at all.
    expense({ id: 'e4', amount: toPaise(300), payments: [pay('b', 300)] }),
  ]

  it('totals only what is still owed', () => {
    // 1000 + 1500 + 700, and nothing from the settled one.
    expect(computeOutstanding(expenses).total).toBe(toPaise(3200))
  })

  it('lists pending expenses oldest first', () => {
    const ids = computeOutstanding(expenses).entries.map((e) => e.expense.id)
    expect(ids).toEqual(['e2', 'e3', 'e1'])
  })

  it('excludes fully paid expenses', () => {
    const ids = computeOutstanding(expenses).entries.map((e) => e.expense.id)
    expect(ids).not.toContain('e4')
  })

  it('groups by creditor, largest first, with unnamed debts last', () => {
    expect(computeOutstanding(expenses).byCreditor).toEqual([
      { creditor: 'Patil Seeds', total: toPaise(2500), count: 2 },
      { creditor: null, total: toPaise(700), count: 1 },
    ])
  })

  it('returns an empty summary when everything is settled', () => {
    const summary = computeOutstanding([expenses[3]!])
    expect(summary).toEqual({ total: 0, entries: [], byCreditor: [] })
  })
})
