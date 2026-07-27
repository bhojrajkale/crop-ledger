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
  payments: [{ id: 'p1', memberId: 'a', amount: 50_000, paidAt: '2026-06-02' }],
  owedBy: ['a'],
  createdAt: '2026-06-02T00:00:00.000Z',
}

const validFile = async () =>
  JSON.stringify(
    await buildBackup({
      crops: [crop],
      expenses: [expense],
      sales: [],
      receipts: [],
    })
  )

describe('buildBackup', () => {
  it('stamps the app name and version so imports can be checked', async () => {
    const backup = await buildBackup({ crops: [], expenses: [], sales: [], receipts: [] })
    expect(backup.app).toBe('crop-ledger')
    expect(backup.version).toBe(2)
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('backupFilename', () => {
  it('dates the file so successive backups do not overwrite each other', async () => {
    expect(backupFilename(new Date('2026-07-26T10:00:00Z'))).toBe(
      'crop-ledger-backup-2026-07-26.json'
    )
  })
})

describe('parseBackup', () => {
  it('round-trips a file it produced', async () => {
    const result = await parseBackup(await validFile())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.crops).toBe(1)
    expect(result.expenses).toBe(1)
    expect(result.payload.crops[0]).toEqual(crop)
    expect(result.payload.expenses[0]).toEqual(expense)
  })

  it('defaults sales to empty for a backup taken before revenue existed', async () => {
    const withoutSales = JSON.stringify({
      app: 'crop-ledger',
      version: 1,
      exportedAt: '2026-07-26T00:00:00.000Z',
      crops: [crop],
      expenses: [expense],
    })
    const result = await parseBackup(withoutSales)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.payload.sales).toEqual([])
  })

  it('rejects malformed JSON', async () => {
    const result = await parseBackup('{ not json')
    expect(result).toEqual({ ok: false, error: "That file isn't valid JSON." })
  })

  it('rejects a file from a different app', async () => {
    const result = await parseBackup(JSON.stringify({ app: 'something-else' }))
    expect(result.ok).toBe(false)
  })

  it('rejects a backup from a future version rather than guessing', async () => {
    const result = await parseBackup(
      JSON.stringify({ app: 'crop-ledger', version: 99, crops: [], expenses: [] })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/newer version/)
  })

  it('refuses the whole file when any record is damaged', async () => {
    // Partially importing would wipe good data and replace it with less.
    const damaged = JSON.stringify({
      app: 'crop-ledger',
      version: 1,
      crops: [crop, { id: 'broken' }],
      expenses: [expense],
    })
    const result = await parseBackup(damaged)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/damaged/)
  })

  it('rejects a file missing its collections', async () => {
    const result = await parseBackup(JSON.stringify({ app: 'crop-ledger', version: 1 }))
    expect(result.ok).toBe(false)
  })
})

describe('parseBackup with pre-credit backups', () => {
  const legacyFile = JSON.stringify({
    app: 'crop-ledger',
    version: 1,
    exportedAt: '2026-07-01T00:00:00.000Z',
    crops: [crop],
    expenses: [
      {
        id: 'old1',
        cropId: 'c1',
        amount: 90_000,
        category: 'seeds',
        date: '2026-06-01',
        notes: '',
        paidBy: 'a',
        owedBy: ['a'],
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    ],
  })

  it('accepts a backup written before payments existed', async () => {
    expect((await parseBackup(legacyFile)).ok).toBe(true)
  })

  it('converts the old payer into a full payment on the way in', async () => {
    const result = await parseBackup(legacyFile)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const restored = result.payload.expenses[0]!
    expect(restored.payments).toEqual([
      { id: 'old1-legacy', memberId: 'a', amount: 90_000, paidAt: '2026-06-01' },
    ])
    expect('paidBy' in restored).toBe(false)
  })
})

describe('receipts in backups', () => {
  // Not a real JPEG, but a distinctive byte sequence is enough to prove the
  // bytes survive the base64 round trip unchanged.
  const sample = [0xff, 0xd8, 0xff, 0x00, 0x10, 0x7f, 0x80, 0xfe]

  const receipt = {
    id: 'r1',
    expenseId: 'e1',
    image: new Uint8Array(sample).buffer,
    mimeType: 'image/jpeg',
    width: 1200,
    height: 1600,
    addedAt: '2026-06-02T10:00:00.000Z',
  }

  const fileWithReceipt = async () =>
    JSON.stringify(
      await buildBackup({
        crops: [crop],
        expenses: [expense],
        sales: [],
        receipts: [receipt],
      })
    )

  it('serialises a photo as a data URL', async () => {
    const backup = await buildBackup({
      crops: [],
      expenses: [],
      sales: [],
      receipts: [receipt],
    })
    expect(backup.receipts[0]!.image).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('round-trips the exact bytes', async () => {
    const result = await parseBackup(await fileWithReceipt())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const restored = result.payload.receipts[0]!
    expect(restored.mimeType).toBe('image/jpeg')
    expect([...new Uint8Array(restored.image)]).toEqual(sample)
  })

  it('keeps the metadata alongside the image', async () => {
    const result = await parseBackup(await fileWithReceipt())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const restored = result.payload.receipts[0]!
    expect(restored.id).toBe('r1')
    expect(restored.expenseId).toBe('e1')
    expect(restored.width).toBe(1200)
    expect(restored.height).toBe(1600)
  })

  it('reports how many photos were restored', async () => {
    const result = await parseBackup(await fileWithReceipt())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.receipts).toBe(1)
  })

  it('treats a backup with no receipts key as having none', async () => {
    const result = await parseBackup(
      JSON.stringify({
        app: 'crop-ledger',
        version: 1,
        crops: [crop],
        expenses: [expense],
      })
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.payload.receipts).toEqual([])
  })

  it('refuses the whole file when a photo is damaged', async () => {
    const result = await parseBackup(
      JSON.stringify({
        app: 'crop-ledger',
        version: 2,
        crops: [crop],
        expenses: [expense],
        receipts: [{ id: 'r1', expenseId: 'e1', image: 'not-a-data-url' }],
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/damaged photos/)
  })
})
