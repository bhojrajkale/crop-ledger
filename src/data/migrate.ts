import type { Expense, Payment } from '../domain/types'

/**
 * Shape of an expense as stored before payments existed: a single `paidBy`
 * member who was assumed to have covered the whole amount.
 */
interface LegacyExpense extends Omit<Expense, 'payments'> {
  paidBy?: string
  payments?: Payment[]
}

/**
 * Converts a pre-payments expense to the current shape.
 *
 * The old model had no concept of credit, so every recorded expense was
 * implicitly paid in full by `paidBy` — that becomes a single payment for the
 * whole amount, dated to the expense date. This keeps every existing balance
 * and settlement identical to what the user saw before upgrading, which is the
 * whole point: an upgrade must not silently restate last season's books.
 *
 * Idempotent, so it is safe to run over already-migrated rows.
 */
export function migrateExpense(expense: LegacyExpense): Expense {
  const { paidBy, ...rest } = expense

  if (Array.isArray(expense.payments)) {
    return { ...rest, payments: expense.payments } as Expense
  }

  const payments: Payment[] =
    paidBy && expense.amount > 0
      ? [
          {
            id: `${expense.id}-legacy`,
            memberId: paidBy,
            amount: expense.amount,
            paidAt: expense.date,
          },
        ]
      : []

  return { ...rest, payments } as Expense
}

export function needsMigration(expense: unknown): boolean {
  return (
    typeof expense === 'object' &&
    expense !== null &&
    !Array.isArray((expense as { payments?: unknown }).payments)
  )
}
