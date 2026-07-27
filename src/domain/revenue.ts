import type { Member, Paise, Sale } from './types'
import { sum } from './money'
import { splitEqually } from './split'

/**
 * The total for a sale, from what was sold and what it fetched.
 *
 * Quantity is a plain number (45.5 quintals is normal) while the rate is
 * integer paise, so the product is rounded once, here, rather than being
 * recomputed at each display site and drifting between them.
 */
export function saleTotal(quantity: number, rate: Paise): Paise {
  if (!Number.isFinite(quantity) || !Number.isFinite(rate)) return 0
  return Math.max(0, Math.round(quantity * rate))
}

export interface RevenueSummary {
  /** Everything the harvest brought in. */
  total: Paise
  /** Each member's equal share of that. */
  perHead: Paise
  /** Revenue minus what the crop cost. Negative means a loss. */
  net: Paise
  /** What each member is currently holding from sales. */
  receivedByMember: Map<string, Paise>
  /**
   * Total quantity sold, and the average rate it fetched — but only when
   * every sale used the same unit. Adding quintals to kilos would produce a
   * confident-looking number that means nothing, so mixed units report null
   * rather than a wrong total.
   */
  quantity: { amount: number; unit: string; averageRate: Paise } | null
}

export function computeRevenue(
  members: Member[],
  sales: Sale[],
  totalExpenses: Paise
): RevenueSummary {
  const total = sum(sales.map((s) => s.total))

  const receivedByMember = new Map<string, Paise>()
  for (const member of members) receivedByMember.set(member.id, 0)
  for (const sale of sales) {
    if (!receivedByMember.has(sale.receivedBy)) continue
    receivedByMember.set(
      sale.receivedBy,
      (receivedByMember.get(sale.receivedBy) ?? 0) + sale.total
    )
  }

  const units = new Set(sales.map((s) => s.unit.trim()).filter(Boolean))
  const amount = sum(sales.map((s) => s.quantity))
  const unit = [...units][0]
  const quantity =
    units.size === 1 && unit && amount > 0
      ? { amount, unit, averageRate: Math.round(total / amount) }
      : null

  return {
    total,
    // The same flat average as perHead for expenses: what each member is
    // entitled to, which is a different question from what they are holding.
    perHead: members.length > 0 ? Math.round(total / members.length) : 0,
    net: total - totalExpenses,
    receivedByMember,
    quantity,
  }
}

/**
 * Each member's equal entitlement from a single sale, allocated so the parts
 * sum to exactly the sale total. Mirrors how a sale is credited inside
 * computeBalances, so the settlement and any per-sale breakdown agree.
 */
export function saleShares(members: Member[], sale: Sale) {
  return splitEqually(
    sale.total,
    members.map((m) => m.id)
  )
}
