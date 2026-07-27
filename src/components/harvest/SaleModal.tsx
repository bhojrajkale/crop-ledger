import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { AmountField, Field } from '../ui/Field'
import { Chip } from '../ui/Chip'
import { useLedgerStore } from '../../store/useLedgerStore'
import { formatAmount, formatINR, parseRupees } from '../../domain/money'
import { saleTotal } from '../../domain/revenue'
import { newId } from '../../lib/id'
import { todayISO } from '../../lib/format'
import { useT } from '../../i18n'
import type { Crop, Sale } from '../../domain/types'

/** Translation keys for the units offered; the stored value is the label. */
const UNITS = ['unitQuintal', 'unitKg', 'unitTonne', 'unitBag'] as const

export function SaleModal({
  open,
  onOpenChange,
  crop,
  editSale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  crop: Crop
  editSale?: Sale
}) {
  const saveSale = useLedgerStore((s) => s.saveSale)
  const t = useT()
  const members = crop.members

  const [quantityText, setQuantityText] = useState('')
  const [unit, setUnit] = useState('')
  const [rateText, setRateText] = useState('')
  const [receivedBy, setReceivedBy] = useState('')
  const [buyer, setBuyer] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuantityText(editSale ? String(editSale.quantity) : '')
    setUnit(editSale?.unit ?? t('unitQuintal'))
    setRateText(editSale ? formatAmount(editSale.rate) : '')
    setReceivedBy(editSale?.receivedBy ?? members[0]?.id ?? '')
    setBuyer(editSale?.buyer ?? '')
    setDate(editSale?.date ?? todayISO())
    setError(undefined)
  }, [open, editSale, members, t])

  const quantity = Number(quantityText.trim().replace(/,/g, ''))
  const rate = parseRupees(rateText)
  const validQuantity =
    quantityText.trim() !== '' && Number.isFinite(quantity) && quantity > 0
  // Shown live, so what will be stored is visible before saving rather than
  // being a surprise on the list afterwards.
  const total = validQuantity && rate !== null ? saleTotal(quantity, rate) : 0

  const submit = async () => {
    if (!validQuantity) {
      setError(t('quantityMissing'))
      return
    }
    if (rate === null || rate <= 0) {
      setError(t('rateMissing'))
      return
    }
    if (!receivedBy) {
      setError(t('receivedByMissing'))
      return
    }

    setSaving(true)
    try {
      // Spread the stored sale so anything this form does not know about
      // survives an edit.
      const sale: Sale = {
        ...(editSale ?? {
          id: newId(),
          cropId: crop.id,
          createdAt: new Date().toISOString(),
        }),
        quantity,
        unit: unit.trim() || t('unitQuintal'),
        rate,
        total: saleTotal(quantity, rate),
        receivedBy,
        date,
        ...(buyer.trim() ? { buyer: buyer.trim() } : {}),
      }
      if (!buyer.trim()) delete sale.buyer

      await saveSale(sale)
      onOpenChange(false)
    } catch {
      setError(t('storageFull'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editSale ? t('editSale') : t('addSale')}
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
            {saving ? t('saving') : editSale ? t('saveChanges') : t('addSale')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t('quantity')}
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={quantityText}
            autoFocus={!editSale}
            onChange={(e) => setQuantityText(e.target.value)}
          />
          <Field
            label={t('unit')}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 -mt-2">
          {UNITS.map((key) => (
            <Chip key={key} selected={unit === t(key)} onClick={() => setUnit(t(key))}>
              {t(key)}
            </Chip>
          ))}
        </div>

        <AmountField
          label={t('ratePerUnit', { unit: unit.trim() || t('unitQuintal') })}
          placeholder="0"
          value={rateText}
          onChange={(e) => setRateText(e.target.value)}
        />

        <div className="flex items-baseline justify-between gap-3 rounded-xl bg-[var(--primary-tint)] px-3 py-2.5">
          <span className="text-sm font-medium text-[var(--primary)]">
            {t('saleTotal')}
          </span>
          <span className="text-xl font-bold tnum text-[var(--primary)]">
            {formatINR(total)}
          </span>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-[var(--muted)] mb-2">
            {t('receivedBy')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <Chip
                key={m.id}
                selected={receivedBy === m.id}
                onClick={() => setReceivedBy(m.id)}
              >
                {m.name}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Field
          label={t('buyer')}
          placeholder={t('buyerPlaceholder')}
          value={buyer}
          onChange={(e) => setBuyer(e.target.value)}
        />

        <Field
          label={t('date')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
    </Modal>
  )
}
