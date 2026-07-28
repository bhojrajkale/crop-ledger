import { describe, expect, it } from 'vitest'
import { decideUpload, summarise } from './cloudSync'
import type { BackupPayload } from './repository'

describe('decideUpload', () => {
  it('moves a device-only ledger into an empty account', () => {
    // The case this whole path exists for: a season of expenses entered on a
    // phone before sync existed, and a freshly created account.
    expect(decideUpload(3, 0)).toBe('upload')
  })

  it('does nothing when the device has no ledger', () => {
    expect(decideUpload(0, 0)).toBe('nothing')
    expect(decideUpload(0, 5)).toBe('nothing')
  })

  it('leaves both alone when each side already holds data', () => {
    // Never merge. Ids survive an export/restore round trip, so two ledgers
    // that both descend from the same backup collide entry for entry —
    // "upload" here would overwrite whichever side happened to be newer.
    expect(decideUpload(2, 2)).toBe('skip')
    expect(decideUpload(1, 9)).toBe('skip')
  })
})

describe('summarise', () => {
  const payload: BackupPayload = {
    crops: [{ id: 'c1' }, { id: 'c2' }],
    expenses: [{ id: 'e1' }],
    sales: [],
    receipts: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
  } as unknown as BackupPayload

  it('counts what was moved', () => {
    expect(summarise(payload, 0)).toEqual({
      crops: 2,
      expenses: 1,
      sales: 0,
      photos: 3,
      photosFailed: 0,
    })
  })

  it('reports failed photos without changing the ledger counts', () => {
    // The ledger commits separately from the photos, so a photo failure must
    // never read as "nothing was moved".
    expect(summarise(payload, 3)).toMatchObject({
      crops: 2,
      expenses: 1,
      photosFailed: 3,
    })
  })
})
