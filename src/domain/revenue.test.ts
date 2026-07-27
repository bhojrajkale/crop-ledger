import { describe, expect, it } from 'vitest'
import { computeRevenue, saleShares, saleTotal } from './revenue'
import { computeBalances, minimizeTransfers } from './settlement'
import { sum, toPaise } from './money'
import type { Expense, Member, Sale } from './types'

const members: Member[] = [
  { id: 'a', name: 'Anil' },
  { id: 'b', name: 'Bhau' },
  { id: 'c', name: 'Chandra' },
]

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

const asObject = (m: Map<string, number>) => Object.fromEntries(m)

describe('saleTotal', () => {
  it('multiplies quantity by rate', () => {
    expect(saleTotal(45, toPaise(2200))).toBe(toPaise(99000))
  })

  it('handles a fractional quantity', () => {
    expect(saleTotal(45.5, toPaise(2200))).toBe(toPaise(100100))
  })

  it('rounds once, to whole paise', () => {
    // 12.345 × ₹100.01 — the kind of product that would otherwise carry a
    // fraction of a paisa into storage.
    const total = saleTotal(12.345, toPaise(100.01))
    expect(Number.isInteger(total)).toBe(true)
  })

  it('never returns a negative or non-finite total', () => {
    expect(saleTotal(-5, toPaise(100))).toBe(0)
    expect(saleTotal(Number.NaN, toPaise(100))).toBe(0)
    expect(saleTotal(5, Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('computeRevenue', () => {
  it('totals every sale', () => {
    const revenue = computeRevenue(
      members,
      [sale({ total: toPaise(99000) }), sale({ id: 's2', total: toPaise(11000) })],
      0
    )
    expect(revenue.total).toBe(toPaise(110000))
  })

  it('splits the entitlement equally', () => {
    const revenue = computeRevenue(members, [sale({ total: toPaise(90000) })], 0)
    expect(revenue.perHead).toBe(toPaise(30000))
  })

  it('reports net profit against expenses', () => {
    const revenue = computeRevenue(
      members,
      [sale({ total: toPaise(99000) })],
      toPaise(60000)
    )
    expect(revenue.net).toBe(toPaise(39000))
  })

  it('reports a loss as a negative net', () => {
    const revenue = computeRevenue(
      members,
      [sale({ total: toPaise(40000) })],
      toPaise(60000)
    )
    expect(revenue.net).toBe(toPaise(-20000))
  })

  it('tracks who is holding the money', () => {
    const revenue = computeRevenue(
      members,
      [
        sale({ receivedBy: 'a', total: toPaise(60000) }),
        sale({ id: 's2', receivedBy: 'b', total: toPaise(20000) }),
      ],
      0
    )
    expect(asObject(revenue.receivedByMember)).toEqual({
      a: toPaise(60000),
      b: toPaise(20000),
      c: 0,
    })
  })

  it('adds up yield and average rate when the unit is consistent', () => {
    const revenue = computeRevenue(
      members,
      [
        sale({ quantity: 45, unit: 'quintal', total: toPaise(99000) }),
        sale({ id: 's2', quantity: 15, unit: 'quintal', total: toPaise(30000) }),
      ],
      0
    )
    expect(revenue.quantity).toEqual({
      amount: 60,
      unit: 'quintal',
      averageRate: toPaise(2150),
    })
  })

  it('refuses to total mixed units rather than inventing a figure', () => {
    // Quintals plus kilos is not a quantity, and a confident wrong number is
    // worse than none.
    const revenue = computeRevenue(
      members,
      [
        sale({ quantity: 45, unit: 'quintal' }),
        sale({ id: 's2', quantity: 200, unit: 'kg' }),
      ],
      0
    )
    expect(revenue.quantity).toBeNull()
  })

  it('handles no sales at all', () => {
    const revenue = computeRevenue(members, [], toPaise(5000))
    expect(revenue.total).toBe(0)
    expect(revenue.perHead).toBe(0)
    expect(revenue.net).toBe(toPaise(-5000))
    expect(revenue.quantity).toBeNull()
  })

  it('does not divide by zero when a crop has no members', () => {
    expect(computeRevenue([], [sale()], 0).perHead).toBe(0)
  })

  it('ignores a collector who is no longer a member', () => {
    const revenue = computeRevenue(members, [sale({ receivedBy: 'gone' })], 0)
    expect(revenue.receivedByMember.has('gone')).toBe(false)
    expect(revenue.total).toBe(toPaise(99000))
  })
})

describe('saleShares', () => {
  it('splits a sale so the parts sum to exactly the total', () => {
    const shares = saleShares(members, sale({ total: toPaise(100) }))
    expect(sum(shares.map((s) => s.amount))).toBe(toPaise(100))
  })
})

describe('settlement with revenue', () => {
  const expense = (overrides: Partial<Expense> = {}): Expense => ({
    id: 'e1',
    cropId: 'c1',
    amount: toPaise(900),
    category: 'seeds',
    date: '2026-06-01',
    notes: '',
    payments: [
      { id: 'p1', memberId: 'a', amount: toPaise(900), paidAt: '2026-06-01' },
    ],
    owedBy: ['a', 'b', 'c'],
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  })

  it('turns the collector into the one who owes everybody', () => {
    // Anil paid ₹900 of seeds and collected ₹9,000 of revenue. He is up ₹600
    // on the expense but holding ₹6,000 that belongs to the other two.
    const balances = computeBalances(
      members,
      [expense()],
      [sale({ receivedBy: 'a', total: toPaise(9000) })]
    )
    expect(asObject(balances)).toEqual({
      a: toPaise(-5400), // +600 from the expense, −6000 of held revenue
      b: toPaise(2700),
      c: toPaise(2700),
    })
  })

  it('keeps balances summing to zero once revenue is in play', () => {
    const balances = computeBalances(
      members,
      [expense({ amount: toPaise(777) })],
      [
        sale({ total: toPaise(10000) }),
        sale({ id: 's2', receivedBy: 'b', total: 7 }),
      ]
    )
    expect(sum([...balances.values()])).toBe(0)
  })

  it('produces transfers that clear everyone', () => {
    const balances = computeBalances(
      members,
      [expense()],
      [sale({ receivedBy: 'a', total: toPaise(9000) })]
    )
    const net = new Map(balances)
    for (const t of minimizeTransfers(balances)) {
      net.set(t.from, (net.get(t.from) ?? 0) + t.amount)
      net.set(t.to, (net.get(t.to) ?? 0) - t.amount)
    }
    expect([...net.values()].every((v) => v === 0)).toBe(true)
  })

  it('leaves unpaid credit out of the settlement even with revenue in', () => {
    // The bill is still owed to a shop; revenue does not settle it.
    const balances = computeBalances(
      members,
      [expense({ payments: [] })],
      [sale({ receivedBy: 'a', total: toPaise(900) })]
    )
    expect(asObject(balances)).toEqual({
      a: toPaise(-600),
      b: toPaise(300),
      c: toPaise(300),
    })
  })
})
