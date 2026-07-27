import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDate,
  formatLongDate,
  initials,
  todayISO,
} from './format'

describe('todayISO', () => {
  it('returns a yyyy-mm-dd string', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('uses the local calendar date, not UTC', () => {
    // An evening entry in IST must not be filed under the previous day.
    const now = new Date()
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    expect(todayISO()).toBe(expected)
  })
})

describe('formatDate', () => {
  it('formats a date without shifting it across a timezone boundary', () => {
    expect(formatDate('2026-06-01')).toBe('1 Jun')
  })

  it('returns the input unchanged when it is not a date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatLongDate', () => {
  it('includes the year', () => {
    expect(formatLongDate('2026-06-01')).toBe('1 Jun 2026')
  })
})

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Anil Kale')).toBe('AK')
    expect(initials('Bhau')).toBe('B')
    expect(initials('  ram  shankar  patil ')).toBe('RS')
  })

  it('falls back rather than rendering an empty avatar', () => {
    expect(initials('')).toBe('?')
    expect(initials('   ')).toBe('?')
  })
})

describe('formatDate in Marathi', () => {
  it('uses Marathi month names with Latin digits', () => {
    expect(formatDate('2026-07-26', 'mr-IN-u-nu-latn')).toBe('26 जुलै')
  })

  it('does the same for the long form', () => {
    expect(formatLongDate('2026-06-01', 'mr-IN-u-nu-latn')).toBe('1 जून, 2026')
  })
})

describe('formatBytes', () => {
  it('shows bytes below a kilobyte', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(900)).toBe('900 B')
  })

  it('rounds to whole kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(250 * 1024)).toBe('250 KB')
  })

  it('switches to megabytes with one decimal', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(4.25 * 1024 * 1024)).toBe('4.3 MB')
  })
})
