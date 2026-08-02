import type { Expense, Member, Paise, Sale, Settlement, Transfer } from './types'
import { allocateProportionally, resolveSplit, splitEqually } from './split'
import { sum } from './money'
import { amountOutstanding, amountPaid } from './payments'

/**
 * Net position per member, in paise:
 *
 *     balance = (what they paid out) − (their share of what has been paid)
 *
 * Positive means the group owes them; negative means they owe the group.
 * Balances always sum to zero, which is the invariant the whole ledger rests
 * on — every rupee added on one side is removed on another.
 *
 * Note the second term: members are debited their share of the money that has
 * *actually been paid*, not of the full expense. An amount still owed to a
 * shop is a debt to the outside world, not one member owing another, and
 * charging it here would make the settlement stop balancing and tell people to
 * pay each other for money nobody has spent yet. A part-payment covers
 * everyone's share proportionally (see allocateProportionally). Outstanding
 * credit is reported separately by computeOutstanding().
 *
 * A sale is arithmetically an inverted expense: whoever collected the cash is
 * holding money that belongs to the group, so they are debited the total while
 * every member is credited an equal share.
 *
 * `settlements` are the transfers members have actually made to square up.
 * They move a balance towards zero without touching what any shop is owed,
 * which is why they belong here and not in computeOutstanding().
 */
export function computeBalances(
  members: Member[],
  expenses: Expense[],
  sales: Sale[] = [],
  settlements: Settlement[] = []
): Map<string, Paise> {
  const balances = new Map<string, Paise>()
  for (const [id, parts] of explainBalances(
    members,
    expenses,
    sales,
    settlements
  )) {
    balances.set(id, parts.balance)
  }
  return balances
}

/**
 * The parts a balance is made of, per member:
 *
 *     balance = paidOut − expenseShare + revenueShare − revenueHeld
 *               + settlementsPaid − settlementsReceived
 *
 * A settlement figure on its own is something the user has to
 * reverse-engineer, and never more so than once a harvest is involved: most
 * of what one person appears to "owe" is usually the group's sale money
 * sitting in their pocket, not a debt they ran up. This is what the app shows
 * when asked how a figure was arrived at.
 *
 * computeBalances is derived from this rather than adding up its own totals,
 * so an explanation can never drift from the number it explains.
 */
export interface BalanceBreakdown {
  /** Money this member handed over for expenses. */
  paidOut: Paise
  /** Their share of the expense money that has actually been paid. */
  expenseShare: Paise
  /** Their equal share of everything the harvest brought in. */
  revenueShare: Paise
  /** Sale money they collected, which belongs to the group. */
  revenueHeld: Paise
  /** Money they handed to another member to square up. */
  settlementsPaid: Paise
  /** Money another member handed them for the same reason. */
  settlementsReceived: Paise
  balance: Paise
}

type BalancePart = keyof Omit<BalanceBreakdown, 'balance'>

export function explainBalances(
  members: Member[],
  expenses: Expense[],
  sales: Sale[] = [],
  settlements: Settlement[] = []
): Map<string, BalanceBreakdown> {
  const parts = new Map<string, BalanceBreakdown>()
  for (const member of members) {
    parts.set(member.id, {
      paidOut: 0,
      expenseShare: 0,
      revenueShare: 0,
      revenueHeld: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
      balance: 0,
    })
  }

  const add = (memberId: string, part: BalancePart, amount: Paise) => {
    // Members removed after an expense was recorded are intentionally not
    // resurrected here — their share is dropped rather than silently
    // reassigned. countMemberEntries() warns before that removal happens.
    const entry = parts.get(memberId)
    if (!entry) return
    entry[part] += amount
  }

  for (const expense of expenses) {
    if (expense.owedBy.length === 0) continue
    const paid = amountPaid(expense)
    if (paid === 0) continue

    for (const payment of expense.payments) {
      add(payment.memberId, 'paidOut', payment.amount)
    }
    for (const share of allocateProportionally(paid, resolveSplit(expense))) {
      add(share.memberId, 'expenseShare', share.amount)
    }
  }

  const memberIds = members.map((m) => m.id)
  for (const sale of sales) {
    if (memberIds.length === 0) continue
    add(sale.receivedBy, 'revenueHeld', sale.total)
    for (const share of splitEqually(sale.total, memberIds)) {
      add(share.memberId, 'revenueShare', share.amount)
    }
  }

  // A settlement is a symmetric pair — the same amount credited to the payer
  // and debited from the receiver — so it can only move balances towards each
  // other, never break their sum. Note it is deliberately not clamped to what
  // is owed: paying someone more than their share means they now owe the
  // difference, which is a real state the ledger should be able to show rather
  // than quietly discard.
  for (const settlement of settlements) {
    add(settlement.from, 'settlementsPaid', settlement.amount)
    add(settlement.to, 'settlementsReceived', settlement.amount)
  }

  for (const entry of parts.values()) {
    entry.balance =
      entry.paidOut -
      entry.expenseShare +
      entry.revenueShare -
      entry.revenueHeld +
      entry.settlementsPaid -
      entry.settlementsReceived
  }

  return parts
}

/**
 * Reduces balances to the fewest transfers that clear them, by repeatedly
 * matching the largest creditor against the largest debtor. Sorting by size
 * (and then by member id, so the output is deterministic) means one transfer
 * usually zeroes out at least one party, which is what keeps the list short.
 */
export function minimizeTransfers(balances: Map<string, Paise>): Transfer[] {
  const creditors: { id: string; amount: Paise }[] = []
  const debtors: { id: string; amount: Paise }[] = []

  for (const [id, balance] of balances) {
    if (balance > 0) creditors.push({ id, amount: balance })
    else if (balance < 0) debtors.push({ id, amount: -balance })
  }

  const bySizeThenId = (
    a: { id: string; amount: Paise },
    b: { id: string; amount: Paise }
  ) => b.amount - a.amount || a.id.localeCompare(b.id)

  creditors.sort(bySizeThenId)
  debtors.sort(bySizeThenId)

  const transfers: Transfer[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!
    const debtor = debtors[di]!
    const amount = Math.min(creditor.amount, debtor.amount)

    if (amount > 0) {
      transfers.push({ from: debtor.id, to: creditor.id, amount })
    }

    creditor.amount -= amount
    debtor.amount -= amount
    if (creditor.amount === 0) ci++
    if (debtor.amount === 0) di++
  }

  return transfers
}

export interface CropTotals {
  /** Everything the crop has cost, paid or still on credit. */
  total: Paise
  /** Of that total, how much has actually been handed over. */
  paid: Paise
  /** The rest — still owed to shops and contractors. */
  outstanding: Paise
  perHead: Paise
  /** Total each member actually paid out of pocket. */
  paidByMember: Map<string, Paise>
  /** Total each member is responsible for, per the splits. */
  owedByMember: Map<string, Paise>
  byCategory: Map<string, Paise>
}

export function computeTotals(
  members: Member[],
  expenses: Expense[]
): CropTotals {
  const total = sum(expenses.map((e) => e.amount))
  const paidByMember = new Map<string, Paise>()
  const owedByMember = new Map<string, Paise>()
  const byCategory = new Map<string, Paise>()

  for (const member of members) {
    paidByMember.set(member.id, 0)
    owedByMember.set(member.id, 0)
  }

  const add = (map: Map<string, Paise>, key: string, amount: Paise) => {
    map.set(key, (map.get(key) ?? 0) + amount)
  }

  let paid = 0
  for (const expense of expenses) {
    add(byCategory, expense.category, expense.amount)
    for (const payment of expense.payments) {
      paid += payment.amount
      if (paidByMember.has(payment.memberId)) {
        add(paidByMember, payment.memberId, payment.amount)
      }
    }
    if (expense.owedBy.length === 0) continue
    // Each member's share is of the FULL cost, including what is still on
    // credit — this is what they are ultimately responsible for, which is a
    // different question from what has been settled between members so far.
    for (const share of resolveSplit(expense)) {
      if (owedByMember.has(share.memberId)) {
        add(owedByMember, share.memberId, share.amount)
      }
    }
  }

  return {
    total,
    paid,
    outstanding: sum(expenses.map(amountOutstanding)),
    // "Per head" is the flat average across everyone on the crop — what each
    // member's share would be if every cost were shared equally. It is
    // deliberately not the same as owedByMember, which reflects the actual
    // split of each expense.
    perHead: members.length > 0 ? Math.round(total / members.length) : 0,
    paidByMember,
    owedByMember,
    byCategory,
  }
}

/**
 * How many rows reference a member — expenses they paid or owe a share of,
 * plus settlements they were either side of. Used to warn before removing
 * someone: removal does not rewrite history, so their side of these rows is
 * dropped from the balances while the other side survives, and the totals
 * stop summing to zero.
 *
 * Settlements count for exactly that reason. Someone who never paid for
 * anything but was handed money to square up still has history here, and
 * without this they would read as safe to remove.
 */
export function countMemberEntries(
  expenses: Expense[],
  memberId: string,
  settlements: Settlement[] = []
): number {
  const inExpenses = expenses.filter(
    (e) =>
      e.owedBy.includes(memberId) ||
      e.payments.some((p) => p.memberId === memberId)
  ).length
  const inSettlements = settlements.filter(
    (s) => s.from === memberId || s.to === memberId
  ).length
  return inExpenses + inSettlements
}
