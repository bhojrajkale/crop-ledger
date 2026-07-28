import { create } from 'zustand'
import type { Crop, Expense, Member, Payment, Receipt, Sale } from '../domain/types'
import { dexieRepository, type CropRepository } from '../data/repository'
import { buildBackup, parseBackup, type ParseResult } from '../data/backup'
import { applyPayment, removePayment } from '../domain/payments'

/** A parse result plus how many photos storage refused. */
export type ImportResult =
  | (Extract<ParseResult, { ok: true }> & { photosFailed: number })
  | Extract<ParseResult, { ok: false }>

/** Where the ledger currently being shown is stored. */
export type StorageKind = 'local' | 'cloud'

interface LedgerState {
  crops: Crop[]
  /** Expenses for the crop currently open. Not every crop's, ever. */
  expenses: Expense[]
  /** Harvest sales for the crop currently open. */
  sales: Sale[]
  loadedCropId: string | null
  loading: boolean
  /**
   * True while the open crop's expenses and sales are being read.
   *
   * Separate from `loading`, which covers the crop list. A screen that does
   * not know the difference renders its "nothing here yet" empty state during
   * the read — telling the user their expenses are gone, every time they open
   * a crop over a slow connection.
   */
  cropLoading: boolean
  error: string | null
  /** Which backing store the rows above came from. */
  storage: StorageKind

  load: () => Promise<void>
  openCrop: (cropId: string) => Promise<void>
  /**
   * Points the store at a different backing store and re-reads everything.
   *
   * This is the whole cost of moving between the device and the cloud: no
   * screen knows which one it is looking at, because none of them ever talked
   * to storage directly.
   */
  setRepository: (next: CropRepository, storage: StorageKind) => Promise<void>

  saveCrop: (crop: Crop) => Promise<void>
  deleteCrop: (cropId: string) => Promise<void>
  setArchived: (cropId: string, archived: boolean) => Promise<void>

  setMembers: (cropId: string, members: Member[]) => Promise<void>

  saveExpense: (expense: Expense) => Promise<void>
  deleteExpense: (expenseId: string) => Promise<void>

  saveSale: (sale: Sale) => Promise<void>
  deleteSale: (saleId: string) => Promise<void>

  /** Records money paid towards an expense bought on credit. */
  recordPayment: (
    expenseId: string,
    payment: Payment
  ) => Promise<{ trimmed: boolean }>
  /** Undoes a recorded payment, putting the amount back on credit. */
  undoPayment: (expenseId: string, paymentId: string) => Promise<void>

  listReceipts: (expenseId: string) => Promise<Receipt[]>
  /**
   * Applies the receipt changes made in the expense form, then stamps the
   * resulting count onto the expense so lists can show a badge without
   * touching image data.
   */
  syncReceipts: (
    expense: Expense,
    added: Receipt[],
    removedIds: string[]
  ) => Promise<void>

  exportBackup: () => Promise<Awaited<ReturnType<typeof buildBackup>>>
  importBackup: (text: string) => Promise<ImportResult>
}

/**
 * The active backing store. Mutable, and read afresh at every call, so
 * switching accounts is a single assignment rather than a rewiring of the
 * store's methods.
 */
let repo: CropRepository = dexieRepository

const message = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong.'

export const useLedgerStore = create<LedgerState>((set, get) => ({
  crops: [],
  expenses: [],
  sales: [],
  loadedCropId: null,
  loading: true,
  cropLoading: false,
  error: null,
  storage: 'local',

  async setRepository(next, storage) {
    repo = next
    // Drop the previous account's rows before reading the new ones. Showing
    // one ledger under another's heading, even for a moment, is the kind of
    // thing that gets acted on.
    set({ crops: [], expenses: [], sales: [], loading: true, storage })
    await get().load()
    const cropId = get().loadedCropId
    if (cropId) await get().openCrop(cropId)
  },

  async load() {
    try {
      set({ crops: await repo.listCrops(), loading: false, error: null })
    } catch (e) {
      set({ loading: false, error: message(e) })
    }
  },

  async openCrop(cropId) {
    // Clear the previous crop's rows first so a slow read can never show one
    // crop's expenses under another crop's heading.
    set({ expenses: [], sales: [], loadedCropId: cropId, cropLoading: true })
    try {
      const [expenses, sales] = await Promise.all([
        repo.listExpenses(cropId),
        repo.listSales(cropId),
      ])
      // Guard against an out-of-order resolve if the user switched crops
      // while this read was in flight. The flag is left alone in that case
      // too — the newer read owns it, and clearing it here would drop the
      // spinner while that one is still running.
      if (get().loadedCropId === cropId) {
        set({ expenses, sales, cropLoading: false, error: null })
      }
    } catch (e) {
      if (get().loadedCropId === cropId) set({ cropLoading: false })
      set({ error: message(e) })
    }
  },

  async saveCrop(crop) {
    // Writes go to storage first: unlike a synced app there is no server copy
    // to fall back on, so showing a change that failed to persist would be a
    // lie the user only discovers after a reload.
    try {
      await repo.saveCrop(crop)
      set({ crops: await repo.listCrops(), error: null })
    } catch (e) {
      set({ error: message(e) })
      throw e
    }
  },

  async deleteCrop(cropId) {
    try {
      await repo.deleteCrop(cropId)
      const crops = await repo.listCrops()
      set(
        get().loadedCropId === cropId
          ? { crops, expenses: [], sales: [], loadedCropId: null, error: null }
          : { crops, error: null }
      )
    } catch (e) {
      set({ error: message(e) })
      throw e
    }
  },

  async setArchived(cropId, archived) {
    const crop = get().crops.find((c) => c.id === cropId)
    if (!crop) return
    // Spread the stored crop rather than rebuilding it, so fields this screen
    // doesn't know about are never dropped on save.
    await get().saveCrop({ ...crop, archived })
  },

  async setMembers(cropId, members) {
    const crop = get().crops.find((c) => c.id === cropId)
    if (!crop) return
    await get().saveCrop({ ...crop, members })
  },

  async saveExpense(expense) {
    try {
      await repo.saveExpense(expense)
      if (get().loadedCropId === expense.cropId) {
        set({ expenses: await repo.listExpenses(expense.cropId), error: null })
      }
    } catch (e) {
      set({ error: message(e) })
      throw e
    }
  },

  async deleteExpense(expenseId) {
    const cropId = get().loadedCropId
    try {
      await repo.deleteExpense(expenseId)
      if (cropId) set({ expenses: await repo.listExpenses(cropId), error: null })
    } catch (e) {
      set({ error: message(e) })
      throw e
    }
  },

  async saveSale(sale) {
    try {
      await repo.saveSale(sale)
      if (get().loadedCropId === sale.cropId) {
        set({ sales: await repo.listSales(sale.cropId), error: null })
      }
    } catch (e) {
      set({ error: message(e) })
      throw e
    }
  },

  async deleteSale(saleId) {
    const cropId = get().loadedCropId
    try {
      await repo.deleteSale(saleId)
      if (cropId) set({ sales: await repo.listSales(cropId), error: null })
    } catch (e) {
      set({ error: message(e) })
      throw e
    }
  },

  async recordPayment(expenseId, payment) {
    const expense = get().expenses.find((e) => e.id === expenseId)
    if (!expense) return { trimmed: false }
    // applyPayment spreads the stored expense, so fields this screen never
    // touches survive the write.
    const { expense: updated, trimmed } = applyPayment(expense, payment)
    await get().saveExpense(updated)
    return { trimmed }
  },

  async undoPayment(expenseId, paymentId) {
    const expense = get().expenses.find((e) => e.id === expenseId)
    if (!expense) return
    await get().saveExpense(removePayment(expense, paymentId))
  },

  async listReceipts(expenseId) {
    return repo.listReceipts(expenseId)
  },

  async syncReceipts(expense, added, removedIds) {
    for (const id of removedIds) await repo.deleteReceipt(id, expense.id)
    for (const receipt of added) await repo.saveReceipt(receipt)

    const count = (await repo.listReceipts(expense.id)).length
    const current = get().expenses.find((e) => e.id === expense.id) ?? expense
    const updated: Expense = { ...current, receiptCount: count }
    if (count === 0) delete updated.receiptCount
    await get().saveExpense(updated)
  },

  async exportBackup() {
    return buildBackup(await repo.exportAll())
  },

  async importBackup(text) {
    const result = await parseBackup(text)
    if (!result.ok) return result
    try {
      // The ledger commits on its own; photos are reported separately rather
      // than being able to fail the whole restore.
      const { photosFailed } = await repo.replaceAll(result.payload)
      const cropId = get().loadedCropId
      set({
        crops: await repo.listCrops(),
        expenses: cropId ? await repo.listExpenses(cropId) : [],
        sales: cropId ? await repo.listSales(cropId) : [],
        error: null,
      })
      return { ...result, photosFailed }
    } catch (e) {
      return { ok: false, error: message(e) } satisfies ParseResult
    }
  },
}))
