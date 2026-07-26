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
import type { CategoryId, Crop, Expense, SplitAmount } from '../../domain/types'

type SplitMode = 'equal' | 'custom'

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
  const members = crop.members

  const [amountText, setAmountText] = useState('')
  const [category, setCategory] = useState<CategoryId>('seeds')
  const [customCategory, setCustomCategory] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [owedBy, setOwedBy] = useState<string[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [customText, setCustomText] = useState<Record<string, string>>({})
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const allIds = members.map((m) => m.id)
    setAmountText(editExpense ? formatAmount(editExpense.amount) : '')
    setCategory(editExpense?.category ?? 'seeds')
    setCustomCategory(editExpense?.customCategory ?? '')
    setDate(editExpense?.date ?? todayISO())
    setNotes(editExpense?.notes ?? '')
    setPaidBy(editExpense?.paidBy ?? allIds[0] ?? '')
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
    setError(undefined)
  }, [open, editExpense, members])

  const amount = parseRupees(amountText)

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

  const equalPreview =
    amount !== null && owedBy.length > 0 ? splitEqually(amount, owedBy) : []

  const toggleOwed = (memberId: string) => {
    setOwedBy((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    )
  }

  const submit = async () => {
    if (amount === null || amount <= 0) {
      setError('Enter an amount.')
      return
    }
    if (!paidBy) {
      setError('Pick who paid.')
      return
    }
    if (owedBy.length === 0) {
      setError('Pick who this expense is for.')
      return
    }
    if (category === 'custom' && !customCategory.trim()) {
      setError('Name the category.')
      return
    }
    if (splitMode === 'custom' && customCheck && !customCheck.valid) {
      setError(
        customCheck.difference > 0
          ? `The split is over by ${formatINR(customCheck.difference)}.`
          : `${formatINR(-customCheck.difference)} is still unassigned.`
      )
      return
    }

    setSaving(true)
    try {
      const expense: Expense = {
        ...(editExpense ?? {
          id: newId(),
          cropId: crop.id,
          createdAt: new Date().toISOString(),
        }),
        amount,
        category,
        date,
        notes: notes.trim(),
        paidBy,
        owedBy,
        ...(category === 'custom'
          ? { customCategory: customCategory.trim() }
          : {}),
        ...(splitMode === 'custom' ? { splitAmounts: customSplits } : {}),
      }
      // Clear fields that no longer apply — an edit that switches back to an
      // equal split must not leave the old custom amounts behind, since
      // resolveSplit treats splitAmounts as authoritative.
      if (category !== 'custom') delete expense.customCategory
      if (splitMode !== 'custom') delete expense.splitAmounts

      await saveExpense(expense)
      onOpenChange(false)
    } catch {
      setError('Could not save. Your browser may be out of storage space.')
    } finally {
      setSaving(false)
    }
  }

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? 'Unknown'

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editExpense ? 'Edit expense' : 'Add expense'}
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
            {saving ? 'Saving…' : editExpense ? 'Save changes' : 'Add expense'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <AmountField
          label="Amount"
          placeholder="0"
          value={amountText}
          autoFocus={!editExpense}
          onChange={(e) => setAmountText(e.target.value)}
        />

        <fieldset>
          <legend className="text-sm font-medium text-[var(--muted)] mb-2">
            Category
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
                {c.label}
              </Chip>
            ))}
          </div>
          {category === 'custom' ? (
            <Field
              label="Category name"
              className="mt-3"
              placeholder="e.g. Crop insurance"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
            />
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-[var(--muted)] mb-2">
            Who paid
          </legend>
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
        </fieldset>

        <fieldset>
          <div className="flex items-center justify-between mb-2 gap-2">
            <legend className="text-sm font-medium text-[var(--muted)]">
              Who owes it
            </legend>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setOwedBy(members.map((m) => m.id))}
                className="text-xs text-[var(--primary)] font-medium px-2 py-1 rounded-lg active:scale-95 transition-transform"
              >
                Everyone
              </button>
              {/* Clearing in one tap is what makes the "someone else owes it
                  all" case quick — pick one name instead of deselecting
                  everyone individually. */}
              <button
                type="button"
                onClick={() => setOwedBy([])}
                className="text-xs text-[var(--primary)] font-medium px-2 py-1 rounded-lg active:scale-95 transition-transform"
              >
                Clear
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
              {memberName(paidBy)} paid, but {memberName(owedBy[0]!)} owes the
              full amount.
            </p>
          ) : null}
        </fieldset>

        {owedBy.length > 1 ? (
          <fieldset>
            <legend className="text-sm font-medium text-[var(--muted)] mb-2">
              Split
            </legend>
            <div className="flex gap-2">
              <Chip
                selected={splitMode === 'equal'}
                onClick={() => setSplitMode('equal')}
              >
                Equally
              </Chip>
              <Chip
                selected={splitMode === 'custom'}
                onClick={() => setSplitMode('custom')}
              >
                Custom amounts
              </Chip>
            </div>

            {splitMode === 'equal' ? (
              equalPreview.length > 0 ? (
                <p className="text-sm text-[var(--muted)] mt-2.5">
                  {formatINR(equalPreview[0]!.amount)} each
                  {equalPreview.some(
                    (s) => s.amount !== equalPreview[0]!.amount
                  )
                    ? ' (a paisa more for the first few, so it adds up exactly)'
                    : ''}
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
                      aria-label={`Amount for ${memberName(memberId)}`}
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
                      ? `Over by ${formatINR(customCheck.difference)}`
                      : `${formatINR(-customCheck.difference)} left to assign`}
                  </p>
                ) : customCheck?.valid ? (
                  <p className="text-sm text-[var(--positive)]">Adds up ✓</p>
                ) : null}
              </div>
            )}
          </fieldset>
        ) : null}

        <div className="grid grid-cols-1 gap-4">
          <Field
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextAreaField
            label="Notes"
            placeholder="Optional — bill number, shop, anything worth remembering"
            value={notes}
            maxLength={200}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
