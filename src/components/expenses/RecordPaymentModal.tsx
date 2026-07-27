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
import { intlLocale, useLanguage, useT } from '../../i18n'
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
  const t = useT()
  const locale = intlLocale(useLanguage())

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
    members.find((m) => m.id === id)?.name ?? t('removedMember')

  const submit = async () => {
    if (!expense) return
    const amount = parseRupees(amountText)
    if (amount === null || amount <= 0) {
      setError(t('amountPaidMissing'))
      return
    }
    if (!memberId) {
      setError(t('paidByMissing'))
      return
    }
    if (amount > outstanding) {
      setError(t('onlyOutstanding', { amount: formatINR(outstanding) }))
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
      setError(t('couldNotSavePayment'))
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
      title={t('recordPaymentTitle')}
      {...(expense
        ? {
            description: t('recordPaymentSubtitle', {
              category: categoryLabel(expense.category, t, expense.customCategory),
              amount: formatINR(outstanding),
            }),
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
            {saving ? t('saving') : t('recordPayment')}
          </Button>
        </>
      }
    >
      {expense ? (
        <div className="space-y-5">
          <AmountField
            label={t('amountPaid')}
            placeholder="0"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
          />

          <div>
            <p className="text-sm font-medium text-[var(--muted)] mb-2">
              {t('paidBy')}
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
            label={t('date')}
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />

          {expense.payments.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-[var(--muted)] mb-2">
                {t('alreadyPaid')}
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
                        · {formatDate(payment.paidAt, locale)}
                      </span>
                    </span>
                    <span className="tnum font-medium text-[var(--ink)]">
                      {formatINR(payment.amount)}
                    </span>
                    <button
                      type="button"
                      aria-label={t('undoPaymentLabel', {
                        amount: formatINR(payment.amount),
                      })}
                      onClick={() => void undoPayment(expense.id, payment.id)}
                      className="text-xs text-[var(--negative)] font-medium active:scale-95 transition-transform"
                    >
                      {t('undo')}
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
