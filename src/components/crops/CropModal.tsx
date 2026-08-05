import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { DateField, Field } from '../ui/Field'
import { useLedgerStore } from '../../store/useLedgerStore'
import { newId } from '../../lib/id'
import { todayISO } from '../../lib/format'
import { useT } from '../../i18n'
import type { Crop } from '../../domain/types'

/**
 * Suggests "Kharif 2026" / "खरीप 2026" so the season field is rarely typed.
 * The season name is translated; the year stays in Latin digits to match the
 * rest of the app.
 */
function defaultSeason(
  t: (key: 'seasonKharif' | 'seasonRabi') => string,
  date = new Date()
): string {
  const month = date.getMonth() // 0-indexed
  const season = month >= 5 && month <= 9 ? t('seasonKharif') : t('seasonRabi')
  return `${season} ${date.getFullYear()}`
}

export function CropModal({
  open,
  onOpenChange,
  editCrop,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editCrop?: Crop
  onSaved?: (crop: Crop) => void
}) {
  const saveCrop = useLedgerStore((s) => s.saveCrop)
  const t = useT()
  const [name, setName] = useState('')
  const [season, setSeason] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  // Reset on open so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (!open) return
    setName(editCrop?.name ?? '')
    setSeason(editCrop?.season ?? defaultSeason(t))
    setStartDate(editCrop?.startDate ?? todayISO())
    setEndDate(editCrop?.endDate ?? '')
    setError(undefined)
  }, [open, editCrop, t])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('cropNameMissing'))
      return
    }
    if (endDate && endDate < startDate) {
      setError(t('endBeforeStart'))
      return
    }

    setSaving(true)
    try {
      // Spread the existing crop so members, archived and anything added
      // later survive an edit — rebuilding it from form fields would quietly
      // delete whatever this form doesn't know about.
      const crop: Crop = {
        ...(editCrop ?? {
          id: newId(),
          members: [],
          createdAt: new Date().toISOString(),
        }),
        name: trimmed,
        season: season.trim(),
        startDate,
        ...(endDate ? { endDate } : {}),
      }
      if (!endDate) delete crop.endDate

      await saveCrop(crop)
      onOpenChange(false)
      onSaved?.(crop)
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
      title={editCrop ? t('editCrop') : t('cropTitle')}
      footer={
        <Button variant="primary" size="lg" fullWidth disabled={saving} onClick={submit}>
          {saving ? t('saving') : editCrop ? t('saveChanges') : t('createCrop')}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field
          label={t('cropName')}
          placeholder={t('cropNamePlaceholder')}
          value={name}
          autoFocus={!editCrop}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
        <Field
          label={t('season')}
          placeholder={defaultSeason(t)}
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          hint={t('seasonHint')}
        />
        <div className="grid grid-cols-2 gap-3">
          <DateField
            label={t('sowingDate')}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <DateField
            label={t('harvestDate')}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            hint={t('optional')}
          />
        </div>
      </div>
    </Modal>
  )
}
