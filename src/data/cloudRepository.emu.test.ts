import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'
import { cloudRepository } from './cloudRepository'
import { uploadLocalLedger } from './cloudSync'
import type { Crop, Expense, Receipt, Sale, Settlement } from '../domain/types'
import type { BackupPayload, CropRepository } from './repository'

let env: RulesTestEnvironment
let repo: CropRepository
let db: Firestore

const UID = 'owner-1'

// No `rules` option on purpose: the emulator has already loaded
// firestore.rules via firebase.json, so these tests run against the same file
// that gets pasted into the console rather than a copy of it.
env = await initializeTestEnvironment({
  projectId: 'demo-crop-ledger',
  firestore: { host: '127.0.0.1', port: 8080 },
})

const crop = (id: string): Crop => ({
  id,
  name: 'Cotton',
  season: 'Kharif 2026',
  startDate: '2026-06-01',
  members: [{ id: 'm1', name: 'Bhojraj' }],
  createdAt: '2026-06-01T00:00:00.000Z',
})

const expense = (id: string, cropId: string): Expense => ({
  id,
  cropId,
  amount: 250000,
  category: 'seeds',
  date: '2026-06-02',
  notes: '',
  payments: [{ id: 'p1', memberId: 'm1', amount: 250000, paidAt: '2026-06-02' }],
  owedBy: ['m1'],
  createdAt: '2026-06-02T00:00:00.000Z',
})

const sale = (id: string, cropId: string): Sale => ({
  id,
  cropId,
  receivedBy: 'm1',
  quantity: 10,
  unit: 'quintal',
  rate: 700000,
  total: 7000000,
  date: '2026-11-01',
  createdAt: '2026-11-01T00:00:00.000Z',
})

const settlement = (id: string, cropId: string): Settlement => ({
  id,
  cropId,
  from: 'm2',
  to: 'm1',
  amount: 150000,
  date: '2026-11-20',
  createdAt: '2026-11-20T00:00:00.000Z',
})

const receipt = (id: string, expenseId: string): Receipt => ({
  id,
  expenseId,
  image: new Uint8Array([1, 2, 3, 4, 5]).buffer,
  mimeType: 'image/jpeg',
  width: 100,
  height: 80,
  addedAt: '2026-06-02T00:00:00.000Z',
})

beforeEach(async () => {
  await env.clearFirestore()
  db = env.authenticatedContext(UID).firestore() as unknown as Firestore
  repo = cloudRepository(UID, { firestore: db })
})

afterAll(async () => {
  await env.cleanup()
})

describe('cloudRepository', () => {
  it('round-trips a crop, expense and sale', async () => {
    await repo.saveCrop(crop('c1'))
    await repo.saveExpense(expense('e1', 'c1'))
    await repo.saveSale(sale('s1', 'c1'))

    expect(await repo.listCrops()).toEqual([crop('c1')])
    expect(await repo.listExpenses('c1')).toEqual([expense('e1', 'c1')])
    expect(await repo.listSales('c1')).toEqual([sale('s1', 'c1')])
  })

  it('strips undefined rather than letting Firestore reject the write', async () => {
    // customCategory/owedTo/endDate are absent most of the time; an explicit
    // undefined is what an object spread produces and what Firestore refuses.
    // Cast because `exactOptionalPropertyTypes` rejects an explicit
    // undefined — which is exactly the value an object spread produces at
    // runtime and the one Firestore refuses to store.
    await repo.saveExpense({
      ...expense('e1', 'c1'),
      owedTo: undefined,
      customCategory: undefined,
    } as unknown as Expense)
    const [stored] = await repo.listExpenses('c1')
    expect(stored).not.toHaveProperty('owedTo')
  })

  it('keeps receipt bytes intact', async () => {
    await repo.saveExpense(expense('e1', 'c1'))
    await repo.saveReceipt(receipt('r1', 'e1'))

    const [stored] = await repo.listReceipts('e1')
    expect(new Uint8Array(stored!.image)).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    expect(stored!.mimeType).toBe('image/jpeg')
  })

  it('does not return receipts through the expense list', async () => {
    // The whole reason receipts are a subcollection: listing expenses must
    // never drag photo bytes along.
    await repo.saveExpense(expense('e1', 'c1'))
    await repo.saveReceipt(receipt('r1', 'e1'))
    const [stored] = await repo.listExpenses('c1')
    expect(JSON.stringify(stored)).not.toContain('image')
  })

  it('deletes a crop with its expenses, sales and photos', async () => {
    await repo.saveCrop(crop('c1'))
    await repo.saveCrop(crop('c2'))
    await repo.saveExpense(expense('e1', 'c1'))
    await repo.saveReceipt(receipt('r1', 'e1'))
    await repo.saveSale(sale('s1', 'c1'))
    await repo.saveExpense(expense('e2', 'c2'))

    await repo.deleteCrop('c1')

    expect((await repo.listCrops()).map((c) => c.id)).toEqual(['c2'])
    expect(await repo.listExpenses('c1')).toEqual([])
    expect(await repo.listSales('c1')).toEqual([])
    expect(await repo.listReceipts('e1')).toEqual([])
    // The untouched crop keeps everything.
    expect((await repo.listExpenses('c2')).map((e) => e.id)).toEqual(['e2'])
  })

  it('round-trips a settlement', async () => {
    await repo.saveCrop(crop('c1'))
    await repo.saveSettlement(settlement('st1', 'c1'))
    expect(await repo.listSettlements('c1')).toEqual([settlement('st1', 'c1')])
  })

  it('deletes a crop with its settlements', async () => {
    // A settlement left behind would be unreachable but still counted by any
    // export, and would reappear against a crop that no longer exists.
    await repo.saveCrop(crop('c1'))
    await repo.saveCrop(crop('c2'))
    await repo.saveSettlement(settlement('st1', 'c1'))
    await repo.saveSettlement(settlement('st2', 'c2'))

    await repo.deleteCrop('c1')

    expect(await repo.listSettlements('c1')).toEqual([])
    expect((await repo.listSettlements('c2')).map((s) => s.id)).toEqual(['st2'])
  })

  it('deletes an expense with its photos', async () => {
    await repo.saveExpense(expense('e1', 'c1'))
    await repo.saveReceipt(receipt('r1', 'e1'))
    await repo.deleteExpense('e1')

    expect(await repo.listExpenses('c1')).toEqual([])
    expect(await repo.listReceipts('e1')).toEqual([])
  })

  it('replaces everything on restore, photos included', async () => {
    await repo.saveCrop(crop('old'))
    await repo.saveExpense(expense('olde', 'old'))
    await repo.saveReceipt(receipt('oldr', 'olde'))

    const payload: BackupPayload = {
      crops: [crop('c1')],
      expenses: [expense('e1', 'c1')],
      sales: [sale('s1', 'c1')],
      settlements: [settlement('st1', 'c1')],
      receipts: [receipt('r1', 'e1')],
    }
    const { photosFailed } = await repo.replaceAll(payload)

    expect(photosFailed).toBe(0)
    expect((await repo.listCrops()).map((c) => c.id)).toEqual(['c1'])
    expect(await repo.listExpenses('old')).toEqual([])
    expect(await repo.listReceipts('olde')).toEqual([])
    expect((await repo.listReceipts('e1')).map((r) => r.id)).toEqual(['r1'])
    expect((await repo.listSettlements('c1')).map((s) => s.id)).toEqual(['st1'])
  })

  it('exports what it imported', async () => {
    const payload: BackupPayload = {
      crops: [crop('c1')],
      // receiptCount is what tells exportAll which expenses to fetch photos
      // for; without it the photo would be silently left out of the backup.
      expenses: [{ ...expense('e1', 'c1'), receiptCount: 1 }],
      sales: [sale('s1', 'c1')],
      settlements: [],
      receipts: [receipt('r1', 'e1')],
    }
    await repo.replaceAll(payload)

    const exported = await repo.exportAll()
    expect(exported.crops).toEqual(payload.crops)
    expect(exported.expenses).toEqual(payload.expenses)
    expect(exported.sales).toEqual(payload.sales)
    expect(exported.receipts.map((r) => r.id)).toEqual(['r1'])
  })
})

/**
 * Stands in for the device's Dexie store, which cannot run here (no
 * IndexedDB under Node). Only the three methods uploadLocalLedger actually
 * calls are real; the rest exist to satisfy the interface.
 */
function fakeLocal(payload: BackupPayload): CropRepository {
  const unused = () => Promise.reject(new Error('not used by this test'))
  return {
    listCrops: async () => payload.crops,
    exportAll: async () => payload,
    listExpenses: async (cropId) =>
      payload.expenses.filter((e) => e.cropId === cropId),
    listSales: async (cropId) => payload.sales.filter((s) => s.cropId === cropId),
    listSettlements: async (cropId) =>
      payload.settlements.filter((s) => s.cropId === cropId),
    listReceipts: async () => payload.receipts,
    saveCrop: unused,
    deleteCrop: unused,
    saveExpense: unused,
    deleteExpense: unused,
    saveSale: unused,
    deleteSale: unused,
    saveSettlement: unused,
    deleteSettlement: unused,
    saveReceipt: unused,
    deleteReceipt: unused,
    replaceAll: unused,
  }
}

describe('uploadLocalLedger against a real account', () => {
  it('moves a device ledger into an empty account', async () => {
    const local = fakeLocal({
      crops: [crop('c1')],
      expenses: [expense('e1', 'c1')],
      sales: [],
      settlements: [],
      receipts: [],
    })

    const result = await uploadLocalLedger(local, repo)

    expect(result.decision).toBe('upload')
    expect((await repo.listCrops()).map((c) => c.id)).toEqual(['c1'])
    expect((await repo.listExpenses('c1')).map((e) => e.id)).toEqual(['e1'])
  })

  it('refuses to overwrite an account that already holds a ledger', async () => {
    const local = fakeLocal({
      crops: [crop('local-only')],
      expenses: [],
      sales: [],
      settlements: [],
      receipts: [],
    })
    await repo.saveCrop(crop('already-there'))

    const result = await uploadLocalLedger(local, repo)

    expect(result.decision).toBe('skip')
    expect((await repo.listCrops()).map((c) => c.id)).toEqual(['already-there'])
  })
})

describe('firestore.rules', () => {
  it('lets the owner read and write their own documents', async () => {
    await assertSucceeds(
      setDoc(doc(db, `users/${UID}/crops/c1`), crop('c1'))
    )
    await assertSucceeds(getDoc(doc(db, `users/${UID}/crops/c1`)))
  })

  it('keeps another signed-in user out', async () => {
    const intruder = env
      .authenticatedContext('someone-else')
      .firestore() as unknown as Firestore
    await assertFails(getDoc(doc(intruder, `users/${UID}/crops/c1`)))
    await assertFails(
      setDoc(doc(intruder, `users/${UID}/crops/c1`), crop('c1'))
    )
    // Including the nested collections the recursive wildcard covers.
    await assertFails(
      getDoc(doc(intruder, `users/${UID}/expenses/e1/receipts/r1`))
    )
  })

  it('keeps a signed-out visitor out entirely', async () => {
    const guest = env.unauthenticatedContext().firestore() as unknown as Firestore
    await assertFails(getDoc(doc(guest, `users/${UID}/crops/c1`)))
    await assertFails(getDoc(doc(guest, 'anything/else')))
  })
})
