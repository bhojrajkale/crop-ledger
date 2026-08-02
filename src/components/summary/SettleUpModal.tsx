import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { AmountField, Field } from '../ui/Field'
import { useLedgerStore } from '../../store/useLedgerStore'
import { formatAmount, formatINR, parseRupees } from '../../domain/money'
import { newId } from '../../lib/id'
import { todayISO } from '../../lib/format'
import { useT } from '../../i18n'
import type { Member, Transfer } from '../../domain/types'

/**
 * Records a transfer the settlement engine suggested, once it has actually
 * happened.
 *
 * Opened from a suggested transfer rather than as a blank form, because the
 * question this answers is always "did that payment get made?" — the two
 * members and the amount are already known, and retyping them is how a
 * settlement ends up recorded against the wrong person.
 */
export function SettleUpModal({
  transfer,
  cropId,
  members,
  onClose,
}: {
  transfer: Transfer | null
  cropId: string
  members: Member[]
  onClose: () => void
}) {
  const saveSettlement = useLedgerStore((s) => s.saveSettlement)
  const t = useT()

  const [amountText, setAmountText] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!transfer) return
    // Default to the whole suggested amount: squaring up in full is the
    // ordinary case, and a part payment is a deliberate edit.
    setAmountText(formatAmount(transfer.amount))
    setDate(todayISO())
    setNote('')
    setError(undefined)
  }, [transfer])

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? t('removedMember')

  const submit = async () => {
    if (!transfer) return
    const amount = parseRupees(amountText)
    if (amount === null || amount <= 0) {
      setError(t('settleAmountMissing'))
      return
    }

    // Deliberately not capped at the suggested amount, unlike a payment
    // towards a shop bill. Handing over more than the balance means the other
    // member now owes the difference, which is a real position the ledger can
    // hold — clamping it here would silently lose money that changed hands.
    setSaving(true)
    try {
      await saveSettlement({
        id: newId(),
        cropId,
        from: transfer.from,
        to: transfer.to,
        amount,
        date,
        ...(note.trim() ? { note: note.trim() } : {}),
        createdAt: new Date().toISOString(),
      })
      onClose()
    } catch {
      setError(t('couldNotSaveSettlement'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={transfer !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t('settleUpTitle')}
      {...(transfer
        ? {
            description: t('settleUpSubtitle', {
              from: memberName(transfer.from),
              to: memberName(transfer.to),
              amount: formatINR(transfer.amount),
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
            {saving ? t('saving') : t('markSettled')}
          </Button>
        </>
      }
    >
      {transfer ? (
        <div className="space-y-5">
          <AmountField
            label={t('amountHandedOver')}
            placeholder="0"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
          />

          <Field
            label={t('date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Field
            label={t('settleNote')}
            placeholder={t('settleNotePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      ) : null}
    </Modal>
  )
}
