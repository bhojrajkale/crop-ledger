import { describe, expect, it } from 'vitest'
import { formatAmount, formatINR, parseRupees, sum, toPaise } from './money'

describe('parseRupees', () => {
  it('parses whole and decimal rupees into paise', () => {
    expect(parseRupees('100')).toBe(10_000)
    expect(parseRupees('19.99')).toBe(1_999)
    expect(parseRupees('0.05')).toBe(5)
    expect(parseRupees('0')).toBe(0)
  })

  it('tolerates surrounding whitespace and thousands separators', () => {
    expect(parseRupees('  2,200  ')).toBe(220_000)
  })

  it('avoids losing a paisa to float representation error', () => {
    // 19.99 * 100 is 1998.9999... in binary floating point; truncating here
    // would quietly drop a paisa on a very common kind of amount.
    expect(parseRupees('19.99')).toBe(1_999)
    expect(parseRupees('1234.35')).toBe(123_435)
  })

  it('returns null for unusable input rather than defaulting to zero', () => {
    expect(parseRupees('')).toBeNull()
    expect(parseRupees('   ')).toBeNull()
    expect(parseRupees('abc')).toBeNull()
    expect(parseRupees('-50')).toBeNull()
    expect(parseRupees('1.2.3')).toBeNull()
  })
})

describe('formatINR', () => {
  it('shows whole rupees without decimals', () => {
    expect(formatINR(toPaise(120000))).toBe('₹1,20,000')
  })

  it('shows both decimals when paise are present', () => {
    expect(formatINR(1_999)).toBe('₹19.99')
  })

  it('formats zero and negatives', () => {
    expect(formatINR(0)).toBe('₹0')
    expect(formatINR(-50_000)).toBe('-₹500')
  })
})

describe('formatAmount', () => {
  it('omits the currency symbol', () => {
    expect(formatAmount(toPaise(1500))).toBe('1,500')
    expect(formatAmount(1_999)).toBe('19.99')
  })
})

describe('sum', () => {
  it('adds paise exactly', () => {
    expect(sum([1, 2, 3])).toBe(6)
    expect(sum([])).toBe(0)
  })
})
