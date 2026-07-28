import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Card, EmptyState } from '../components/ui/Card'
import { Loading } from '../components/ui/Loading'
import { Modal } from '../components/ui/Modal'
import { SaleModal } from '../components/harvest/SaleModal'
import { computeRevenue } from '../domain/revenue'
import { computeTotals } from '../domain/settlement'
import { formatINR } from '../domain/money'
import { formatDate } from '../lib/format'
import { intlLocale, useLanguage, useT } from '../i18n'
import type { Sale } from '../domain/types'

export function HarvestPage() {
  const { cropId } = useParams<{ cropId: string }>()
  const crops = useLedgerStore((s) => s.crops)
  const expenses = useLedgerStore((s) => s.expenses)
  const sales = useLedgerStore((s) => s.sales)
  const cropLoading = useLedgerStore((s) => s.cropLoading)
  const deleteSale = useLedgerStore((s) => s.deleteSale)
  const t = useT()
  const locale = intlLocale(useLanguage())

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Sale | null>(null)
  const [removing, setRemoving] = useState<Sale | null>(null)

  const crop = crops.find((c) => c.id === cropId)
  const members = useMemo(() => crop?.members ?? [], [crop])

  const totals = useMemo(
    () => computeTotals(members, expenses),
    [members, expenses]
  )
  const revenue = useMemo(
    () => computeRevenue(members, sales, totals.total),
    [members, sales, totals.total]
  )

  if (!crop) return null

  // Ahead of the empty states below — the revenue figures are read from the
  // same rows, so showing them mid-read would show a total of zero.
  if (cropLoading) return <Loading />

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? t('removedMember')

  if (members.length === 0) {
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
      <Card className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--faint)]">
            {t('totalRevenue')}
          </p>
          <p className="text-2xl font-bold text-[var(--ink)] tnum mt-0.5">
            {formatINR(revenue.total)}
          </p>
          {revenue.total > 0 ? (
            <p className="text-sm text-[var(--muted)] mt-0.5 tnum">
              {t('revenuePerHead', { amount: formatINR(revenue.perHead) })}
            </p>
          ) : null}
          {revenue.quantity ? (
            <p className="text-sm text-[var(--muted)] mt-0.5">
              {t('soldQuantity', {
                amount: revenue.quantity.amount,
                unit: revenue.quantity.unit,
                rate: formatINR(revenue.quantity.averageRate),
              })}
            </p>
          ) : null}
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          {t('addShort')}
        </Button>
      </Card>

      {sales.length === 0 ? (
        <EmptyState
          emoji="🌾"
          title={t('noSalesTitle')}
          description={t('noSalesBody')}
          action={
            <Button variant="primary" onClick={() => setAdding(true)}>
              {t('addFirstSale')}
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Card>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-[var(--ink)] truncate">
                    {sale.quantity} {sale.unit}
                  </p>
                  <p className="font-semibold text-[var(--ink)] tnum shrink-0">
                    {formatINR(sale.total)}
                  </p>
                </div>
                <p className="text-sm text-[var(--muted)] mt-0.5">
                  {t('ratePerUnit', { unit: sale.unit })}{' '}
                  {formatINR(sale.rate)}
                </p>
                <p className="text-sm text-[var(--muted)] mt-0.5">
                  {memberName(sale.receivedBy)} ·{' '}
                  {t('holdingAmount', { amount: formatINR(sale.total) })}
                  {sale.buyer ? ` · ${sale.buyer}` : ''}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-[var(--faint)]">
                    {formatDate(sale.date, locale)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(sale)}
                    className="text-xs text-[var(--primary)] font-medium active:scale-95 transition-transform"
                  >
                    {t('edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(sale)}
                    className="text-xs text-[var(--negative)] font-medium active:scale-95 transition-transform"
                  >
                    {t('delete')}
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <SaleModal open={adding} onOpenChange={setAdding} crop={crop} />
      <SaleModal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        crop={crop}
        {...(editing ? { editSale: editing } : {})}
      />

      <Modal
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={t('deleteSaleTitle')}
        footer={
          <div className="flex gap-2">
            <Button fullWidth onClick={() => setRemoving(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={async () => {
                if (removing) await deleteSale(removing.id)
                setRemoving(null)
              }}
            >
              {t('delete')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--muted)]">
          {t('deleteSaleBody', {
            amount: removing ? formatINR(removing.total) : '',
          })}
        </p>
      </Modal>
    </div>
  )
}
