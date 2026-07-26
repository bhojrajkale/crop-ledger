import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { AmountField, Field } from '../ui/Field'
import { Chip } from '../ui/Chip'
import { useLedgerStore } from '../../store/useLedgerStore'
import { categoryLabel } from '../../domain/categories'
import { formatAmount, formatINR, parseRupees } from '../../domain/money'
import { amountOutstanding } from '../../domain/payments'
import { newId } from '../../lib/id'
import { formatDate, todayISO } from '../../lib/format'
import type { Expense, Member } from '../../domain/types'

export function RecordPaymentModal({
  expense,
  members,
  onClose,
}: {
  expense: Expense | null
  members: Member[]
  onClose: () => void
}) {
  const recordPayment = useLedgerStore((s) => s.recordPayment)
  const undoPayment = useLedgerStore((s) => s.undoPayment)

  const [memberId, setMemberId] = useState('')
  const [amountText, setAmountText] = useState('')
  const [paidAt, setPaidAt] = useState(todayISO())
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  const outstanding = expense ? amountOutstanding(expense) : 0

  useEffect(() => {
    if (!expense) return
    setMemberId(members[0]?.id ?? '')
    // Default to clearing the balance in full, since that is the common case.
    setAmountText(formatAmount(amountOutstanding(expense)))
    setPaidAt(todayISO())
    setError(undefined)
  }, [expense, members])

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? 'Removed member'

  const submit = async () => {
    if (!expense) return
    const amount = parseRupees(amountText)
    if (amount === null || amount <= 0) {
      setError('Enter how much was paid.')
      return
    }
    if (!memberId) {
      setError('Pick who paid.')
      return
    }
    if (amount > outstanding) {
      setError(
        `Only ${formatINR(outstanding)} is outstanding on this expense.`
      )
      return
    }

    setSaving(true)
    try {
      await recordPayment(expense.id, {
        id: newId(),
        memberId,
        amount,
        paidAt,
      })
      onClose()
    } catch {
      setError('Could not save that payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={expense !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Record a payment"
      {...(expense
        ? {
            description: `${categoryLabel(
              expense.category,
              expense.customCategory
            )} · ${formatINR(outstanding)} outstanding`,
          }
        : {})}
      footer={
        <>
          {error ? (
            <p role="alert" className="text-sm text-[var(--negative)] mb-2">
              {error}
            </p>
          ) : null}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={saving}
            onClick={submit}
          >
            {saving ? 'Saving…' : 'Record payment'}
          </Button>
        </>
      }
    >
      {expense ? (
        <div className="space-y-5">
          <AmountField
            label="Amount paid"
            placeholder="0"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
          />

          <div>
            <p className="text-sm font-medium text-[var(--muted)] mb-2">
              Paid by
            </p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Chip
                  key={m.id}
                  selected={memberId === m.id}
                  onClick={() => setMemberId(m.id)}
                >
                  {m.name}
                </Chip>
              ))}
            </div>
          </div>

          <Field
            label="Date"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />

          {expense.payments.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-[var(--muted)] mb-2">
                Already paid
              </p>
              <ul className="space-y-1.5">
                {expense.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center gap-3 text-sm bg-[var(--surface-sunken)] rounded-lg px-3 py-2"
                  >
                    <span className="flex-1 min-w-0 truncate text-[var(--ink)]">
                      {memberName(payment.memberId)}
                      <span className="text-[var(--faint)]">
                        {' '}
                        · {formatDate(payment.paidAt)}
                      </span>
                    </span>
                    <span className="tnum font-medium text-[var(--ink)]">
                      {formatINR(payment.amount)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Undo payment of ${formatINR(payment.amount)}`}
                      onClick={() => void undoPayment(expense.id, payment.id)}
                      className="text-xs text-[var(--negative)] font-medium active:scale-95 transition-transform"
                    >
                      Undo
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
