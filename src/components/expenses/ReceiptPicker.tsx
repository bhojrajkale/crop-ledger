import { useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { compressImage, isImageFile } from '../../lib/image'
import { newId } from '../../lib/id'
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
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const handleFiles = async (files: FileList) => {
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
      if (skipped > 0) parts.push(`${skipped} file(s) were not images`)
      if (failed > 0) parts.push(`${failed} could not be read`)
      setError(`${parts.join(', ')}.`)
    }
    setBusy(false)
    // Reset so picking the same file again still fires change.
    if (input.current) input.current.value = ''
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-[var(--muted)] mb-2">
        Receipts
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

      <input
        ref={input}
        type="file"
        // No `capture` attribute: that would force the camera and remove the
        // option of picking a bill photographed earlier.
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files)
        }}
      />
      <Button
        size="sm"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? 'Adding…' : receipts.length > 0 ? '+ Add another' : '📷 Add photo'}
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-[var(--negative)] mt-2">
          {error}
        </p>
      ) : (
        <p className="text-xs text-[var(--faint)] mt-2">
          Photos are shrunk before saving and stay on this device.
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
  const url = useObjectUrl(receipt.image)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onView}
        aria-label="View receipt"
        className="block size-20 rounded-xl overflow-hidden border border-[var(--hairline)] bg-[var(--surface-sunken)] active:scale-95 transition-transform"
      >
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : null}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove receipt"
        className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-[var(--negative)] text-white text-sm leading-none active:scale-95 transition-transform"
      >
        ×
      </button>
    </div>
  )
}
