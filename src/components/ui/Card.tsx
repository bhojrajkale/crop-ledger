import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export function Card({
  children,
  padded = true,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl bg-[var(--surface)] border border-[var(--hairline)]',
        padded ? 'p-4' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--faint)] mb-2 px-1">
      {children}
    </h2>
  )
}

export function EmptyState({
  emoji,
  title,
  description,
  action,
}: {
  emoji: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-4xl mb-3" aria-hidden="true">
        {emoji}
      </div>
      <p className="font-semibold text-[var(--ink)]">{title}</p>
      <p className="text-sm text-[var(--muted)] mt-1 mb-5 max-w-xs mx-auto">
        {description}
      </p>
      {action}
    </div>
  )
}
