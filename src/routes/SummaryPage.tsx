import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Card, EmptyState, SectionTitle } from '../components/ui/Card'
import { Avatar } from '../components/ui/Chip'
import { computeBalances, computeTotals, minimizeTransfers } from '../domain/settlement'
import { computeOutstanding } from '../domain/payments'
import { RecordPaymentModal } from '../components/expenses/RecordPaymentModal'
import { Button } from '../components/ui/Button'
import { categoryLabel, getCategory } from '../domain/categories'
import { formatINR } from '../domain/money'
import { formatDate, initials, pluralize } from '../lib/format'
import type { CategoryId, Expense } from '../domain/types'

export function SummaryPage() {
  const { cropId } = useParams<{ cropId: string }>()
  const crops = useLedgerStore((s) => s.crops)
  const expenses = useLedgerStore((s) => s.expenses)

  const crop = crops.find((c) => c.id === cropId)
  const members = useMemo(() => crop?.members ?? [], [crop])

  const totals = useMemo(
    () => computeTotals(members, expenses),
    [members, expenses]
  )
  const balances = useMemo(
    () => computeBalances(members, expenses),
    [members, expenses]
  )
  const transfers = useMemo(() => minimizeTransfers(balances), [balances])
  const outstanding = useMemo(() => computeOutstanding(expenses), [expenses])
  const [payingOff, setPayingOff] = useState<Expense | null>(null)

  if (!crop) return null

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? 'Removed member'

  if (expenses.length === 0) {
    return (
      <EmptyState
        emoji="📊"
        title="Nothing to summarise yet"
        description="Once you've recorded some expenses, this shows the total, the per-head share, and who should pay whom."
      />
    )
  }

  const categoryRows = [...totals.byCategory.entries()].sort(
    (a, b) => b[1] - a[1]
  )

  return (
    <div className="space-y-6 pb-4">
      <Card>
        <p className="text-xs uppercase tracking-wider text-[var(--faint)]">
          Total spent
        </p>
        <p className="text-3xl font-bold text-[var(--ink)] tnum mt-1">
          {formatINR(totals.total)}
        </p>
        <div className="flex gap-6 mt-3 pt-3 border-t border-[var(--hairline)]">
          <div>
            <p className="text-xs text-[var(--faint)]">Per head</p>
            <p className="font-semibold text-[var(--ink)] tnum">
              {formatINR(totals.perHead)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--faint)]">People</p>
            <p className="font-semibold text-[var(--ink)] tnum">
              {members.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--faint)]">Entries</p>
            <p className="font-semibold text-[var(--ink)] tnum">
              {expenses.length}
            </p>
          </div>
        </div>
        {totals.outstanding > 0 ? (
          <p className="text-sm text-[var(--muted)] mt-3 pt-3 border-t border-[var(--hairline)] tnum">
            <span className="text-[var(--ink)] font-medium">
              {formatINR(totals.paid)}
            </span>{' '}
            paid ·{' '}
            <span className="text-[var(--warning)] font-medium">
              {formatINR(totals.outstanding)}
            </span>{' '}
            still to pay
          </p>
        ) : null}
      </Card>

      {outstanding.total > 0 ? (
        <section>
          <SectionTitle>Still to pay ({pluralize(outstanding.entries.length, 'bill')})</SectionTitle>
          <Card className="mb-2">
            <p className="text-xs uppercase tracking-wider text-[var(--faint)]">
              Outstanding
            </p>
            <p className="text-2xl font-bold tnum mt-0.5 text-[var(--warning)]">
              {formatINR(outstanding.total)}
            </p>
            <p className="text-sm text-[var(--muted)] mt-1">
              Owed to shops and contractors, not between members — so it is
              kept out of the settlement below until it is actually paid.
            </p>
            {outstanding.byCreditor.length > 1 ? (
              <ul className="mt-3 pt-3 border-t border-[var(--hairline)] space-y-1 text-sm">
                {outstanding.byCreditor.map((group) => (
                  <li
                    key={group.creditor ?? 'unnamed'}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-[var(--muted)] truncate">
                      {group.creditor ?? 'Not recorded'}
                    </span>
                    <span className="tnum font-medium text-[var(--ink)] shrink-0">
                      {formatINR(group.total)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <ul className="space-y-2">
            {outstanding.entries.map(({ expense, outstanding: due }) => (
              <li key={expense.id}>
                <Card>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-[var(--ink)] truncate">
                      {categoryLabel(expense.category, expense.customCategory)}
                    </p>
                    <p className="font-semibold tnum shrink-0 text-[var(--warning)]">
                      {formatINR(due)}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-0.5">
                    {expense.owedTo ? `${expense.owedTo} · ` : ''}
                    {formatDate(expense.date)}
                    {due < expense.amount
                      ? ` · ${formatINR(expense.amount - due)} of ${formatINR(expense.amount)} paid`
                      : ''}
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    className="mt-2.5"
                    onClick={() => setPayingOff(expense)}
                  >
                    Record payment
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionTitle>Who owes whom</SectionTitle>
        {transfers.length === 0 ? (
          <Card>
            {outstanding.total > 0 ? (
              // Saying "everyone is square" while bills are unpaid would be
              // true between members but misleading about the crop overall.
              <p className="text-sm text-[var(--muted)]">
                Nothing to settle{' '}
                <span className="font-medium text-[var(--ink)]">
                  between members
                </span>{' '}
                — but {formatINR(outstanding.total)} is still owed outside the
                group.
              </p>
            ) : (
              <p className="text-sm text-[var(--positive)] font-medium">
                Everyone is square — nothing to settle. ✓
              </p>
            )}
          </Card>
        ) : (
          <>
            <ul className="space-y-2">
              {transfers.map((t) => (
                <li key={`${t.from}-${t.to}`}>
                  <Card className="flex items-center gap-3">
                    <Avatar initials={initials(memberName(t.from))} />
                    <div className="flex-1 min-w-0 text-sm">
                      <span className="font-medium text-[var(--ink)]">
                        {memberName(t.from)}
                      </span>
                      <span className="text-[var(--muted)]"> pays </span>
                      <span className="font-medium text-[var(--ink)]">
                        {memberName(t.to)}
                      </span>
                    </div>
                    <span className="font-semibold text-[var(--ink)] tnum shrink-0">
                      {formatINR(t.amount)}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[var(--faint)] mt-2 px-1">
              {pluralize(transfers.length, 'payment')} settles everyone up.
            </p>
          </>
        )}
      </section>

      <section>
        <SectionTitle>Each person</SectionTitle>
        <ul className="space-y-2">
          {members.map((member) => {
            const balance = balances.get(member.id) ?? 0
            const paid = totals.paidByMember.get(member.id) ?? 0
            const owes = totals.owedByMember.get(member.id) ?? 0
            return (
              <li key={member.id}>
                <Card>
                  <div className="flex items-center gap-3">
                    <Avatar initials={initials(member.name)} />
                    <p className="flex-1 min-w-0 font-medium text-[var(--ink)] truncate">
                      {member.name}
                    </p>
                    <span
                      className="font-semibold tnum shrink-0"
                      style={{
                        color:
                          balance > 0
                            ? 'var(--positive)'
                            : balance < 0
                              ? 'var(--negative)'
                              : 'var(--muted)',
                      }}
                    >
                      {balance === 0
                        ? 'Settled'
                        : balance > 0
                          ? `gets ${formatINR(balance)}`
                          : `owes ${formatINR(-balance)}`}
                    </span>
                  </div>
                  <div className="flex gap-6 mt-2.5 pt-2.5 border-t border-[var(--hairline)] text-sm">
                    <span className="text-[var(--muted)]">
                      Paid{' '}
                      <span className="text-[var(--ink)] tnum font-medium">
                        {formatINR(paid)}
                      </span>
                    </span>
                    <span className="text-[var(--muted)]">
                      Share{' '}
                      <span className="text-[var(--ink)] tnum font-medium">
                        {formatINR(owes)}
                      </span>
                    </span>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <SectionTitle>Where it went</SectionTitle>
        <Card className="space-y-3">
          {categoryRows.map(([id, amount]) => {
            const category = getCategory(id as CategoryId)
            const share = totals.total > 0 ? (amount / totals.total) * 100 : 0
            return (
              <div key={id}>
                <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
                  <span className="text-[var(--ink)] truncate">
                    <span aria-hidden="true">{category.emoji}</span>{' '}
                    {categoryLabel(id as CategoryId)}
                  </span>
                  <span className="text-[var(--ink)] tnum font-medium shrink-0">
                    {formatINR(amount)}
                    <span className="text-[var(--faint)] font-normal">
                      {' '}
                      {share.toFixed(0)}%
                    </span>
                  </span>
                </div>
                {/* The percentage is stated in text as well as drawn, so the
                    bar is reinforcement rather than the only way to read it. */}
                <div
                  className="h-1.5 rounded-full bg-[var(--surface-sunken)] overflow-hidden"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${share}%`,
                      backgroundColor: `var(${category.colorVar})`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </Card>
      </section>

      <RecordPaymentModal
        expense={payingOff}
        members={members}
        onClose={() => setPayingOff(null)}
      />
    </div>
  )
}
