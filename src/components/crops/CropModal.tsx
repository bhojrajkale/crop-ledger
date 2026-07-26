import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { useLedgerStore } from '../../store/useLedgerStore'
import { newId } from '../../lib/id'
import { todayISO } from '../../lib/format'
import type { Crop } from '../../domain/types'

/** Suggests "Kharif 2026" / "Rabi 2026" so the season field is rarely typed. */
function defaultSeason(date = new Date()): string {
  const month = date.getMonth() // 0-indexed
  const season = month >= 5 && month <= 9 ? 'Kharif' : 'Rabi'
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
    setSeason(editCrop?.season ?? defaultSeason())
    setStartDate(editCrop?.startDate ?? todayISO())
    setEndDate(editCrop?.endDate ?? '')
    setError(undefined)
  }, [open, editCrop])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give the crop a name.')
      return
    }
    if (endDate && endDate < startDate) {
      setError('The end date is before the start date.')
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
      setError('Could not save. Your browser may be out of storage space.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editCrop ? 'Edit crop' : 'New crop'}
      footer={
        <Button variant="primary" size="lg" fullWidth disabled={saving} onClick={submit}>
          {saving ? 'Saving…' : editCrop ? 'Save changes' : 'Create crop'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field
          label="Crop"
          placeholder="Cotton, Soybean, Sugarcane…"
          value={name}
          autoFocus={!editCrop}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
        <Field
          label="Season"
          placeholder="Kharif 2026"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          hint="Lets you grow the same crop again next year without mixing them up."
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Sowing date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Field
            label="Harvest date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            hint="Optional"
          />
        </div>
      </div>
    </Modal>
  )
}
