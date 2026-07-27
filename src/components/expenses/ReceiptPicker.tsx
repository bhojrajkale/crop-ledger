import { useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { compressImage, isImageFile } from '../../lib/image'
import { newId } from '../../lib/id'
import { formatBytes } from '../../lib/format'
import { useT } from '../../i18n'
import type { Receipt } from '../../domain/types'

/** Keeps one bad photo from blocking the rest of a multi-file selection. */
async function toReceipt(file: File, expenseId: string): Promise<Receipt> {
  const { blob, width, height } = await compressImage(file)
  return {
    id: newId(),
    expenseId,
    image: blob,
    width,
    height,
    addedAt: new Date().toISOString(),
  }
}

export function ReceiptPicker({
  expenseId,
  receipts,
  onAdd,
  onRemove,
  onView,
}: {
  expenseId: string
  receipts: Receipt[]
  onAdd: (receipts: Receipt[]) => void
  onRemove: (receiptId: string) => void
  onView: (index: number) => void
}) {
  // Two separate inputs rather than one. `capture` cannot be toggled
  // reliably on a live element, and relying on the OS picker to offer both
  // hid the choice: the user could not tell the camera was an option at all.
  const t = useT()
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const handleFiles = async (files: FileList, source: HTMLInputElement | null) => {
    setBusy(true)
    setError(undefined)
    const images = [...files].filter(isImageFile)
    const skipped = files.length - images.length

    const added: Receipt[] = []
    let failed = 0
    for (const file of images) {
      try {
        added.push(await toReceipt(file, expenseId))
      } catch {
        failed++
      }
    }

    if (added.length > 0) onAdd(added)
    if (failed > 0 || skipped > 0) {
      const parts = []
      if (skipped > 0) parts.push(t('notImages', { count: skipped }))
      if (failed > 0) parts.push(t('couldNotRead', { count: failed }))
      setError(`${parts.join(', ')}.`)
    }
    setBusy(false)
    // Reset so picking the same file again still fires change.
    if (source) source.value = ''
  }

  const totalBytes = receipts.reduce((sum, r) => sum + r.image.size, 0)

  return (
    <fieldset>
      <legend className="text-sm font-medium text-[var(--muted)] mb-2">
        {t('receipts')}
      </legend>

      {receipts.length > 0 ? (
        <ul className="flex flex-wrap gap-2 mb-3">
          {receipts.map((receipt, index) => (
            <li key={receipt.id}>
              <Thumbnail
                receipt={receipt}
                onView={() => onView(index)}
                onRemove={() => onRemove(receipt.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {/* Opens the camera directly. `capture` is only a hint — desktop
          browsers ignore it and fall back to a file dialog, which is the
          sensible behaviour there anyway. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files, e.target)
        }}
      />
      {/* No `capture`, so this opens the photo library. Multiple allowed —
          a bill photographed page by page can be added in one go. */}
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files, e.target)
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => cameraInput.current?.click()}>
          {busy ? t('adding') : t('takePhoto')}
        </Button>
        <Button size="sm" disabled={busy} onClick={() => galleryInput.current?.click()}>
          {t('choosePhoto')}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[var(--negative)] mt-2">
          {error}
        </p>
      ) : (
        <p className="text-xs text-[var(--faint)] mt-2">
          {receipts.length > 0
            ? t('photosStored', {
                photos: t('photos', { count: receipts.length }),
                size: formatBytes(totalBytes),
              })
            : t('photosHint')}
        </p>
      )}
    </fieldset>
  )
}

function Thumbnail({
  receipt,
  onView,
  onRemove,
}: {
  receipt: Receipt
  onView: () => void
  onRemove: () => void
}) {
  const t = useT()
  const url = useObjectUrl(receipt.image)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onView}
        aria-label={t('viewReceiptLabel')}
        className="block size-20 rounded-xl overflow-hidden border border-[var(--hairline)] bg-[var(--surface-sunken)] active:scale-95 transition-transform"
      >
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : null}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('removeReceipt')}
        className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-[var(--negative)] text-white text-sm leading-none active:scale-95 transition-transform"
      >
        ×
      </button>
    </div>
  )
}
