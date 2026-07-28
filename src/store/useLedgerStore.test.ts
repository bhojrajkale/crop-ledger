import { beforeEach, describe, expect, it } from 'vitest'
import { useLedgerStore } from './useLedgerStore'
import type { CropRepository } from '../data/repository'
import type { Expense, Sale } from '../domain/types'

const expense = (id: string): Expense => ({
  id,
  cropId: 'c1',
  amount: 100000,
  category: 'seeds',
  date: '2026-06-02',
  notes: '',
  payments: [],
  owedBy: ['m1'],
  createdAt: '2026-06-02T00:00:00.000Z',
})

const sale = (id: string): Sale => ({
  id,
  cropId: 'c1',
  receivedBy: 'm1',
  quantity: 1,
  unit: 'quintal',
  rate: 700000,
  total: 700000,
  date: '2026-11-01',
  createdAt: '2026-11-01T00:00:00.000Z',
})

/** Resolves only when `release()` is called, so a read can be held open. */
function deferred<T>() {
  let release!: (value: T) => void
  const promise = new Promise<T>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

const unused = () => Promise.reject(new Error('not used by this test'))

function repository(overrides: Partial<CropRepository>): CropRepository {
  return {
    listCrops: async () => [],
    listExpenses: async () => [],
    listSales: async () => [],
    listReceipts: async () => [],
    exportAll: unused,
    replaceAll: unused,
    saveCrop: unused,
    deleteCrop: unused,
    saveExpense: unused,
    deleteExpense: unused,
    saveSale: unused,
    deleteSale: unused,
    saveReceipt: unused,
    deleteReceipt: unused,
    ...overrides,
  }
}

beforeEach(() => {
  useLedgerStore.setState({
    crops: [],
    expenses: [],
    sales: [],
    loadedCropId: null,
    cropLoading: false,
    error: null,
  })
})

describe('openCrop', () => {
  it('spins until the rows arrive', async () => {
    // The point of the flag: without it every tab falls through to its
    // "nothing here yet" empty state during the read, telling the user their
    // expenses are gone.
    const held = deferred<Expense[]>()
    await useLedgerStore
      .getState()
      .setRepository(repository({ listExpenses: () => held.promise }), 'cloud')

    const opening = useLedgerStore.getState().openCrop('c1')
    await Promise.resolve()

    expect(useLedgerStore.getState().cropLoading).toBe(true)
    expect(useLedgerStore.getState().expenses).toEqual([])

    held.release([expense('e1')])
    await opening

    expect(useLedgerStore.getState().cropLoading).toBe(false)
    expect(useLedgerStore.getState().expenses).toEqual([expense('e1')])
  })

  it('paints cached rows first, then replaces them with the fresh read', async () => {
    const held = deferred<Expense[]>()
    const repo = repository({
      cachedCropData: async () => ({
        expenses: [expense('cached')],
        sales: [sale('cached-sale')],
      }),
      listExpenses: () => held.promise,
      listSales: async () => [sale('fresh-sale')],
    })
    await useLedgerStore.getState().setRepository(repo, 'cloud')

    const opening = useLedgerStore.getState().openCrop('c1')
    // Let the cached read resolve while the server read is still in flight.
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    // Usable immediately, with no spinner, even though the real read has not
    // come back yet — this is the whole point of the cached pass.
    expect(useLedgerStore.getState().cropLoading).toBe(false)
    expect(useLedgerStore.getState().expenses).toEqual([expense('cached')])

    held.release([expense('fresh')])
    await opening

    // The server copy is authoritative and overwrites the cached one.
    expect(useLedgerStore.getState().expenses).toEqual([expense('fresh')])
    expect(useLedgerStore.getState().sales).toEqual([sale('fresh-sale')])
  })

  it('keeps waiting when nothing is cached', async () => {
    // An empty cache must not be mistaken for an empty crop.
    const held = deferred<Expense[]>()
    const repo = repository({
      cachedCropData: async () => null,
      listExpenses: () => held.promise,
    })
    await useLedgerStore.getState().setRepository(repo, 'cloud')

    const opening = useLedgerStore.getState().openCrop('c1')
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(useLedgerStore.getState().cropLoading).toBe(true)

    held.release([])
    await opening
    expect(useLedgerStore.getState().cropLoading).toBe(false)
  })

  it('ignores a read that resolves after the user moved to another crop', async () => {
    const slow = deferred<Expense[]>()
    let call = 0
    const repo = repository({
      listExpenses: () => {
        call += 1
        return call === 1 ? slow.promise : Promise.resolve([expense('second')])
      },
    })
    await useLedgerStore.getState().setRepository(repo, 'cloud')

    const first = useLedgerStore.getState().openCrop('c1')
    await useLedgerStore.getState().openCrop('c2')

    // The abandoned read lands late and must not overwrite the crop now open.
    slow.release([expense('first')])
    await first

    expect(useLedgerStore.getState().loadedCropId).toBe('c2')
    expect(useLedgerStore.getState().expenses).toEqual([expense('second')])
  })
})
