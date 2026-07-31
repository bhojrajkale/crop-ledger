import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Card, EmptyState } from '../components/ui/Card'
import { Loading } from '../components/ui/Loading'
import { Chip } from '../components/ui/Chip'
import { Modal } from '../components/ui/Modal'
import { ExpenseModal } from '../components/expenses/ExpenseModal'
import { categoryLabel, getCategory } from '../domain/categories'
import { formatINR } from '../domain/money'
import { resolveSplit } from '../domain/split'
import { computeTotals } from '../domain/settlement'
import { amountOutstanding, isPending } from '../domain/payments'
import { ReceiptViewer } from '../components/expenses/ReceiptViewer'
import { RecordPaymentModal } from '../components/expenses/RecordPaymentModal'
import type { Receipt } from '../domain/types'
import { formatDate } from '../lib/format'
import { intlLocale, useLanguage, useT } from '../i18n'
import type { Expense } from '../domain/types'

export function ExpensesPage() {
  const { cropId } = useParams<{ cropId: string }>()
  const crops = useLedgerStore((s) => s.crops)
  const expenses = useLedgerStore((s) => s.expenses)
  const cropLoading = useLedgerStore((s) => s.cropLoading)
  const deleteExpense = useLedgerStore((s) => s.deleteExpense)
  const listReceipts = useLedgerStore((s) => s.listReceipts)
  const t = useT()

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [removing, setRemoving] = useState<Expense | null>(null)
  const [viewing, setViewing] = useState<Receipt[] | null>(null)
  const [payingOff, setPayingOff] = useState<Expense | null>(null)
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
      const label = categoryLabel(e.category, t, e.customCategory).toLowerCase()
      return (
        e.notes.toLowerCase().includes(query) ||
        label.includes(query) ||
        (e.owedTo ?? '').toLowerCase().includes(query)
      )
    })
  }, [expenses, search, categoryFilter, pendingOnly, t])

  if (!crop) return null

  // Ahead of the empty-state check below: without this, a slow read renders
  // "no expenses yet" over a crop that has plenty.
  if (cropLoading) return <Loading />

  const memberName = (id: string) =>
    crop.members.find((m) => m.id === id)?.name ?? t('removedMember')

  if (crop.members.length === 0) {
    return (
      <EmptyState
        emoji="👥"
        title={t('addPeopleFirstTitle')}
        description={t('addPeopleFirstBody')}
        action={
          <Link to={`/crop/${crop.id}/members`}>
            <Button variant="primary">{t('addPeople')}</Button>
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
            {t('totalSpent')}
          </p>
          <p className="text-2xl font-bold text-[var(--ink)] tnum mt-0.5">
            {formatINR(totals.total)}
          </p>
          <p className="text-sm text-[var(--muted)] mt-0.5 tnum">
            {t('perHead', { amount: formatINR(totals.perHead) })}
          </p>
          {totals.outstanding > 0 ? (
            <p className="text-sm mt-1 tnum text-[var(--warning)]">
              {t('stillToPayShort', { amount: formatINR(totals.outstanding) })}
            </p>
          ) : null}
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          {t('addShort')}
        </Button>
      </Card>

      {expenses.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title={t('noExpensesTitle')}
          description={t('noExpensesBody')}
          action={
            <Button variant="primary" onClick={() => setAdding(true)}>
              {t('addFirstExpense')}
            </Button>
          }
        />
      ) : (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchExpenses')}
            aria-label={t('searchExpenses')}
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
                  {t('pendingFilter', { count: pendingCount })}
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
                    {t(category.labelKey)}
                  </Chip>
                )
              })}
            </div>
          ) : null}

          {visible.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">
              {t('nothingMatches')}
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
                    onRecordPayment={() => setPayingOff(expense)}
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

      {/* The same modal the Summary tab opens — one way to record a payment,
          reachable from either screen. */}
      <RecordPaymentModal
        expense={payingOff}
        members={crop.members}
        onClose={() => setPayingOff(null)}
      />

      <Modal
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={t('deleteExpenseTitle')}
        footer={
          <div className="flex gap-2">
            <Button fullWidth onClick={() => setRemoving(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={async () => {
                if (removing) await deleteExpense(removing.id)
                setRemoving(null)
              }}
            >
              {t('delete')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--muted)]">
          {t('deleteExpenseBody', {
            amount: removing ? formatINR(removing.amount) : '',
          })}
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
  onRecordPayment,
}: {
  expense: Expense
  memberName: (id: string) => string
  onEdit: () => void
  onDelete: () => void
  onViewReceipts: () => void
  onRecordPayment: () => void
}) {
  const t = useT()
  const locale = intlLocale(useLanguage())
  const category = getCategory(expense.category)
  const shares = resolveSplit(expense)
  const payers = [...new Set(expense.payments.map((p) => p.memberId))]
  const soleOwer =
    expense.owedBy.length === 1 && !payers.includes(expense.owedBy[0]!)
      ? expense.owedBy[0]
      : null
  const outstanding = amountOutstanding(expense)

  // Several people paying one bill between them reads differently from one
  // person clearing a debt in instalments, even though both are just a list
  // of payments. Distinct people on the same day is the first; anything else
  // is the second.
  const paidTogether =
    payers.length > 1 &&
    payers.length === expense.payments.length &&
    new Set(expense.payments.map((p) => p.paidAt)).size === 1

  const paidLabel =
    payers.length === 0
      ? t('unpaid')
      : payers.length === 1
        ? t('memberPaid', { name: memberName(payers[0]!) })
        : paidTogether
          ? t('nPeoplePaid', { names: payers.map(memberName).join(', ') })
          : t('nPartPayments', { count: payers.length })

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
            {categoryLabel(expense.category, t, expense.customCategory)}
          </p>
          <p className="font-semibold text-[var(--ink)] tnum shrink-0">
            {formatINR(expense.amount)}
          </p>
        </div>

        <p className="text-sm text-[var(--muted)] mt-0.5">
          {paidLabel} ·{' '}
          {soleOwer ? (
            <span className="text-[var(--warning)]">
              {t('owesItAll', { name: memberName(soleOwer) })}
            </span>
          ) : expense.splitAmounts?.length ? (
            t('splitNWaysCustom', { count: shares.length })
          ) : (
            t('splitNWays', { count: shares.length })
          )}
        </p>

        {/* The pending badge and the way to act on it, together. They used to
            be on different tabs: the row said "₹3,200 pending" and the only
            button that could clear it lived on the Summary screen, which is
            not where anyone looks after spotting an unpaid bill. */}
        {outstanding > 0 ? (
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-1 bg-[var(--warning-tint)] text-[var(--warning)]">
              <span aria-hidden="true">⏳</span>
              {t('amountPending', { amount: formatINR(outstanding) })}
              {expense.owedTo ? ` · ${expense.owedTo}` : ''}
            </p>
            <button
              type="button"
              onClick={onRecordPayment}
              className="text-xs font-medium rounded-full px-2.5 py-1 bg-[var(--primary)] text-[var(--primary-ink)] active:scale-95 transition-transform"
            >
              {t('recordPayment')}
            </button>
          </div>
        ) : null}

        {expense.notes ? (
          <p className="text-sm text-[var(--faint)] mt-1 line-clamp-2">
            {expense.notes}
          </p>
        ) : null}

        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-[var(--faint)]">
            {formatDate(expense.date, locale)}
          </span>
          {expense.receiptCount ? (
            <button
              type="button"
              onClick={onViewReceipts}
              className="text-xs text-[var(--primary)] font-medium active:scale-95 transition-transform"
            >
              📷{' '}
              {expense.receiptCount > 1
                ? t('viewNPhotos', { count: expense.receiptCount })
                : t('viewReceipt')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-[var(--primary)] font-medium active:scale-95 transition-transform"
          >
            {t('edit')}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-[var(--negative)] font-medium active:scale-95 transition-transform"
          >
            {t('delete')}
          </button>
        </div>
      </div>
    </Card>
  )
}
