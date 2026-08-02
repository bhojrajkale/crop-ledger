import { describe, expect, it } from 'vitest'
import { statementFilename, statementToCsv } from './csv'
import { buildStatement } from './statement'
import { translate } from '../i18n'
import type { Crop, Expense, Sale, Settlement } from '../domain/types'

const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) =>
  translate('en', key, vars)

const crop: Crop = {
  id: 'c1',
  name: 'Cotton',
  season: 'Kharif 2026',
  startDate: '2026-06-01',
  members: [
    { id: 'm1', name: 'Bhojraj' },
    { id: 'm2', name: 'Anil' },
  ],
  createdAt: '2026-06-01T00:00:00.000Z',
}

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 'e1',
  cropId: 'c1',
  amount: 250000, // ₹2,500
  category: 'seeds',
  date: '2026-06-02',
  notes: '',
  payments: [{ id: 'p1', memberId: 'm1', amount: 250000, paidAt: '2026-06-02' }],
  owedBy: ['m1', 'm2'],
  createdAt: '2026-06-02T00:00:00.000Z',
  ...over,
})

const sale: Sale = {
  id: 's1',
  cropId: 'c1',
  receivedBy: 'm1',
  quantity: 10,
  unit: 'quintal',
  rate: 700000,
  total: 7000000,
  date: '2026-11-01',
  createdAt: '2026-11-01T00:00:00.000Z',
}

const build = (
  expenses: Expense[],
  sales: Sale[] = [],
  settlements: Settlement[] = []
) =>
  statementToCsv(
    buildStatement({
      crop,
      expenses,
      sales,
      settlements,
      t,
      locale: 'en-IN',
      now: new Date('2026-11-15T10:00:00'),
    })
  )

describe('statementToCsv', () => {
  it('starts with a byte-order mark', () => {
    // Without it Excel reads the file as the system's legacy encoding and
    // every Marathi name becomes mojibake.
    expect(build([expense()]).startsWith('﻿')).toBe(true)
  })

  it('writes amounts as bare decimals a spreadsheet can add up', () => {
    const csv = build([expense({ amount: 12345678 })])
    // ₹1,23,456.78 would be text to Excel; 123456.78 is a number.
    expect(csv).toContain('123456.78')
    expect(csv).not.toContain('₹1,23,456.78')
  })

  it('keeps paise exact rather than rounding to rupees', () => {
    expect(build([expense({ amount: 1 })])).toContain('0.01')
  })

  it('quotes cells containing a comma, and doubles embedded quotes', () => {
    const csv = build([
      expense({ notes: 'Sharma & Sons, Beed' }),
      expense({ id: 'e2', notes: 'the "good" seed' }),
    ])
    expect(csv).toContain('"Sharma & Sons, Beed"')
    expect(csv).toContain('"the ""good"" seed"')
  })

  it('quotes a cell containing a newline so the row is not split', () => {
    const csv = build([expense({ notes: 'line one\nline two' })])
    expect(csv).toContain('"line one\nline two"')
  })

  it('uses CRLF line endings', () => {
    expect(build([expense()])).toContain('\r\n')
  })

  it('lists expenses oldest first, as a season reads', () => {
    const csv = build([
      expense({ id: 'late', date: '2026-08-01', notes: 'later' }),
      expense({ id: 'early', date: '2026-06-01', notes: 'earlier' }),
    ])
    expect(csv.indexOf('earlier')).toBeLessThan(csv.indexOf('later'))
  })

  it('carries the settlement, not just the expenses', () => {
    // ₹2,500 paid by Bhojraj, split two ways: Anil owes him ₹1,250.
    const csv = build([expense()])
    expect(csv).toContain('Who owes whom')
    expect(csv).toContain('Anil,Bhojraj,1250.00')
  })

  it('keeps money owed outside the group in its own section', () => {
    // The distinction the whole app is built on: a shop debt is not a debt
    // between the people on the crop, and merging them would misstate both.
    const csv = build([
      expense({ payments: [], owedTo: 'Sharma Krishi Kendra' }),
    ])
    expect(csv).toContain('Still to pay')
    expect(csv).toContain('Sharma Krishi Kendra,2500.00')
  })

  it('omits the harvest section entirely when nothing has been sold', () => {
    expect(build([expense()])).not.toContain('Harvest')
    expect(build([expense()], [sale])).toContain('Harvest')
  })

  it('explains the balance when credit makes Paid minus Share not add up', () => {
    // With money still on credit, Balance counts only what has changed hands
    // while Share is the full responsibility — on a sheet handed to someone
    // else that gap reads as an arithmetic error unless it is spelled out.
    const withCredit = build([expense({ payments: [], owedTo: 'Sharma' })])
    expect(withCredit).toContain('not between the people on this crop')
    // Nothing on credit, nothing to explain.
    expect(build([expense()])).not.toContain('not between the people on this crop')
  })

  it('reports a member balance signed, so a creditor is distinguishable', () => {
    const csv = build([expense()])
    // Bhojraj paid 2500 and owes 1250, so the group owes him 1250.
    expect(csv).toContain('Bhojraj,2500.00,1250.00,1250.00')
    expect(csv).toContain('Anil,0.00,1250.00,-1250.00')
  })
})

describe('statementFilename', () => {
  it('slugs the crop and season', () => {
    expect(statementFilename('Cotton', 'Kharif 2026', 'csv', new Date('2026-11-15'))).toBe(
      'cotton-kharif-2026-2026-11-15.csv'
    )
  })

  it('falls back when the name has nothing a filesystem can keep', () => {
    // Marathi crop names are the norm here, and a non-ASCII download name is
    // mangled by some mobile browsers — better a plain name than a broken one.
    expect(statementFilename('कापूस', 'खरीप', 'csv', new Date('2026-11-15'))).toBe(
      'crop-ledger-2026-11-15.csv'
    )
  })

  it('falls back rather than naming the file after a stray number', () => {
    // "कापूस खरीप 2026" slugs down to just "2026", which identifies nothing.
    expect(
      statementFilename('कापूस', 'खरीप 2026', 'csv', new Date('2026-11-15'))
    ).toBe('crop-ledger-2026-11-15.csv')
  })
})

describe('statementToCsv with settlements', () => {
  const paidInFull: Expense = {
    id: 'e1',
    cropId: 'c1',
    amount: 300000,
    category: 'seeds',
    date: '2026-06-02',
    notes: '',
    payments: [{ id: 'p1', memberId: 'm1', amount: 300000, paidAt: '2026-06-02' }],
    owedBy: ['m1', 'm2'],
    createdAt: '2026-06-02T00:00:00.000Z',
  }

  it('drops a transfer that has already been settled', () => {
    // The printed sheet is the copy that gets handed over. Telling two people
    // to square up a debt they cleared last week is worse than useless.
    const before = build([paidInFull])
    expect(before).toContain('Who owes whom')
    expect(before).toContain('Anil,Bhojraj,1500.00')

    const after = build([paidInFull], [], [
      {
        id: 's1',
        cropId: 'c1',
        from: 'm2',
        to: 'm1',
        amount: 150000,
        date: '2026-11-10',
        createdAt: '2026-11-10T00:00:00.000Z',
      },
    ])
    expect(after).not.toContain('Who owes whom')
    expect(after).not.toContain('Anil,Bhojraj,1500.00')
  })
})
