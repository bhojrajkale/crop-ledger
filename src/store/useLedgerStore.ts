import { create } from 'zustand'
import type { Crop, Expense, Member } from '../domain/types'
import { dexieRepository, type CropRepository } from '../data/repository'
import { buildBackup, parseBackup, type ParseResult } from '../data/backup'

interface LedgerState {
  crops: Crop[]
  /** Expenses for the crop currently open. Not every crop's, ever. */
  expenses: Expense[]
  loadedCropId: string | null
  loading: boolean
  error: string | null

  load: () => Promise<void>
  openCrop: (cropId: string) => Promise<void>

  saveCrop: (crop: Crop) => Promise<void>
  deleteCrop: (cropId: string) => Promise<void>
  setArchived: (cropId: string, archived: boolean) => Promise<void>

  setMembers: (cropId: string, members: Member[]) => Promise<void>

  saveExpense: (expense: Expense) => Promise<void>
  deleteExpense: (expenseId: string) => Promise<void>

  exportBackup: () => Promise<ReturnType<typeof buildBackup>>
  importBackup: (text: string) => Promise<ParseResult>
}

const repo: CropRepository = dexieRepository

const message = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong.'

export const useLedgerStore = create<LedgerState>((set, get) => ({
  crops: [],
  expenses: [],
  loadedCropId: null,
  loading: true,
  error: null,

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
    set({ expenses: [], loadedCropId: cropId })
    try {
      const expenses = await repo.listExpenses(cropId)
      // Guard against an out-of-order resolve if the user switched crops
      // while this read was in flight.
      if (get().loadedCropId === cropId) set({ expenses, error: null })
    } catch (e) {
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
          ? { crops, expenses: [], loadedCropId: null, error: null }
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

  async exportBackup() {
    return buildBackup(await repo.exportAll())
  },

  async importBackup(text) {
    const result = parseBackup(text)
    if (!result.ok) return result
    try {
      await repo.replaceAll(result.payload)
      const cropId = get().loadedCropId
      set({
        crops: await repo.listCrops(),
        expenses: cropId ? await repo.listExpenses(cropId) : [],
        error: null,
      })
      return result
    } catch (e) {
      return { ok: false, error: message(e) } satisfies ParseResult
    }
  },
}))
