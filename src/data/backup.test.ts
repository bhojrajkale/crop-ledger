import { describe, expect, it } from 'vitest'
import { backupFilename, buildBackup, parseBackup } from './backup'
import type { Crop, Expense } from '../domain/types'

const crop: Crop = {
  id: 'c1',
  name: 'Cotton',
  season: 'Kharif 2026',
  startDate: '2026-06-01',
  members: [{ id: 'a', name: 'Anil' }],
  createdAt: '2026-06-01T00:00:00.000Z',
}

const expense: Expense = {
  id: 'e1',
  cropId: 'c1',
  amount: 50_000,
  category: 'seeds',
  date: '2026-06-02',
  notes: '',
  paidBy: 'a',
  owedBy: ['a'],
  createdAt: '2026-06-02T00:00:00.000Z',
}

const validFile = () =>
  JSON.stringify(buildBackup({ crops: [crop], expenses: [expense], sales: [] }))

describe('buildBackup', () => {
  it('stamps the app name and version so imports can be checked', () => {
    const backup = buildBackup({ crops: [], expenses: [], sales: [] })
    expect(backup.app).toBe('crop-ledger')
    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('backupFilename', () => {
  it('dates the file so successive backups do not overwrite each other', () => {
    expect(backupFilename(new Date('2026-07-26T10:00:00Z'))).toBe(
      'crop-ledger-backup-2026-07-26.json'
    )
  })
})

describe('parseBackup', () => {
  it('round-trips a file it produced', () => {
    const result = parseBackup(validFile())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.crops).toBe(1)
    expect(result.expenses).toBe(1)
    expect(result.payload.crops[0]).toEqual(crop)
    expect(result.payload.expenses[0]).toEqual(expense)
  })

  it('defaults sales to empty for a backup taken before revenue existed', () => {
    const withoutSales = JSON.stringify({
      app: 'crop-ledger',
      version: 1,
      exportedAt: '2026-07-26T00:00:00.000Z',
      crops: [crop],
      expenses: [expense],
    })
    const result = parseBackup(withoutSales)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.payload.sales).toEqual([])
  })

  it('rejects malformed JSON', () => {
    const result = parseBackup('{ not json')
    expect(result).toEqual({ ok: false, error: "That file isn't valid JSON." })
  })

  it('rejects a file from a different app', () => {
    const result = parseBackup(JSON.stringify({ app: 'something-else' }))
    expect(result.ok).toBe(false)
  })

  it('rejects a backup from a future version rather than guessing', () => {
    const result = parseBackup(
      JSON.stringify({ app: 'crop-ledger', version: 99, crops: [], expenses: [] })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/newer version/)
  })

  it('refuses the whole file when any record is damaged', () => {
    // Partially importing would wipe good data and replace it with less.
    const damaged = JSON.stringify({
      app: 'crop-ledger',
      version: 1,
      crops: [crop, { id: 'broken' }],
      expenses: [expense],
    })
    const result = parseBackup(damaged)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/damaged/)
  })

  it('rejects a file missing its collections', () => {
    const result = parseBackup(JSON.stringify({ app: 'crop-ledger', version: 1 }))
    expect(result.ok).toBe(false)
  })
})
