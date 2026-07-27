export function todayISO(): string {
  // Local calendar date, not UTC — toISOString() would roll an evening entry
  // in IST onto the previous day.
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/**
 * Dates take a locale because month names are translated; amounts do not,
 * because money always uses en-IN for its lakh grouping (₹1,20,000, which
 * mr-IN does not produce).
 */
export function formatDate(iso: string, locale = 'en-IN'): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export function formatLongDate(iso: string, locale = 'en-IN'): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
  return letters.toUpperCase().slice(0, 2) || '?'
}

// Pluralisation now lives in the translation catalogue (a `key` and a
// `key_one`), because English suffix rules do not apply to Marathi. Use
// t('members', { count }) instead of a helper here.

/**
 * Human-readable file size. Used to show what a receipt costs in storage —
 * on a device-local app the quota is finite and shared with the ledger, so
 * this is worth surfacing rather than hiding.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
