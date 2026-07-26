import type { Expense, Paise, SplitAmount } from './types'
import { sum } from './money'

/**
 * Divides `amount` across `memberIds` as evenly as integer paise allow.
 *
 * Each member gets floor(amount / n), and the leftover paise are handed out
 * one each to the first `remainder` members in the order given. The result
 * therefore always sums to exactly `amount` — the split can never drift from
 * the expense total, and because allocation follows the caller's stable id
 * order it never depends on render or iteration order either.
 */
export function splitEqually(
  amount: Paise,
  memberIds: string[]
): SplitAmount[] {
  const count = memberIds.length
  if (count === 0) return []

  const base = Math.floor(amount / count)
  const remainder = amount - base * count

  return memberIds.map((memberId, index) => ({
    memberId,
    amount: base + (index < remainder ? 1 : 0),
  }))
}

/**
 * Distributes `total` across `weights` in proportion to those weights, using
 * the largest-remainder method so the result sums to exactly `total`.
 *
 * This is how a part-payment is attributed: paying half of a bill covers half
 * of everybody's share, not one person's share in full. Naively scaling each
 * share by (paid / amount) and rounding would lose or gain paise and break the
 * zero-sum invariant that computeBalances depends on.
 *
 * Ties in the remainder are broken by the weights' original order, so the
 * output is deterministic.
 */
export function allocateProportionally(
  total: Paise,
  weights: SplitAmount[]
): SplitAmount[] {
  const totalWeight = sum(weights.map((w) => w.amount))
  if (weights.length === 0) return []

  // Nothing to weight by (every share zero) — fall back to an even division so
  // the money still lands somewhere deterministic rather than nowhere.
  if (totalWeight <= 0) {
    return splitEqually(
      total,
      weights.map((w) => w.memberId)
    )
  }

  const exact = weights.map((w, index) => {
    const value = (total * w.amount) / totalWeight
    const floor = Math.floor(value)
    return { index, memberId: w.memberId, floor, remainder: value - floor }
  })

  const leftover = total - sum(exact.map((e) => e.floor))

  const order = [...exact].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index
  )
  const bonus = new Set(order.slice(0, Math.max(0, leftover)).map((e) => e.index))

  return exact.map((e) => ({
    memberId: e.memberId,
    amount: e.floor + (bonus.has(e.index) ? 1 : 0),
  }))
}

/**
 * The authoritative per-member shares for an expense: explicit custom amounts
 * when present, otherwise an equal division across `owedBy`. Every consumer
 * (balances, summaries, exports) goes through this so equal and custom splits
 * can never be interpreted differently in two places.
 */
export function resolveSplit(expense: Expense): SplitAmount[] {
  if (expense.splitAmounts && expense.splitAmounts.length > 0) {
    return expense.splitAmounts
  }
  return splitEqually(expense.amount, expense.owedBy)
}

export interface SplitValidation {
  valid: boolean
  /** allocated − expense total. Positive = over-allocated. */
  difference: Paise
}

/**
 * Checks a custom split adds up to the expense total. The form blocks saving
 * until this passes, because an unbalanced custom split would silently make
 * the whole crop's settlement wrong rather than failing loudly.
 */
export function validateCustomSplit(
  amount: Paise,
  splitAmounts: SplitAmount[]
): SplitValidation {
  const allocated = sum(splitAmounts.map((s) => s.amount))
  return { valid: allocated === amount, difference: allocated - amount }
}
