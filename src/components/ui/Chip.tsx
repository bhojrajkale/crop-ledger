import type { ReactNode } from 'react'

/**
 * A selectable pill. Rendered as a real button with aria-pressed so the
 * selected state is announced, not just coloured — colour alone would leave
 * the choice invisible to a screen reader.
 */
export function Chip({
  selected,
  onClick,
  children,
  color,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  /** CSS custom property name, e.g. "--cat-seeds". */
  color?: string
  disabled?: boolean
}) {
  const accent = color ? `var(${color})` : 'var(--primary)'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      style={
        selected
          ? { borderColor: accent, color: accent }
          : undefined
      }
      className={[
        'inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full text-sm',
        'border transition-transform active:scale-95',
        'disabled:opacity-50 disabled:pointer-events-none',
        selected
          ? 'bg-[var(--surface)] font-semibold border-2'
          : 'bg-[var(--surface-sunken)] text-[var(--muted)] border-[var(--hairline)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center size-9 rounded-full bg-[var(--primary-tint)] text-[var(--primary)] text-sm font-semibold"
    >
      {initials}
    </span>
  )
}
