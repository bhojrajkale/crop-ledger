import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-ink)] border border-transparent',
  secondary:
    'bg-[var(--surface)] text-[var(--ink)] border border-[var(--divider)]',
  ghost: 'bg-transparent text-[var(--muted)] border border-transparent',
  danger:
    'bg-[var(--negative-tint)] text-[var(--negative)] border border-transparent',
}

const SIZES: Record<Size, string> = {
  // Minimum 44px tall — this gets tapped with field hands, often one-handed.
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-[15px]',
  lg: 'min-h-13 px-5 text-base',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-transform active:scale-[0.97]',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
