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
