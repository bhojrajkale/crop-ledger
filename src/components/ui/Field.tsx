import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { intlLocale, useLanguage } from '../../i18n'
import { formatLongDate } from '../../lib/format'

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

/**
 * A date input that also states the date in the app's own language.
 *
 * The text inside a native date control is drawn by the browser from the
 * device's locale, not the page's. `lang="mr"` does not reach it and neither
 * does anything else we can set — verified with the page in Marathi and the
 * browser locale forced to mr-IN, which still rendered 08/05/2026. So a
 * Marathi form on a phone set to English reads "6 Aug 2026", and the picker
 * it opens is system UI that will stay in the device's language whatever we
 * do.
 *
 * The line below the field is the app's own rendering, in the same form the
 * summary and the printed sheet use — Marathi month names with Latin digits,
 * so it matches the figures on the shop's bill.
 *
 * Only in Marathi: in English the control and the app already agree, and the
 * line would be pure duplication on every form that takes a date.
 */
export function DateField({ value, hint, ...rest }: Omit<FieldProps, 'type'>) {
  const language = useLanguage()
  const date = typeof value === 'string' ? value : ''
  const spelled =
    language === 'mr' && date
      ? // The long form, with the year: the native control shows one, and a
        // hint that dropped it would read as contradicting the field.
        formatLongDate(date, intlLocale(language))
      : undefined
  // A caller's own hint still shows when there is no date to spell out — the
  // harvest date says "optional" until one is picked.
  return <Field {...rest} type="date" value={value} hint={spelled ?? hint} />
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
