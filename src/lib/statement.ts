import type { Crop, Expense, Paise, Sale, Settlement } from '../domain/types'
import { computeBalances, computeTotals, minimizeTransfers } from '../domain/settlement'
import { amountOutstanding, amountPaid, computeOutstanding } from '../domain/payments'
import { computeRevenue } from '../domain/revenue'
import { resolveSplit } from '../domain/split'
import { categoryLabel } from '../domain/categories'
import { formatINR } from '../domain/money'
import { formatLongDate } from './format'
import type { TranslationKey } from '../i18n/en'
import type { Vars } from '../i18n'

/**
 * A season's accounts, assembled once and rendered two ways.
 *
 * Both the spreadsheet and the printed sheet come from this, so the two can
 * never disagree about what the season cost — which they would within a
 * month if each built its own tables.
 */

/**
 * A cell is text, an amount, or a date. Amounts and dates stay unformatted
 * all the way to the renderer, because the two outputs need different things
 * from them: the printed sheet wants ₹1,20,000 and "29 जुलै", while the
 * spreadsheet wants 120000.00 and 2026-07-29, both of which Excel understands
 * as a number and a date. Formatting here would force one renderer to parse
 * the other's output back.
 */
export type Cell = string | { amount: Paise } | { date: string }

export interface StatementTable {
  title: string
  columns: string[]
  rows: Cell[][]
  /** A line printed under the table, where one is needed to read it right. */
  note?: string
}

export interface Statement {
  title: string
  subtitle: string
  /** The few figures worth reading before any table. */
  headline: { label: string; value: Cell }[]
  tables: StatementTable[]
}

type Translate = (key: TranslationKey, vars?: Vars) => string

export interface StatementInput {
  crop: Crop
  expenses: Expense[]
  sales: Sale[]
  /**
   * Required, not optional with a default. A printed sheet that quietly
   * omitted settlements would tell two people to pay each other for a debt
   * they cleared last week — and it is the copy that gets handed over, so it
   * is the one that has to agree with the screen.
   */
  settlements: Settlement[]
  t: Translate
  locale: string
  /** Injectable so the generated-on line is assertable in a test. */
  now?: Date
}

const money = (amount: Paise): Cell => ({ amount })
const day = (date: string): Cell => ({ date })

export function buildStatement({
  crop,
  expenses,
  sales,
  settlements,
  t,
  locale,
  now = new Date(),
}: StatementInput): Statement {
  const members = crop.members
  const totals = computeTotals(members, expenses)
  const revenue = computeRevenue(members, sales, totals.total)
  const balances = computeBalances(members, expenses, sales, settlements)
  const transfers = minimizeTransfers(balances)
  const outstanding = computeOutstanding(expenses)

  const nameOf = (id: string) =>
    members.find((m) => m.id === id)?.name ?? t('removedMember')

  const headline: Statement['headline'] = [
    { label: t('totalSpent'), value: money(totals.total) },
    { label: t('perHeadLabel'), value: money(totals.perHead) },
  ]
  if (totals.outstanding > 0) {
    headline.push({ label: t('outstanding'), value: money(totals.outstanding) })
  }
  if (sales.length > 0) {
    headline.push({ label: t('totalRevenue'), value: money(revenue.total) })
    headline.push({
      // Losses are shown as a positive number under a "loss" label rather
      // than as a minus, which is easy to miss on a printed page.
      label: revenue.net >= 0 ? t('netProfit') : t('netLoss'),
      value: money(Math.abs(revenue.net)),
    })
  }

  const tables: StatementTable[] = []

  if (expenses.length > 0) {
    tables.push({
      title: t('tabExpenses'),
      columns: [
        t('date'),
        t('category'),
        t('notes'),
        t('amount'),
        t('columnPaid'),
        t('outstanding'),
        t('paidBy'),
        t('whoOwes'),
        t('owedTo'),
      ],
      // Oldest first: a statement is read as the season's story, which is the
      // opposite of the app's newest-first list.
      rows: [...expenses]
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.createdAt.localeCompare(b.createdAt)
        )
        .map((expense) => [
          day(expense.date),
          categoryLabel(expense.category, t, expense.customCategory),
          expense.notes,
          money(expense.amount),
          money(amountPaid(expense)),
          money(amountOutstanding(expense)),
          expense.payments.map((p) => nameOf(p.memberId)).join(', '),
          // The resolved split, so a custom split reads as who owes what
          // rather than just who is involved.
          resolveSplit(expense)
            .map((s) => `${nameOf(s.memberId)} ${formatINR(s.amount)}`)
            .join(', '),
          expense.owedTo ?? '',
        ]),
    })
  }

  if (sales.length > 0) {
    tables.push({
      title: t('tabHarvest'),
      columns: [
        t('date'),
        t('quantity'),
        t('unit'),
        t('saleTotal'),
        t('receivedBy'),
        t('buyer'),
      ],
      rows: [...sales]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((sale) => [
          day(sale.date),
          String(sale.quantity),
          sale.unit,
          money(sale.total),
          nameOf(sale.receivedBy),
          sale.buyer ?? '',
        ]),
    })
  }

  if (members.length > 0) {
    tables.push({
      title: t('tabPeople'),
      /**
       * Paid minus Share does not equal Balance while anything is on credit,
       * and on a sheet handed to someone else that looks like an arithmetic
       * error rather than the deliberate rule it is: Share is what a person
       * is ultimately responsible for, Balance only counts money that has
       * actually changed hands. Unexplained, this is the line that starts an
       * argument, so it is explained.
       */
      ...(totals.outstanding > 0 ? { note: t('outstandingExplainer') } : {}),
      columns: [
        t('name'),
        t('columnPaid'),
        t('columnShare'),
        ...(sales.length > 0 ? [t('columnReceived')] : []),
        t('columnBalance'),
      ],
      rows: members.map((member) => [
        member.name,
        money(totals.paidByMember.get(member.id) ?? 0),
        money(totals.owedByMember.get(member.id) ?? 0),
        ...(sales.length > 0
          ? [money(revenue.receivedByMember.get(member.id) ?? 0)]
          : []),
        // Positive means the group owes them. Kept signed: this column is the
        // one people check against their own memory of the season.
        money(balances.get(member.id) ?? 0),
      ]),
    })
  }

  if (transfers.length > 0) {
    tables.push({
      title: t('whoOwesWhom'),
      columns: [t('columnFrom'), t('columnTo'), t('amount')],
      rows: transfers.map((transfer) => [
        nameOf(transfer.from),
        nameOf(transfer.to),
        money(transfer.amount),
      ]),
    })
  }

  if (outstanding.byCreditor.length > 0) {
    tables.push({
      // Money owed outside the group is kept in its own table, exactly as the
      // app keeps it out of the settlement — merging the two is the mistake
      // this whole model exists to prevent.
      title: t('stillToPayPlain'),
      columns: [t('owedTo'), t('amount')],
      rows: outstanding.byCreditor.map((group) => [
        group.creditor ?? t('notRecorded'),
        money(group.total),
      ]),
    })
  }

  return {
    title: `${crop.name} · ${crop.season}`,
    subtitle: t('generatedOn', {
      date: formatLongDate(isoDate(now), locale),
    }),
    headline,
    tables,
  }
}

function isoDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

/** Rupees as a bare decimal — what a spreadsheet can add up. */
export function formatPlain(paise: Paise): string {
  return (Math.round(paise) / 100).toFixed(2)
}
