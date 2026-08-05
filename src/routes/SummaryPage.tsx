import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Card, EmptyState, SectionTitle } from '../components/ui/Card'
import { Loading } from '../components/ui/Loading'
import { Avatar } from '../components/ui/Chip'
import {
  computeTotals,
  explainBalances,
  minimizeTransfers,
} from '../domain/settlement'
import { computeOutstanding } from '../domain/payments'
import { computeRevenue } from '../domain/revenue'
import { RecordPaymentModal } from '../components/expenses/RecordPaymentModal'
import { SettleUpModal } from '../components/summary/SettleUpModal'
import { BalanceBreakdownModal } from '../components/summary/BalanceBreakdownModal'
import { Button } from '../components/ui/Button'
import { categoryLabel, getCategory } from '../domain/categories'
import { formatINR } from '../domain/money'
import { formatDate, initials } from '../lib/format'
import { buildStatement } from '../lib/statement'
import { downloadCsv, statementFilename, statementToCsv } from '../lib/csv'
import { printStatement, statementToHtml } from '../lib/printStatement'
import { intlLocale, useLanguage, useT } from '../i18n'
import type { CategoryId, Expense, Member, Transfer } from '../domain/types'

export function SummaryPage() {
  const { cropId } = useParams<{ cropId: string }>()
  const crops = useLedgerStore((s) => s.crops)
  const expenses = useLedgerStore((s) => s.expenses)
  const sales = useLedgerStore((s) => s.sales)
  const settlements = useLedgerStore((s) => s.settlements)
  const deleteSettlement = useLedgerStore((s) => s.deleteSettlement)
  const cropLoading = useLedgerStore((s) => s.cropLoading)

  const crop = crops.find((c) => c.id === cropId)
  const members = useMemo(() => crop?.members ?? [], [crop])

  const totals = useMemo(
    () => computeTotals(members, expenses),
    [members, expenses]
  )
  // One pass produces both the balances and the parts they are made of, so
  // the explanation shown on tap cannot disagree with the figure it explains.
  const breakdowns = useMemo(
    () => explainBalances(members, expenses, sales, settlements),
    [members, expenses, sales, settlements]
  )
  const balances = useMemo(
    () => new Map([...breakdowns].map(([id, parts]) => [id, parts.balance])),
    [breakdowns]
  )
  const transfers = useMemo(() => minimizeTransfers(balances), [balances])
  const outstanding = useMemo(() => computeOutstanding(expenses), [expenses])
  const revenue = useMemo(
    () => computeRevenue(members, sales, totals.total),
    [members, sales, totals.total]
  )
  const [payingOff, setPayingOff] = useState<Expense | null>(null)
  const [settling, setSettling] = useState<Transfer | null>(null)
  const [explaining, setExplaining] = useState<Member | null>(null)
  const [exportNotice, setExportNotice] = useState<string>()
  const t = useT()
  const language = useLanguage()
  const locale = intlLocale(language)

  /**
   * Built on demand rather than memoised: this runs on a tap, not a render,
   * and holding a second copy of the season's rows in memory for a button
   * nobody presses most days is the wrong trade on a phone.
   */
  const statement = () =>
    crop
      ? buildStatement({ crop, expenses, sales, settlements, t, locale })
      : null

  // No await before window.open — Safari refuses a window opened after the
  // user gesture has been lost, and the whole thing is synchronous anyway.
  const onPrint = () => {
    const built = statement()
    if (!built) return
    setExportNotice(
      printStatement(statementToHtml(built, language, locale))
        ? undefined
        : t('printBlocked')
    )
  }

  const onDownload = () => {
    const built = statement()
    if (!built) return
    try {
      downloadCsv(
        statementToCsv(built),
        statementFilename(crop!.name, crop!.season, 'csv')
      )
      setExportNotice(t('spreadsheetSaved'))
    } catch {
      setExportNotice(t('exportFailed'))
    }
  }

  if (!crop) return null

  // Every figure here is derived from the rows being read. Rendering mid-read
  // shows a settlement of zero — not a slow answer, a wrong one.
  if (cropLoading) return <Loading />

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? t('removedMember')

  if (expenses.length === 0 && sales.length === 0) {
    return (
      <EmptyState
        emoji="📊"
        title={t('nothingToSummariseTitle')}
        description={t('nothingToSummariseBody')}
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
          {t('totalSpent')}
        </p>
        <p className="text-3xl font-bold text-[var(--ink)] tnum mt-1">
          {formatINR(totals.total)}
        </p>
        <div className="flex gap-6 mt-3 pt-3 border-t border-[var(--hairline)]">
          <div>
            <p className="text-xs text-[var(--faint)]">{t('perHeadLabel')}</p>
            <p className="font-semibold text-[var(--ink)] tnum">
              {formatINR(totals.perHead)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--faint)]">{t('people')}</p>
            <p className="font-semibold text-[var(--ink)] tnum">
              {members.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--faint)]">{t('entries')}</p>
            <p className="font-semibold text-[var(--ink)] tnum">
              {expenses.length}
            </p>
          </div>
        </div>
        {totals.outstanding > 0 ? (
          <p className="text-sm text-[var(--muted)] mt-3 pt-3 border-t border-[var(--hairline)] tnum">
            {t('paidOfTotal', {
              paid: formatINR(totals.paid),
              outstanding: formatINR(totals.outstanding),
            })}
          </p>
        ) : null}
      </Card>

      <section>
        <SectionTitle>{t('shareAccounts')}</SectionTitle>
        <Card>
          {/* Buttons before the explanation, and the section sits high on the
              page rather than under every other one. Exporting was previously
              the last thing on a screen that grows with the season, so it
              meant scrolling past a crop's whole history to reach it. The
              paragraph is worth reading once; the buttons are tapped every
              time.

              Stacked and full width on a phone, side by side from sm: up.
              Wrapping content-width buttons instead left the layout at the
              mercy of how long the labels happen to be in the current
              language: they sat neatly in a row in Marathi and broke onto
              two ragged lines in English. */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="primary"
              fullWidth
              className="sm:w-auto"
              onClick={onPrint}
            >
              {t('printStatement')}
            </Button>
            <Button fullWidth className="sm:w-auto" onClick={onDownload}>
              {t('downloadSpreadsheet')}
            </Button>
          </div>
          <p className="text-sm text-[var(--muted)] mt-3">
            {t('shareAccountsBody')}
          </p>
          {exportNotice ? (
            <p role="status" className="text-sm text-[var(--muted)] mt-3">
              {exportNotice}
            </p>
          ) : null}
        </Card>
      </section>

      {sales.length > 0 ? (
        <Card>
          <p className="text-xs uppercase tracking-wider text-[var(--faint)]">
            {t('totalRevenue')}
          </p>
          <p className="text-3xl font-bold tnum mt-1 text-[var(--positive)]">
            {formatINR(revenue.total)}
          </p>
          {revenue.quantity ? (
            <p className="text-sm text-[var(--muted)] mt-0.5">
              {t('soldQuantity', {
                amount: revenue.quantity.amount,
                unit: revenue.quantity.unit,
                rate: formatINR(revenue.quantity.averageRate),
              })}
            </p>
          ) : null}
          <div className="flex gap-6 mt-3 pt-3 border-t border-[var(--hairline)]">
            <div>
              <p className="text-xs text-[var(--faint)]">
                {revenue.net >= 0 ? t('netProfit') : t('netLoss')}
              </p>
              <p
                className="font-semibold tnum"
                style={{
                  color:
                    revenue.net >= 0 ? 'var(--positive)' : 'var(--negative)',
                }}
              >
                {formatINR(Math.abs(revenue.net))}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--faint)]">{t('perHeadLabel')}</p>
              <p className="font-semibold text-[var(--ink)] tnum">
                {formatINR(revenue.perHead)}
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--muted)] mt-3">
            {t('netExplainer', {
              revenue: formatINR(revenue.total),
              expenses: formatINR(totals.total),
            })}
          </p>
        </Card>
      ) : null}

      {outstanding.total > 0 ? (
        <section>
          <SectionTitle>
            {t('stillToPay', {
              count: t('bills', { count: outstanding.entries.length }),
            })}
          </SectionTitle>
          <Card className="mb-2">
            <p className="text-xs uppercase tracking-wider text-[var(--faint)]">
              {t('outstanding')}
            </p>
            <p className="text-2xl font-bold tnum mt-0.5 text-[var(--warning)]">
              {formatINR(outstanding.total)}
            </p>
            <p className="text-sm text-[var(--muted)] mt-1">
              {t('outstandingExplainer')}
            </p>
            {outstanding.byCreditor.length > 1 ? (
              <ul className="mt-3 pt-3 border-t border-[var(--hairline)] space-y-1 text-sm">
                {outstanding.byCreditor.map((group) => (
                  <li
                    key={group.creditor ?? 'unnamed'}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-[var(--muted)] truncate">
                      {group.creditor ?? t('notRecorded')}
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
                      {categoryLabel(expense.category, t, expense.customCategory)}
                    </p>
                    <p className="font-semibold tnum shrink-0 text-[var(--warning)]">
                      {formatINR(due)}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-0.5">
                    {expense.owedTo ? `${expense.owedTo} · ` : ''}
                    {formatDate(expense.date, locale)}
                    {due < expense.amount
                      ? ` · ${t('paidOfAmount', {
                          paid: formatINR(expense.amount - due),
                          total: formatINR(expense.amount),
                        })}`
                      : ''}
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    className="mt-2.5"
                    onClick={() => setPayingOff(expense)}
                  >
                    {t('recordPayment')}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionTitle>{t('whoOwesWhom')}</SectionTitle>
        {transfers.length === 0 ? (
          <Card>
            {outstanding.total > 0 ? (
              // Saying "everyone is square" while bills are unpaid would be
              // true between members but misleading about the crop overall.
              <p className="text-sm text-[var(--muted)]">
                {t('nothingBetweenMembers')}{' '}
                <span className="font-medium text-[var(--ink)]">
                  {t('nothingBetweenMembersEmphasis')}
                </span>{' '}
                {t('nothingBetweenMembersRest', {
                  amount: formatINR(outstanding.total),
                })}
              </p>
            ) : (
              <p className="text-sm text-[var(--positive)] font-medium">
                {t('allSquare')}
              </p>
            )}
          </Card>
        ) : (
          <>
            <ul className="space-y-2">
              {transfers.map((transfer) => (
                <li key={`${transfer.from}-${transfer.to}`}>
                  <Card data-testid="transfer-row">
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials(memberName(transfer.from))} />
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="font-medium text-[var(--ink)]">
                          {memberName(transfer.from)}
                        </span>
                        <span className="text-[var(--muted)]">
                          {' '}
                          {t('paysConnector')}{' '}
                        </span>
                        <span className="font-medium text-[var(--ink)]">
                          {memberName(transfer.to)}
                        </span>
                      </div>
                      <span className="font-semibold text-[var(--ink)] tnum shrink-0">
                        {formatINR(transfer.amount)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="mt-2.5"
                      onClick={() => setSettling(transfer)}
                    >
                      {t('markSettled')}
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[var(--faint)] mt-2 px-1">
              {t('nPaymentsSettle', {
                count: t('payments', { count: transfers.length }),
              })}
            </p>
          </>
        )}
      </section>

      {settlements.length > 0 ? (
        <section>
          <SectionTitle>{t('alreadySettled')}</SectionTitle>
          <ul className="space-y-2">
            {settlements.map((settlement) => (
              <li key={settlement.id}>
                <Card
                  className="flex items-center gap-3"
                  data-testid="settlement-row"
                >
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="text-[var(--ink)]">
                      <span className="font-medium">
                        {memberName(settlement.from)}
                      </span>
                      <span className="text-[var(--muted)]">
                        {' '}
                        {t('paidConnector')}{' '}
                      </span>
                      <span className="font-medium">
                        {memberName(settlement.to)}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--faint)] truncate">
                      {formatDate(settlement.date, locale)}
                      {settlement.note ? ` · ${settlement.note}` : ''}
                    </p>
                  </div>
                  <span className="font-semibold text-[var(--positive)] tnum shrink-0">
                    {formatINR(settlement.amount)}
                  </span>
                  <button
                    type="button"
                    aria-label={t('undoSettlementLabel', {
                      amount: formatINR(settlement.amount),
                    })}
                    onClick={() => void deleteSettlement(settlement.id)}
                    className="text-xs text-[var(--negative)] font-medium active:scale-95 transition-transform shrink-0"
                  >
                    {t('undo')}
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionTitle>{t('eachPerson')}</SectionTitle>
        <ul className="space-y-2">
          {members.map((member) => {
            const balance = balances.get(member.id) ?? 0
            const paid = totals.paidByMember.get(member.id) ?? 0
            const owes = totals.owedByMember.get(member.id) ?? 0
            return (
              <li key={member.id}>
                <Card data-testid="person-row">
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
                        ? t('settled')
                        : balance > 0
                          ? t('gets', { amount: formatINR(balance) })
                          : t('owes', { amount: formatINR(-balance) })}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-2.5 pt-2.5 border-t border-[var(--hairline)] text-sm">
                    <span className="text-[var(--muted)]">
                      {t('paidLabel')}{' '}
                      <span className="text-[var(--ink)] tnum font-medium">
                        {formatINR(paid)}
                      </span>
                    </span>
                    <span className="text-[var(--muted)]">
                      {t('shareLabel')}{' '}
                      <span className="text-[var(--ink)] tnum font-medium">
                        {formatINR(owes)}
                      </span>
                    </span>
                    {/* Paid and Share alone do not add up to the figure above
                        once credit or a harvest is in play. Rather than hide
                        that, offer the working. */}
                    <button
                      type="button"
                      onClick={() => setExplaining(member)}
                      className="ml-auto text-[var(--primary)] font-medium active:scale-95 transition-transform"
                    >
                      {t('explainBalance')}
                    </button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <SectionTitle>{t('whereItWent')}</SectionTitle>
        <Card className="space-y-3">
          {categoryRows.map(([id, amount]) => {
            const category = getCategory(id as CategoryId)
            const share = totals.total > 0 ? (amount / totals.total) * 100 : 0
            return (
              <div key={id}>
                <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
                  <span className="text-[var(--ink)] truncate">
                    <span aria-hidden="true">{category.emoji}</span>{' '}
                    {categoryLabel(id as CategoryId, t)}
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

      <SettleUpModal
        transfer={settling}
        cropId={cropId ?? ''}
        members={members}
        onClose={() => setSettling(null)}
      />

      <BalanceBreakdownModal
        member={explaining}
        parts={explaining ? (breakdowns.get(explaining.id) ?? null) : null}
        onClose={() => setExplaining(null)}
      />
    </div>
  )
}
