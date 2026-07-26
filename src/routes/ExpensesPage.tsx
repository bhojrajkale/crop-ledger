import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Card, EmptyState } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { Modal } from '../components/ui/Modal'
import { ExpenseModal } from '../components/expenses/ExpenseModal'
import { categoryLabel, getCategory } from '../domain/categories'
import { formatINR } from '../domain/money'
import { resolveSplit } from '../domain/split'
import { computeTotals } from '../domain/settlement'
import { amountOutstanding, isPending } from '../domain/payments'
import { ReceiptViewer } from '../components/expenses/ReceiptViewer'
import type { Receipt } from '../domain/types'
import { formatDate } from '../lib/format'
import type { Expense } from '../domain/types'

export function ExpensesPage() {
  const { cropId } = useParams<{ cropId: string }>()
  const crops = useLedgerStore((s) => s.crops)
  const expenses = useLedgerStore((s) => s.expenses)
  const deleteExpense = useLedgerStore((s) => s.deleteExpense)
  const listReceipts = useLedgerStore((s) => s.listReceipts)

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [removing, setRemoving] = useState<Expense | null>(null)
  const [viewing, setViewing] = useState<Receipt[] | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [pendingOnly, setPendingOnly] = useState(false)

  const crop = crops.find((c) => c.id === cropId)

  const totals = useMemo(
    () => computeTotals(crop?.members ?? [], expenses),
    [crop?.members, expenses]
  )

  const presentCategories = useMemo(
    () => [...new Set(expenses.map((e) => e.category))],
    [expenses]
  )

  const pendingCount = useMemo(
    () => expenses.filter(isPending).length,
    [expenses]
  )

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return expenses.filter((e) => {
      if (pendingOnly && !isPending(e)) return false
      if (categoryFilter && e.category !== categoryFilter) return false
      if (!query) return true
      const label = categoryLabel(e.category, e.customCategory).toLowerCase()
      return (
        e.notes.toLowerCase().includes(query) ||
        label.includes(query) ||
        (e.owedTo ?? '').toLowerCase().includes(query)
      )
    })
  }, [expenses, search, categoryFilter, pendingOnly])

  if (!crop) return null

  const memberName = (id: string) =>
    crop.members.find((m) => m.id === id)?.name ?? 'Removed member'

  if (crop.members.length === 0) {
    return (
      <EmptyState
        emoji="👥"
        title="Add people first"
        description="An expense needs someone who paid it and someone it belongs to, so start by adding the people involved in this crop."
        action={
          <Link to={`/crop/${crop.id}/members`}>
            <Button variant="primary">Add people</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--faint)]">
            Total spent
          </p>
          <p className="text-2xl font-bold text-[var(--ink)] tnum mt-0.5">
            {formatINR(totals.total)}
          </p>
          <p className="text-sm text-[var(--muted)] mt-0.5 tnum">
            {formatINR(totals.perHead)} per head
          </p>
          {totals.outstanding > 0 ? (
            <p className="text-sm mt-1 tnum text-[var(--warning)]">
              {formatINR(totals.outstanding)} still to pay
            </p>
          ) : null}
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          + Add
        </Button>
      </Card>

      {expenses.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="No expenses yet"
          description="Record what's been spent on this crop — seeds, labour, fuel — and who paid for it."
          action={
            <Button variant="primary" onClick={() => setAdding(true)}>
              Add the first expense
            </Button>
          }
        />
      ) : (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes or category"
            aria-label="Search expenses"
            className="w-full min-h-11 px-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--hairline)] text-[var(--ink)] placeholder:text-[var(--faint)] outline-none focus:border-[var(--primary-border)]"
          />

          {presentCategories.length > 1 || pendingCount > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pendingCount > 0 ? (
                <Chip
                  selected={pendingOnly}
                  color="--warning"
                  onClick={() => setPendingOnly(!pendingOnly)}
                >
                  <span aria-hidden="true">⏳</span>
                  Pending ({pendingCount})
                </Chip>
              ) : null}
              {presentCategories.map((id) => {
                const category = getCategory(id)
                return (
                  <Chip
                    key={id}
                    selected={categoryFilter === id}
                    color={category.colorVar}
                    onClick={() =>
                      setCategoryFilter(categoryFilter === id ? null : id)
                    }
                  >
                    <span aria-hidden="true">{category.emoji}</span>
                    {category.label}
                  </Chip>
                )
              })}
            </div>
          ) : null}

          {visible.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">
              Nothing matches that.
            </p>
          ) : (
            <ul className="space-y-2">
              {visible.map((expense) => (
                <li key={expense.id}>
                  <ExpenseRow
                    expense={expense}
                    memberName={memberName}
                    onEdit={() => setEditing(expense)}
                    onDelete={() => setRemoving(expense)}
                    onViewReceipts={async () => {
                      // Images are fetched only on tap, never as part of the
                      // list read that runs on every render.
                      const found = await listReceipts(expense.id)
                      if (found.length > 0) setViewing(found)
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ExpenseModal open={adding} onOpenChange={setAdding} crop={crop} />
      <ExpenseModal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        crop={crop}
        {...(editing ? { editExpense: editing } : {})}
      />

      {viewing ? (
        <ReceiptViewer receipts={viewing} onClose={() => setViewing(null)} />
      ) : null}

      <Modal
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title="Delete this expense?"
        footer={
          <div className="flex gap-2">
            <Button fullWidth onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={async () => {
                if (removing) await deleteExpense(removing.id)
                setRemoving(null)
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--muted)]">
          {removing ? formatINR(removing.amount) : ''} will be removed from this
          crop&apos;s total and the settlement will be recalculated.
        </p>
      </Modal>
    </div>
  )
}

function ExpenseRow({
  expense,
  memberName,
  onEdit,
  onDelete,
  onViewReceipts,
}: {
  expense: Expense
  memberName: (id: string) => string
  onEdit: () => void
  onDelete: () => void
  onViewReceipts: () => void
}) {
  const category = getCategory(expense.category)
  const shares = resolveSplit(expense)
  const payers = [...new Set(expense.payments.map((p) => p.memberId))]
  const soleOwer =
    expense.owedBy.length === 1 && !payers.includes(expense.owedBy[0]!)
      ? expense.owedBy[0]
      : null
  const outstanding = amountOutstanding(expense)

  const paidLabel =
    payers.length === 0
      ? 'Unpaid'
      : payers.length === 1
        ? `${memberName(payers[0]!)} paid`
        : `${payers.length} part-payments`

  return (
    <Card className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="shrink-0 inline-flex items-center justify-center size-10 rounded-xl text-lg"
        style={{ backgroundColor: `var(${category.colorVar})`, opacity: 0.92 }}
      >
        {category.emoji}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-medium text-[var(--ink)] truncate">
            {categoryLabel(expense.category, expense.customCategory)}
          </p>
          <p className="font-semibold text-[var(--ink)] tnum shrink-0">
            {formatINR(expense.amount)}
          </p>
        </div>

        <p className="text-sm text-[var(--muted)] mt-0.5">
          {paidLabel} ·{' '}
          {soleOwer ? (
            <span className="text-[var(--warning)]">
              {memberName(soleOwer)} owes it all
            </span>
          ) : expense.splitAmounts?.length ? (
            `split ${shares.length} ways (custom)`
          ) : (
            `split ${shares.length} ways`
          )}
        </p>

        {outstanding > 0 ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium mt-1.5 rounded-full px-2 py-1 bg-[var(--warning-tint)] text-[var(--warning)]">
            <span aria-hidden="true">⏳</span>
            {formatINR(outstanding)} pending
            {expense.owedTo ? ` · ${expense.owedTo}` : ''}
          </p>
        ) : null}

        {expense.notes ? (
          <p className="text-sm text-[var(--faint)] mt-1 line-clamp-2">
            {expense.notes}
          </p>
        ) : null}

        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-[var(--faint)]">
            {formatDate(expense.date)}
          </span>
          {expense.receiptCount ? (
            <button
              type="button"
              onClick={onViewReceipts}
              className="text-xs text-[var(--primary)] font-medium active:scale-95 transition-transform"
            >
              📷 {expense.receiptCount > 1 ? expense.receiptCount : ''}
              {expense.receiptCount > 1 ? ' photos' : 'Receipt'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-[var(--primary)] font-medium active:scale-95 transition-transform"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-[var(--negative)] font-medium active:scale-95 transition-transform"
          >
            Delete
          </button>
        </div>
      </div>
    </Card>
  )
}
