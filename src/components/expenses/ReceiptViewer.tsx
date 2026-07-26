import { useEffect, useState } from 'react'
import { useObjectUrl } from '../../lib/useObjectUrl'
import type { Receipt } from '../../domain/types'

/**
 * Full-screen photo viewer. Deliberately not a Radix Dialog: this is an
 * edge-to-edge image surface rather than a card of content, and it is often
 * opened from inside the expense modal, where nesting two focus traps causes
 * the outer one to steal focus back on close.
 */
export function ReceiptViewer({
  receipts,
  startIndex = 0,
  onClose,
}: {
  receipts: Receipt[]
  startIndex?: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const current = receipts[Math.min(index, receipts.length - 1)]
  const url = useObjectUrl(current?.image)

  useEffect(() => {
    setIndex(startIndex)
  }, [startIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, receipts.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    document.addEventListener('keydown', onKey)
    // Stop the page behind from scrolling while the viewer is open.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose, receipts.length])

  if (!current) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Receipt"
      className="fixed inset-0 z-[400] bg-black/95 flex flex-col"
    >
      <div className="flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <span className="text-sm tabular-nums">
          {receipts.length > 1 ? `${index + 1} of ${receipts.length}` : 'Receipt'}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close receipt"
          className="size-10 rounded-full bg-white/15 text-xl leading-none active:scale-95 transition-transform"
        >
          ×
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center p-3">
        {url ? (
          <img
            src={url}
            alt="Receipt"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <p className="text-white/70 text-sm">Loading…</p>
        )}
      </div>

      {receipts.length > 1 ? (
        <div className="flex items-center justify-between gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="min-h-11 px-5 rounded-full bg-white/15 text-white disabled:opacity-30 active:scale-95 transition-transform"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(i + 1, receipts.length - 1))}
            disabled={index === receipts.length - 1}
            className="min-h-11 px-5 rounded-full bg-white/15 text-white disabled:opacity-30 active:scale-95 transition-transform"
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  )
}
