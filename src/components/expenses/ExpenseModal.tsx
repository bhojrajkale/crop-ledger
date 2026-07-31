import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { AmountField, Field, TextAreaField } from '../ui/Field'
import { Chip } from '../ui/Chip'
import { useLedgerStore } from '../../store/useLedgerStore'
import { CATEGORIES } from '../../domain/categories'
import { formatAmount, formatINR, parseRupees } from '../../domain/money'
import { splitEqually, validateCustomSplit } from '../../domain/split'
import { newId } from '../../lib/id'
import { todayISO } from '../../lib/format'
import { useT } from '../../i18n'
import { ReceiptPicker } from './ReceiptPicker'
import { ReceiptViewer } from './ReceiptViewer'
import type {
  CategoryId,
  Crop,
  Expense,
  Receipt,
  SplitAmount,
} from '../../domain/types'

type SplitMode = 'equal' | 'custom'
/** Whether one person handed the money over, or several did between them. */
type PayerMode = 'one' | 'several'
/** How much of this expense has been settled at the moment of entry. */
type PayMode = 'full' | 'part' | 'credit'

export function ExpenseModal({
  open,
  onOpenChange,
  crop,
  editExpense,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  crop: Crop
  editExpense?: Expense
}) {
  const saveExpense = useLedgerStore((s) => s.saveExpense)
  const listReceipts = useLedgerStore((s) => s.listReceipts)
  const syncReceipts = useLedgerStore((s) => s.syncReceipts)
  const members = crop.members
  const t = useT()

  const [amountText, setAmountText] = useState('')
  const [category, setCategory] = useState<CategoryId>('seeds')
  const [customCategory, setCustomCategory] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [payerMode, setPayerMode] = useState<PayerMode>('one')
  const [payerText, setPayerText] = useState<Record<string, string>>({})
  const [payMode, setPayMode] = useState<PayMode>('full')
  const [paidText, setPaidText] = useState('')
  const [owedTo, setOwedTo] = useState('')
  const [owedBy, setOwedBy] = useState<string[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [customText, setCustomText] = useState<Record<string, string>>({})
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  // Receipts are staged in component state and only written on save, so
  // cancelling out of the form cannot leave orphaned photos in storage — and
  // a brand-new expense can collect photos before its row exists.
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [addedIds, setAddedIds] = useState<string[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  // A new expense needs an id up front so its photos can be keyed to it.
  const [draftId] = useState(() => newId())

  useEffect(() => {
    if (!open) return
    const allIds = members.map((m) => m.id)
    const existingPaid = editExpense
      ? editExpense.payments.reduce((t, p) => t + p.amount, 0)
      : 0

    setAmountText(editExpense ? formatAmount(editExpense.amount) : '')
    setCategory(editExpense?.category ?? 'seeds')
    setCustomCategory(editExpense?.customCategory ?? '')
    setDate(editExpense?.date ?? todayISO())
    setNotes(editExpense?.notes ?? '')
    setOwedTo(editExpense?.owedTo ?? '')
    setOwedBy(editExpense?.owedBy ?? allIds)
    setSplitMode(editExpense?.splitAmounts?.length ? 'custom' : 'equal')
    setCustomText(
      Object.fromEntries(
        (editExpense?.splitAmounts ?? []).map((s) => [
          s.memberId,
          formatAmount(s.amount),
        ])
      )
    )

    if (editExpense) {
      setPayMode(
        existingPaid === 0
          ? 'credit'
          : existingPaid >= editExpense.amount
            ? 'full'
            : 'part'
      )
      setPaidText(existingPaid > 0 ? formatAmount(existingPaid) : '')
      setPaidBy(editExpense.payments[0]?.memberId ?? allIds[0] ?? '')
      setPayerMode(editExpense.payments.length > 1 ? 'several' : 'one')
      setPayerText(
        Object.fromEntries(
          editExpense.payments.map((p) => [p.memberId, formatAmount(p.amount)])
        )
      )
    } else {
      setPayMode('full')
      setPaidText('')
      setPaidBy(allIds[0] ?? '')
      setPayerMode('one')
      setPayerText({})
    }
    setError(undefined)
    setAddedIds([])
    setRemovedIds([])
    setViewerIndex(null)
    setReceipts([])
    if (editExpense?.receiptCount) {
      // Fetched only when the form opens, never as part of the expense list.
      void listReceipts(editExpense.id).then(setReceipts)
    }
  }, [open, editExpense, members, listReceipts])

  const amount = parseRupees(amountText)
  const partAmount = parseRupees(paidText)

  // How much this form says has been handed over.
  const paidNow =
    payMode === 'full' ? (amount ?? 0) : payMode === 'part' ? (partAmount ?? 0) : 0
  const outstandingNow = Math.max(0, (amount ?? 0) - paidNow)

  /**
   * Several people paying at once is something this form can represent; a
   * history of instalments over time is not.
   *
   * The difference is what the payments look like: one entry per person, all
   * on the same day, is a bill settled between two pockets — editable here.
   * The same person paying twice, or payments on different dates, is a record
   * of how a debt was cleared, and rebuilding it from these fields would
   * silently collapse it. Those stay managed from the Outstanding list.
   */
  const existingPayments = editExpense?.payments ?? []
  const isInstalmentHistory =
    existingPayments.length > 1 &&
    (new Set(existingPayments.map((p) => p.memberId)).size <
      existingPayments.length ||
      new Set(existingPayments.map((p) => p.paidAt)).size > 1)

  const customSplits: SplitAmount[] = useMemo(
    () =>
      owedBy.map((memberId) => ({
        memberId,
        amount: parseRupees(customText[memberId] ?? '') ?? 0,
      })),
    [owedBy, customText]
  )

  const customCheck =
    amount === null ? null : validateCustomSplit(amount, customSplits)

  const payerSplits: SplitAmount[] = useMemo(
    () =>
      members.map((m) => ({
        memberId: m.id,
        amount: parseRupees(payerText[m.id] ?? '') ?? 0,
      })),
    [members, payerText]
  )
  // Checked against what the form says was handed over, not the bill total —
  // a part-paid expense has two people covering only the paid portion.
  const payerCheck =
    payerMode === 'several' && paidNow > 0
      ? validateCustomSplit(paidNow, payerSplits)
      : null

  const equalPreview =
    amount !== null && owedBy.length > 0 ? splitEqually(amount, owedBy) : []

  const toggleOwed = (memberId: string) => {
    setOwedBy((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    )
  }

  /**
   * Rebuilds the payment list from the form. Existing instalments are left
   * alone when there is more than one, since this form cannot represent them
   * and overwriting would lose who paid what; otherwise the single payment is
   * replaced to match what the form now says.
   */
  const buildPayments = () => {
    if (isInstalmentHistory) return existingPayments
    if (paidNow <= 0) return []

    // Reuse a member's existing payment row where there is one, so its id and
    // the date it was actually made survive an edit that only changes amounts.
    const previous = (memberId: string) =>
      existingPayments.find((p) => p.memberId === memberId)

    if (payerMode === 'several') {
      return payerSplits
        .filter((split) => split.amount > 0)
        .map((split) => {
          const existing = previous(split.memberId)
          return {
            id: existing?.id ?? newId(),
            memberId: split.memberId,
            amount: split.amount,
            paidAt: existing?.paidAt ?? date,
          }
        })
    }

    const existing = previous(paidBy) ?? existingPayments[0]
    return [
      {
        id: existing?.id ?? newId(),
        memberId: paidBy,
        amount: paidNow,
        paidAt: existing?.paidAt ?? date,
      },
    ]
  }

  const submit = async () => {
    if (amount === null || amount <= 0) {
      setError(t('amountMissing'))
      return
    }
    if (payMode !== 'credit' && payerMode === 'one' && !paidBy) {
      setError(t('paidByMissing'))
      return
    }
    if (payMode === 'part') {
      if (partAmount === null || partAmount <= 0) {
        setError(t('paidSoFarMissing'))
        return
      }
      if (partAmount >= amount) {
        setError(t('partCoversAll'))
        return
      }
    }
    if (owedBy.length === 0) {
      setError(t('whoOwesMissing'))
      return
    }
    if (category === 'custom' && !customCategory.trim()) {
      setError(t('categoryNameMissing'))
      return
    }
    if (payerCheck && !payerCheck.valid) {
      setError(
        payerCheck.difference > 0
          ? t('payersOverError', { amount: formatINR(payerCheck.difference) })
          : t('payersShortError', { amount: formatINR(-payerCheck.difference) })
      )
      return
    }
    if (splitMode === 'custom' && customCheck && !customCheck.valid) {
      setError(
        customCheck.difference > 0
          ? t('splitOverError', { amount: formatINR(customCheck.difference) })
          : t('splitShortError', { amount: formatINR(-customCheck.difference) })
      )
      return
    }

    setSaving(true)
    try {
      const expense: Expense = {
        ...(editExpense ?? {
          id: draftId,
          cropId: crop.id,
          payments: [],
          createdAt: new Date().toISOString(),
        }),
        amount,
        category,
        date,
        notes: notes.trim(),
        owedBy,
        payments: buildPayments(),
        ...(category === 'custom'
          ? { customCategory: customCategory.trim() }
          : {}),
        ...(owedTo.trim() ? { owedTo: owedTo.trim() } : {}),
        ...(splitMode === 'custom' ? { splitAmounts: customSplits } : {}),
      }
      // Clear fields that no longer apply — an edit that switches back to an
      // equal split must not leave the old custom amounts behind, since
      // resolveSplit treats splitAmounts as authoritative.
      if (category !== 'custom') delete expense.customCategory
      if (splitMode !== 'custom') delete expense.splitAmounts
      if (!owedTo.trim()) delete expense.owedTo

      const added = receipts.filter((r) => addedIds.includes(r.id))
      expense.receiptCount = receipts.length
      if (receipts.length === 0) delete expense.receiptCount

      await saveExpense(expense)
      // Photos are written after the expense row exists, so a receipt can
      // never reference an expense that failed to save.
      if (added.length > 0 || removedIds.length > 0) {
        await syncReceipts(expense, added, removedIds)
      }
      onOpenChange(false)
    } catch {
      setError(t('storageFull'))
    } finally {
      setSaving(false)
    }
  }

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? t('removedMember')

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editExpense ? t('editExpense') : t('addExpense')}
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
            {saving ? t('saving') : editExpense ? t('saveChanges') : t('addExpense')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <AmountField
          label={t('amount')}
          placeholder="0"
          value={amountText}
          autoFocus={!editExpense}
          onChange={(e) => setAmountText(e.target.value)}
        />

        <fieldset>
          <legend className="text-sm font-medium text-[var(--muted)] mb-2">
            {t('category')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                selected={category === c.id}
                color={c.colorVar}
                onClick={() => setCategory(c.id)}
              >
                <span aria-hidden="true">{c.emoji}</span>
                {t(c.labelKey)}
              </Chip>
            ))}
          </div>
          {category === 'custom' ? (
            <Field
              label={t('categoryName')}
              className="mt-3"
              placeholder={t('categoryNamePlaceholder')}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
            />
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-[var(--muted)] mb-2">
            {t('paidQuestion')}
          </legend>
          {isInstalmentHistory ? (
            <p className="text-sm text-[var(--muted)] bg-[var(--surface-sunken)] rounded-lg px-3 py-2">
              {t('manyPaymentsNote')}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Chip
                  selected={payMode === 'full'}
                  onClick={() => setPayMode('full')}
                >
                  {t('paidInFull')}
                </Chip>
                <Chip
                  selected={payMode === 'part'}
                  onClick={() => setPayMode('part')}
                >
                  {t('partlyPaid')}
                </Chip>
                <Chip
                  selected={payMode === 'credit'}
                  onClick={() => setPayMode('credit')}
                >
                  {t('onCredit')}
                </Chip>
              </div>

              {payMode === 'part' ? (
                <AmountField
                  label={t('paidSoFar')}
                  className="mt-3"
                  placeholder="0"
                  value={paidText}
                  onChange={(e) => setPaidText(e.target.value)}
                />
              ) : null}

              {payMode !== 'credit' ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-[var(--muted)]">
                      {t('paidBy')}
                    </p>
                    {/* Two people splitting one bill at the shop is ordinary
                        here. Without this it had to be entered as a part
                        payment and then a second instalment, which briefly
                        showed the rest as owed to the shop. */}
                    {members.length > 1 && !isInstalmentHistory ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPayerMode(payerMode === 'one' ? 'several' : 'one')
                        }
                        className="text-xs text-[var(--primary)] font-medium px-2 py-1 rounded-lg active:scale-95 transition-transform"
                      >
                        {payerMode === 'one' ? t('severalPaid') : t('onePaid')}
                      </button>
                    ) : null}
                  </div>

                  {payerMode === 'one' ? (
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => (
                        <Chip
                          key={m.id}
                          selected={paidBy === m.id}
                          onClick={() => setPaidBy(m.id)}
                        >
                          {m.name}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <span className="flex-1 text-sm text-[var(--ink)] truncate">
                            {m.name}
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={t('amountFor', { name: m.name })}
                            value={payerText[m.id] ?? ''}
                            onChange={(e) =>
                              setPayerText((current) => ({
                                ...current,
                                [m.id]: e.target.value,
                              }))
                            }
                            className="w-28 min-h-10 px-2.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--hairline)] text-right tnum outline-none focus:border-[var(--primary-border)]"
                          />
                        </div>
                      ))}
                      {payerCheck && !payerCheck.valid ? (
                        <p className="text-sm text-[var(--warning)]">
                          {payerCheck.difference > 0
                            ? t('splitOverBy', {
                                amount: formatINR(payerCheck.difference),
                              })
                            : t('splitLeftToAssign', {
                                amount: formatINR(-payerCheck.difference),
                              })}
                        </p>
                      ) : payerCheck?.valid ? (
                        <p className="text-sm text-[var(--positive)]">
                          {t('splitAddsUp')}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              {outstandingNow > 0 && amount !== null ? (
                <p className="text-sm mt-3 rounded-lg px-2.5 py-1.5 bg-[var(--warning-tint)] text-[var(--warning)]">
                  {t('stillOutstanding', { amount: formatINR(outstandingNow) })}
                </p>
              ) : null}

              {payMode !== 'full' ? (
                <Field
                  label={t('owedTo')}
                  className="mt-3"
                  placeholder={t('owedToPlaceholder')}
                  value={owedTo}
                  onChange={(e) => setOwedTo(e.target.value)}
                />
              ) : null}
            </>
          )}
        </fieldset>

        <fieldset>
          <div className="flex items-center justify-between mb-2 gap-2">
            <legend className="text-sm font-medium text-[var(--muted)]">
              {t('whoOwes')}
            </legend>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setOwedBy(members.map((m) => m.id))}
                className="text-xs text-[var(--primary)] font-medium px-2 py-1 rounded-lg active:scale-95 transition-transform"
              >
                {t('everyone')}
              </button>
              {/* Clearing in one tap is what makes the "someone else owes it
                  all" case quick — pick one name instead of deselecting
                  everyone individually. */}
              <button
                type="button"
                onClick={() => setOwedBy([])}
                className="text-xs text-[var(--primary)] font-medium px-2 py-1 rounded-lg active:scale-95 transition-transform"
              >
                {t('clear')}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <Chip
                key={m.id}
                selected={owedBy.includes(m.id)}
                onClick={() => toggleOwed(m.id)}
              >
                {m.name}
              </Chip>
            ))}
          </div>

          {owedBy.length === 1 && owedBy[0] !== paidBy ? (
            <p className="text-xs text-[var(--muted)] mt-2 bg-[var(--warning-tint)] text-[var(--warning)] rounded-lg px-2.5 py-1.5">
              {t('paidButOwed', {
                payer: memberName(paidBy),
                ower: memberName(owedBy[0]!),
              })}
            </p>
          ) : null}
        </fieldset>

        {owedBy.length > 1 ? (
          <fieldset>
            <legend className="text-sm font-medium text-[var(--muted)] mb-2">
              {t('split')}
            </legend>
            <div className="flex gap-2">
              <Chip
                selected={splitMode === 'equal'}
                onClick={() => setSplitMode('equal')}
              >
                {t('equally')}
              </Chip>
              <Chip
                selected={splitMode === 'custom'}
                onClick={() => setSplitMode('custom')}
              >
                {t('customAmounts')}
              </Chip>
            </div>

            {splitMode === 'equal' ? (
              equalPreview.length > 0 ? (
                <p className="text-sm text-[var(--muted)] mt-2.5">
                  {equalPreview.some((s) => s.amount !== equalPreview[0]!.amount)
                    ? t('eachAmountRounded', {
                        amount: formatINR(equalPreview[0]!.amount),
                      })
                    : t('eachAmount', {
                        amount: formatINR(equalPreview[0]!.amount),
                      })}
                </p>
              ) : null
            ) : (
              <div className="mt-3 space-y-2">
                {owedBy.map((memberId) => (
                  <div key={memberId} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-[var(--ink)] truncate">
                      {memberName(memberId)}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={t('amountFor', { name: memberName(memberId) })}
                      value={customText[memberId] ?? ''}
                      onChange={(e) =>
                        setCustomText((t) => ({
                          ...t,
                          [memberId]: e.target.value,
                        }))
                      }
                      className="w-28 min-h-10 px-2.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--hairline)] text-right tnum outline-none focus:border-[var(--primary-border)]"
                    />
                  </div>
                ))}
                {customCheck && !customCheck.valid ? (
                  <p className="text-sm text-[var(--warning)]">
                    {customCheck.difference > 0
                      ? t('splitOverBy', { amount: formatINR(customCheck.difference) })
                      : t('splitLeftToAssign', {
                          amount: formatINR(-customCheck.difference),
                        })}
                  </p>
                ) : customCheck?.valid ? (
                  <p className="text-sm text-[var(--positive)]">{t('splitAddsUp')}</p>
                ) : null}
              </div>
            )}
          </fieldset>
        ) : null}

        <div className="grid grid-cols-1 gap-4">
          <Field
            label={t('date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextAreaField
            label={t('notes')}
            placeholder={t('notesPlaceholder')}
            value={notes}
            maxLength={200}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <ReceiptPicker
          expenseId={editExpense?.id ?? draftId}
          receipts={receipts}
          onAdd={(added) => {
            setReceipts((current) => [...current, ...added])
            setAddedIds((current) => [...current, ...added.map((r) => r.id)])
          }}
          onRemove={(id) => {
            setReceipts((current) => current.filter((r) => r.id !== id))
            // Only photos already in storage need deleting; one added and
            // removed in the same session was never written.
            if (addedIds.includes(id)) {
              setAddedIds((current) => current.filter((x) => x !== id))
            } else {
              setRemovedIds((current) => [...current, id])
            }
          }}
          onView={setViewerIndex}
        />
      </div>

      {viewerIndex !== null ? (
        <ReceiptViewer
          receipts={receipts}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </Modal>
  )
}
