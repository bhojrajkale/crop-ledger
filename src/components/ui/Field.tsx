import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

const CONTROL =
  'w-full min-h-11 px-3 rounded-xl bg-[var(--surface-sunken)] text-[var(--ink)] ' +
  'border border-[var(--hairline)] placeholder:text-[var(--faint)] ' +
  'outline-none focus:border-[var(--primary-border)]'

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-[var(--muted)] mb-1.5"
    >
      {children}
    </label>
  )
}

function Error({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-sm text-[var(--negative)] mt-1.5">
      {children}
    </p>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  // Explicitly `| undefined` because exactOptionalPropertyTypes is on, and
  // callers naturally pass a `string | undefined` error state straight in.
  error?: string | undefined
  hint?: string | undefined
}

export function Field({ label, error, hint, className = '', ...rest }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={CONTROL}
        {...rest}
      />
      {error ? <Error id={errorId}>{error}</Error> : null}
      {!error && hint ? (
        <p className="text-xs text-[var(--faint)] mt-1.5">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function TextAreaField({
  label,
  className = '',
  ...rest
}: TextAreaFieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} className={`${CONTROL} py-2.5 min-h-20`} {...rest} />
    </div>
  )
}

interface AmountFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> {
  label: string
  error?: string | undefined
}

/**
 * Money input. Uses a text input with a numeric keypad rather than
 * type="number" — number inputs swallow decimal separators on some Android
 * keyboards and scroll-wheel over a focused field silently changes amounts.
 */
export function AmountField({
  label,
  error,
  className = '',
  ...rest
}: AmountFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-lg"
        >
          ₹
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${CONTROL} pl-8 text-lg font-semibold tnum`}
          {...rest}
        />
      </div>
      {error ? <Error id={errorId}>{error}</Error> : null}
    </div>
  )
}
