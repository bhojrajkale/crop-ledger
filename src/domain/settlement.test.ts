import { describe, expect, it } from 'vitest'
import {
  computeBalances,
  computeTotals,
  countMemberExpenses,
  explainBalances,
  minimizeTransfers,
} from './settlement'
import { sum, toPaise } from './money'
import type { Expense, Member, Sale } from './types'

const members: Member[] = [
  { id: 'a', name: 'Anil' },
  { id: 'b', name: 'Bhau' },
  { id: 'c', name: 'Chandra' },
]

/**
 * `paidBy` is a test-only shorthand for "one member paid this in full", which
 * is the ordinary case. Pass `payments` explicitly to model credit or
 * instalments.
 */
const expense = (
  overrides: Partial<Expense> & { paidBy?: string } = {}
): Expense => {
  const { paidBy, ...rest } = overrides
  const amount = rest.amount ?? toPaise(300)
  const base: Expense = {
    id: 'e1',
    cropId: 'c1',
    amount,
    category: 'seeds',
    date: '2026-06-01',
    notes: '',
    payments: [
      { id: 'p1', memberId: paidBy ?? 'a', amount, paidAt: '2026-06-01' },
    ],
    owedBy: ['a', 'b', 'c'],
    createdAt: '2026-06-01T00:00:00.000Z',
  }
  return { ...base, ...rest }
}

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

describe('computeBalances with credit', () => {
  const pay = (memberId: string, rupees: number) => ({
    id: `p-${memberId}-${rupees}`,
    memberId,
    amount: toPaise(rupees),
    paidAt: '2026-06-05',
  })

  it('leaves everyone square when nothing has been paid', () => {
    // The money is owed to a shop, not between members — nobody should be
    // told to pay anybody for a bill none of them has settled.
    const balances = computeBalances(members, [
      expense({ amount: toPaise(900), payments: [] }),
    ])
    expect(balancesOf(balances)).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('settles only the part that has actually been paid', () => {
    // ₹900 split 3 ways; Anil has paid ₹300 of it so far. That ₹300 covers
    // ₹100 of each person's share, so B and C owe Anil ₹100 each.
    const balances = computeBalances(members, [
      expense({ amount: toPaise(900), payments: [pay('a', 300)] }),
    ])
    expect(balancesOf(balances)).toEqual({
      a: toPaise(200),
      b: toPaise(-100),
      c: toPaise(-100),
    })
  })

  it('keeps summing to zero with part-payments in play', () => {
    const balances = computeBalances(members, [
      expense({ id: 'e1', amount: toPaise(1000), payments: [pay('a', 333)] }),
      expense({ id: 'e2', amount: toPaise(777), payments: [pay('b', 1)] }),
      expense({ id: 'e3', amount: toPaise(500), payments: [] }),
    ])
    expect(sum([...balances.values()])).toBe(0)
  })

  it('credits several members paying instalments on one expense', () => {
    const balances = computeBalances(members, [
      expense({
        amount: toPaise(900),
        payments: [pay('a', 300), pay('b', 600)],
      }),
    ])
    // All ₹900 is paid, so each owes their ₹300 share.
    expect(balancesOf(balances)).toEqual({
      a: 0,
      b: toPaise(300),
      c: toPaise(-300),
    })
  })

  it('reaches the fully-paid result once the credit is cleared', () => {
    const partly = computeBalances(members, [
      expense({ amount: toPaise(900), payments: [pay('a', 400)] }),
    ])
    const cleared = computeBalances(members, [
      expense({ amount: toPaise(900), payments: [pay('a', 400), pay('a', 500)] }),
    ])
    expect(sum([...partly.values()])).toBe(0)
    expect(balancesOf(cleared)).toEqual({
      a: toPaise(600),
      b: toPaise(-300),
      c: toPaise(-300),
    })
  })
})

describe('computeTotals with credit', () => {
  const unpaid = expense({ id: 'u1', amount: toPaise(2000), payments: [] })
  const partly = expense({
    id: 'u2',
    amount: toPaise(1000),
    payments: [{ id: 'px', memberId: 'b', amount: toPaise(250), paidAt: '2026-06-05' }],
  })

  it('counts the full cost in the total, paid or not', () => {
    const totals = computeTotals(members, [unpaid, partly])
    expect(totals.total).toBe(toPaise(3000))
    expect(totals.perHead).toBe(toPaise(1000))
  })

  it('reports paid and outstanding separately', () => {
    const totals = computeTotals(members, [unpaid, partly])
    expect(totals.paid).toBe(toPaise(250))
    expect(totals.outstanding).toBe(toPaise(2750))
    expect(totals.paid + totals.outstanding).toBe(totals.total)
  })

  it('charges each member their share of the full cost, including credit', () => {
    const totals = computeTotals(members, [unpaid, partly])
    const shares = [...totals.owedByMember.values()]
    // ₹3,000 across three does not divide evenly, so shares land within a
    // paisa of each other — what matters is that they add up to the total.
    expect(sum(shares)).toBe(toPaise(3000))
    for (const share of shares) {
      expect(Math.abs(share - toPaise(1000))).toBeLessThanOrEqual(1)
    }
  })

  it('counts only real payments in paidByMember', () => {
    const totals = computeTotals(members, [unpaid, partly])
    expect(balancesOf(totals.paidByMember)).toEqual({
      a: 0,
      b: toPaise(250),
      c: 0,
    })
  })
})

describe('explainBalances', () => {
  const members: Member[] = [
    { id: 'm1', name: 'Bhojraj' },
    { id: 'm2', name: 'Ganesh' },
  ]

  /** ₹18,200 of expenses: Bhojraj paid ₹11,000, Ganesh ₹7,200. */
  const expenses: Expense[] = [
    {
      id: 'e1',
      cropId: 'c1',
      amount: 1100000,
      category: 'seeds',
      date: '2026-06-02',
      notes: '',
      payments: [
        { id: 'p1', memberId: 'm1', amount: 1100000, paidAt: '2026-06-02' },
      ],
      owedBy: ['m1', 'm2'],
      createdAt: '2026-06-02T00:00:00.000Z',
    },
    {
      id: 'e2',
      cropId: 'c1',
      amount: 720000,
      category: 'labour',
      date: '2026-07-02',
      notes: '',
      payments: [
        { id: 'p2', memberId: 'm2', amount: 720000, paidAt: '2026-07-02' },
      ],
      owedBy: ['m1', 'm2'],
      createdAt: '2026-07-02T00:00:00.000Z',
    },
  ]

  /** ₹39,600 of harvest, all collected by Ganesh. */
  const sales: Sale[] = [
    {
      id: 's1',
      cropId: 'c1',
      receivedBy: 'm2',
      quantity: 18,
      unit: 'quintal',
      rate: 220000,
      total: 3960000,
      date: '2026-11-01',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
  ]

  it('splits a balance into parts that add back up to it', () => {
    // The guarantee the UI leans on: an explanation that did not reconstruct
    // the figure it explains would be worse than no explanation.
    for (const parts of explainBalances(members, expenses, sales).values()) {
      expect(
        parts.paidOut -
          parts.expenseShare +
          parts.revenueShare -
          parts.revenueHeld
      ).toBe(parts.balance)
    }
  })

  it('agrees with computeBalances', () => {
    const balances = computeBalances(members, expenses, sales)
    for (const [id, parts] of explainBalances(members, expenses, sales)) {
      expect(parts.balance).toBe(balances.get(id))
    }
  })

  it('separates money someone is holding from money they owe', () => {
    // Ganesh collected the whole harvest. Almost all of what he "owes" is the
    // group's own sale money, not a debt he ran up — which is the single
    // thing this breakdown exists to make visible.
    const ganesh = explainBalances(members, expenses, sales).get('m2')!
    expect(ganesh.paidOut).toBe(720000)
    expect(ganesh.expenseShare).toBe(910000)
    expect(ganesh.revenueShare).toBe(1980000)
    expect(ganesh.revenueHeld).toBe(3960000)
    expect(ganesh.balance).toBe(-2170000) // owes ₹21,700

    const bhojraj = explainBalances(members, expenses, sales).get('m1')!
    expect(bhojraj.balance).toBe(2170000) // gets ₹21,700
    // Only ₹1,900 of that is the expense side; the rest is his harvest share.
    expect(bhojraj.paidOut - bhojraj.expenseShare).toBe(190000)
    expect(bhojraj.revenueShare).toBe(1980000)
  })
})

describe('one expense paid by two people in unequal amounts', () => {
  // The scenario: ₹8,000 of seed, Bhojraj puts in ₹5,000 and Ganesh ₹3,000,
  // and the cost is shared equally. Each owes ₹4,000, so Ganesh is ₹1,000
  // short and Bhojraj ₹1,000 up.
  const pair: Member[] = [
    { id: 'm1', name: 'Bhojraj' },
    { id: 'm2', name: 'Ganesh' },
  ]

  const shared: Expense[] = [
    {
      id: 'e1',
      cropId: 'c1',
      amount: 800000,
      category: 'seeds',
      date: '2026-06-02',
      notes: '',
      payments: [
        { id: 'p1', memberId: 'm1', amount: 500000, paidAt: '2026-06-02' },
        { id: 'p2', memberId: 'm2', amount: 300000, paidAt: '2026-06-02' },
      ],
      owedBy: ['m1', 'm2'],
      createdAt: '2026-06-02T00:00:00.000Z',
    },
  ]

  it('settles it with a single ₹1,000 transfer', () => {
    const transfers = minimizeTransfers(computeBalances(pair, shared))
    expect(transfers).toEqual([{ from: 'm2', to: 'm1', amount: 100000 }])
  })

  it('breaks down to what each put in against an equal share', () => {
    const parts = explainBalances(pair, shared)
    expect(parts.get('m1')).toMatchObject({
      paidOut: 500000,
      expenseShare: 400000,
      balance: 100000,
    })
    expect(parts.get('m2')).toMatchObject({
      paidOut: 300000,
      expenseShare: 400000,
      balance: -100000,
    })
  })

  it('does not care in which order the two payments were recorded', () => {
    const reversed: Expense[] = [
      { ...shared[0]!, payments: [...shared[0]!.payments].reverse() },
    ]
    expect(computeBalances(pair, reversed)).toEqual(computeBalances(pair, shared))
  })

  it('charges only the paid part while some of it is still on credit', () => {
    // Half-entered: Bhojraj's ₹5,000 is in, Ganesh has not paid his ₹3,000
    // yet. Ganesh should owe ₹2,500 — his share of the money that has
    // actually changed hands — not ₹4,000, which would bill him for a debt
    // the shop is still carrying.
    const partly: Expense[] = [
      { ...shared[0]!, payments: [shared[0]!.payments[0]!] },
    ]
    const parts = explainBalances(pair, partly)
    expect(parts.get('m1')?.balance).toBe(250000)
    expect(parts.get('m2')?.balance).toBe(-250000)
  })
})
