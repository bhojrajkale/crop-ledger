import { useT } from '../../i18n'

/**
 * Shown while a screen's rows are being read.
 *
 * It exists because the alternative is worse than a blank space: with no rows
 * yet, every tab falls through to its "nothing here yet" empty state, so a
 * slow read tells the user their expenses are gone. A spinner is the
 * difference between "wait" and "it's all missing".
 *
 * Sized and spaced to sit where the content will, so the page does not jump
 * when the rows arrive.
 */
export function Loading({ label }: { label?: string }) {
  const t = useT()
  return (
    <div
      role="status"
      // Announced once, not on every frame — the spinner itself is
      // aria-hidden, so this text is the whole message for a screen reader.
      aria-live="polite"
      // Half the viewport tall so the spinner sits near the middle of the
      // screen rather than tucked under the tabs, which is where the eye goes
      // while waiting.
      className="flex flex-col items-center justify-center gap-3 min-h-[50vh] px-6 text-center"
    >
      {/* Two adjacent sides carry the colour, so a quarter of the ring is a
          solid arc. A single coloured edge is too near-symmetric to read a
          direction from at a glance. `spinner` (index.css) owns the timing —
          see the note there about why it is not Tailwind's animate-spin. */}
      <span
        aria-hidden="true"
        className="spinner size-8 rounded-full border-[3px] border-[var(--hairline)] border-t-[var(--primary)] border-r-[var(--primary)]"
      />
      <p className="text-sm text-[var(--muted)]">{label ?? t('loading')}</p>
    </div>
  )
}
