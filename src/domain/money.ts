import type { Paise } from './types'

export const PAISE_PER_RUPEE = 100

/**
 * Parses user input (rupees, possibly with decimals) into integer paise.
 * Returns null for anything that isn't a usable positive-or-zero amount, so
 * callers can distinguish "empty/invalid" from "zero" rather than silently
 * treating a typo as ₹0.
 */
export function parseRupees(input: string): Paise | null {
  const trimmed = input.trim().replace(/,/g, '')
  if (trimmed === '') return null
  if (!/^\d*\.?\d*$/.test(trimmed)) return null

  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null

  // Round rather than truncate: 0.1 + 0.2 style representation error means
  // `19.99 * 100` is 1998.9999... and truncating would quietly lose a paisa.
  return Math.round(value * PAISE_PER_RUPEE)
}

export function toPaise(rupees: number): Paise {
  return Math.round(rupees * PAISE_PER_RUPEE)
}

export function toRupees(paise: Paise): number {
  return paise / PAISE_PER_RUPEE
}

const wholeRupeeFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const preciseFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formats paise as INR. Whole rupees stay clean (₹1,20,000); anything with a
 * paise remainder shows both decimals rather than rounding away money the
 * ledger is still tracking.
 */
export function formatINR(paise: Paise): string {
  const rounded = Math.round(paise)
  const format =
    rounded % PAISE_PER_RUPEE === 0 ? wholeRupeeFormat : preciseFormat
  return format.format(toRupees(rounded))
}

/** Rupees only, no currency symbol — for compact table cells and inputs. */
export function formatAmount(paise: Paise): string {
  const rounded = Math.round(paise)
  const value = toRupees(rounded)
  return rounded % PAISE_PER_RUPEE === 0
    ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
}

export function sum(values: Paise[]): Paise {
  return values.reduce((total, value) => total + value, 0)
}
