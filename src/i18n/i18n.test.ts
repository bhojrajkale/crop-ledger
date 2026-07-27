import { describe, expect, it } from 'vitest'
import { en } from './en'
import { mr } from './mr'
import { DEFAULT_LANGUAGE, intlLocale, translate } from './index'

describe('catalogues', () => {
  it('defaults to Marathi', () => {
    expect(DEFAULT_LANGUAGE).toBe('mr')
  })

  it('translates every English key', () => {
    const missing = Object.keys(en).filter((key) => !(key in mr))
    expect(missing).toEqual([])
  })

  it('has no Marathi keys that English does not define', () => {
    const extra = Object.keys(mr).filter((key) => !(key in en))
    expect(extra).toEqual([])
  })

  it('leaves no Marathi string untranslated', () => {
    // A copied-over English string is the failure mode a type check cannot
    // catch. Keys that are deliberately identical are listed explicitly.
    const sameByDesign = new Set(['paysConnector', 'takePhoto', 'choosePhoto'])
    const untranslated = Object.entries(mr)
      .filter(([key]) => !sameByDesign.has(key))
      .filter(([key, value]) => value === en[key as keyof typeof en])
      .map(([key]) => key)
    expect(untranslated).toEqual([])
  })

  it('keeps placeholders consistent between languages', () => {
    const names = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort()
    const mismatched = Object.keys(en).filter((key) => {
      const a = names(en[key as keyof typeof en])
      const b = names(mr[key as keyof typeof en])
      return JSON.stringify(a) !== JSON.stringify(b)
    })
    expect(mismatched).toEqual([])
  })

  it('pairs every _one variant with a plural key', () => {
    for (const catalogue of [en, mr] as Record<string, string>[]) {
      for (const key of Object.keys(catalogue)) {
        if (key.endsWith('_one')) {
          expect(catalogue[key.slice(0, -4)]).toBeDefined()
        }
      }
    }
  })
})

describe('translate', () => {
  it('returns the string for the active language', () => {
    expect(translate('en', 'totalSpent')).toBe('Total spent')
    expect(translate('mr', 'totalSpent')).toBe('एकूण खर्च')
  })

  it('fills placeholders', () => {
    expect(translate('en', 'perHead', { amount: '₹500' })).toBe('₹500 per head')
    expect(translate('mr', 'perHead', { amount: '₹500' })).toBe('दरडोई ₹500')
  })

  it('fills several placeholders', () => {
    expect(
      translate('en', 'paidButOwed', { payer: 'Anil', ower: 'Bhau' })
    ).toBe('Anil paid, but Bhau owes the full amount.')
  })

  it('leaves an unknown placeholder in place rather than printing undefined', () => {
    expect(translate('en', 'perHead', {})).toBe('{amount} per head')
  })

  it('uses the singular form for a count of one', () => {
    expect(translate('en', 'members', { count: 1 })).toBe('1 member')
    expect(translate('en', 'members', { count: 3 })).toBe('3 members')
  })

  it('applies Marathi plurals, which often reuse one form', () => {
    expect(translate('mr', 'crops', { count: 1 })).toBe('1 पीक')
    expect(translate('mr', 'crops', { count: 4 })).toBe('4 पिके')
    expect(translate('mr', 'members', { count: 1 })).toBe('1 सदस्य')
    expect(translate('mr', 'members', { count: 5 })).toBe('5 सदस्य')
  })
})

describe('intlLocale', () => {
  it('forces Latin digits for Marathi', () => {
    // Devanagari digits would not match the figures on the shop's bill.
    const formatted = new Intl.DateTimeFormat(intlLocale('mr'), {
      day: 'numeric',
      month: 'short',
    }).format(new Date('2026-07-26T00:00:00'))
    expect(formatted).toMatch(/26/)
    expect(formatted).not.toMatch(/[०-९]/)
  })

  it('uses Marathi month names', () => {
    const formatted = new Intl.DateTimeFormat(intlLocale('mr'), {
      month: 'long',
    }).format(new Date('2026-07-26T00:00:00'))
    expect(formatted).toBe('जुलै')
  })
})
