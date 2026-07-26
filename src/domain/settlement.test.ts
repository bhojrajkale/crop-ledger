import { describe, expect, it } from 'vitest'
import {
  computeBalances,
  computeTotals,
  countMemberExpenses,
  minimizeTransfers,
} from './settlement'
import { sum, toPaise } from './money'
import type { Expense, Member, Sale } from './types'

const members: Member[] = [
  { id: 'a', name: 'Anil' },
  { id: 'b', name: 'Bhau' },
  { id: 'c', name: 'Chandra' },
]

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

const balancesOf = (m: Map<string, number>) => Object.fromEntries(m)

describe('computeBalances', () => {
  it('starts everyone at zero', () => {
    expect(balancesOf(computeBalances(members, []))).toEqual({
      a: 0,
      b: 0,
      c: 0,
    })
  })

  it('credits the payer and debits each ower', () => {
    const balances = computeBalances(members, [
      expense({ amount: toPaise(300), paidBy: 'a' }),
    ])
    expect(balancesOf(balances)).toEqual({
      a: toPaise(200), // paid 300, owes 100
      b: toPaise(-100),
      c: toPaise(-100),
    })
  })

  it('handles one member paying while another owes the whole cost', () => {
    // The second case the app must support: A paid, but it is entirely B's.
    const balances = computeBalances(members, [
      expense({ amount: toPaise(500), paidBy: 'a', owedBy: ['b'] }),
    ])
    expect(balancesOf(balances)).toEqual({
      a: toPaise(500),
      b: toPaise(-500),
      c: 0,
    })
  })

  it('honours custom split amounts', () => {
    const balances = computeBalances(members, [
      expense({
        amount: toPaise(1000),
        paidBy: 'c',
        owedBy: ['a', 'b'],
        splitAmounts: [
          { memberId: 'a', amount: toPaise(700) },
          { memberId: 'b', amount: toPaise(300) },
        ],
      }),
    ])
    expect(balancesOf(balances)).toEqual({
      a: toPaise(-700),
      b: toPaise(-300),
      c: toPaise(1000),
    })
  })

  it('always sums to zero, including on inexact divisions', () => {
    const balances = computeBalances(members, [
      expense({ amount: toPaise(100) }),
      expense({ id: 'e2', amount: 1, paidBy: 'b' }),
      expense({ id: 'e3', amount: toPaise(77.77), paidBy: 'c' }),
    ])
    expect(sum([...balances.values()])).toBe(0)
  })

  it('skips expenses nobody owes rather than dropping money on the payer', () => {
    const balances = computeBalances(members, [expense({ owedBy: [] })])
    expect(balancesOf(balances)).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('ignores ids that are no longer members', () => {
    const balances = computeBalances(members, [
      expense({ amount: toPaise(300), paidBy: 'a', owedBy: ['a', 'gone'] }),
    ])
    // 'gone' is dropped, not silently reassigned to somebody else.
    expect(balances.has('gone')).toBe(false)
    expect(balances.get('a')).toBe(toPaise(150))
  })

  describe('with sales (V2 shape, wired but unused in V1)', () => {
    const sale = (overrides: Partial<Sale> = {}): Sale => ({
      id: 's1',
      cropId: 'c1',
      receivedBy: 'a',
      quantity: 45,
      unit: 'quintal',
      rate: toPaise(2200),
      total: toPaise(99000),
      date: '2026-11-01',
      createdAt: '2026-11-01T00:00:00.000Z',
      ...overrides,
    })

    it('debits the collector and credits every member an equal share', () => {
      const balances = computeBalances(members, [], [sale({ total: toPaise(300) })])
      expect(balancesOf(balances)).toEqual({
        a: toPaise(-200), // holds 300, entitled to 100
        b: toPaise(100),
        c: toPaise(100),
      })
    })

    it('keeps the zero-sum invariant alongside expenses', () => {
      const balances = computeBalances(
        members,
        [expense({ amount: toPaise(100) })],
        [sale({ total: toPaise(1000) }), sale({ id: 's2', receivedBy: 'b', total: 7 })]
      )
      expect(sum([...balances.values()])).toBe(0)
    })
  })
})

describe('minimizeTransfers', () => {
  it('returns nothing when everyone is square', () => {
    expect(minimizeTransfers(new Map([['a', 0], ['b', 0]]))).toEqual([])
  })

  it('produces a single transfer for a simple two-person debt', () => {
    const balances = computeBalances(members.slice(0, 2), [
      expense({ amount: toPaise(500), paidBy: 'a', owedBy: ['b'] }),
    ])
    expect(minimizeTransfers(balances)).toEqual([
      { from: 'b', to: 'a', amount: toPaise(500) },
    ])
  })

  it('clears every balance it is given', () => {
    const balances = new Map([
      ['a', toPaise(600)],
      ['b', toPaise(-250)],
      ['c', toPaise(-350)],
    ])
    const transfers = minimizeTransfers(balances)
    const net = new Map(balances)
    for (const t of transfers) {
      net.set(t.from, (net.get(t.from) ?? 0) + t.amount)
      net.set(t.to, (net.get(t.to) ?? 0) - t.amount)
    }
    expect([...net.values()].every((v) => v === 0)).toBe(true)
  })

  it('needs at most n-1 transfers', () => {
    const balances = new Map([
      ['a', toPaise(1000)],
      ['b', toPaise(500)],
      ['c', toPaise(-700)],
      ['d', toPaise(-800)],
    ])
    expect(minimizeTransfers(balances).length).toBeLessThanOrEqual(3)
  })

  it('is deterministic for equal balances', () => {
    const build = () =>
      new Map([
        ['b', toPaise(100)],
        ['a', toPaise(100)],
        ['d', toPaise(-100)],
        ['c', toPaise(-100)],
      ])
    expect(minimizeTransfers(build())).toEqual(minimizeTransfers(build()))
  })
})

describe('computeTotals', () => {
  const expenses = [
    expense({ id: 'e1', amount: toPaise(300), category: 'seeds', paidBy: 'a' }),
    expense({
      id: 'e2',
      amount: toPaise(600),
      category: 'labour',
      paidBy: 'b',
      owedBy: ['b', 'c'],
    }),
  ]

  it('totals all expenses and averages per head across all members', () => {
    const totals = computeTotals(members, expenses)
    expect(totals.total).toBe(toPaise(900))
    expect(totals.perHead).toBe(toPaise(300))
  })

  it('tracks what each member paid versus what they owe', () => {
    const totals = computeTotals(members, expenses)
    expect(balancesOf(totals.paidByMember)).toEqual({
      a: toPaise(300),
      b: toPaise(600),
      c: 0,
    })
    expect(balancesOf(totals.owedByMember)).toEqual({
      a: toPaise(100),
      b: toPaise(400), // 100 of seeds + 300 of labour
      c: toPaise(400),
    })
  })

  it('groups spend by category', () => {
    const totals = computeTotals(members, expenses)
    expect(balancesOf(totals.byCategory)).toEqual({
      seeds: toPaise(300),
      labour: toPaise(600),
    })
  })

  it('does not divide by zero when a crop has no members', () => {
    expect(computeTotals([], []).perHead).toBe(0)
  })
})

describe('countMemberExpenses', () => {
  const expenses = [
    expense({ id: 'e1', paidBy: 'a', owedBy: ['b'] }),
    expense({ id: 'e2', paidBy: 'b', owedBy: ['b', 'c'] }),
  ]

  it('counts a member as payer or ower, without double counting', () => {
    expect(countMemberExpenses(expenses, 'a')).toBe(1)
    expect(countMemberExpenses(expenses, 'b')).toBe(2)
    expect(countMemberExpenses(expenses, 'c')).toBe(1)
  })

  it('returns zero for someone with no history', () => {
    expect(countMemberExpenses(expenses, 'nobody')).toBe(0)
  })
})
