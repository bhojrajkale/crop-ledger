import type { Crop, Expense, Sale } from '../domain/types'
import { db } from './db'

/**
 * The only surface the app uses to reach stored data. Components and the
 * store talk to this interface, never to Dexie directly, so switching the
 * backing store (to a cloud database, for instance) means writing one more
 * implementation rather than touching any screen.
 */
export interface CropRepository {
  listCrops(): Promise<Crop[]>
  saveCrop(crop: Crop): Promise<void>
  deleteCrop(cropId: string): Promise<void>

  listExpenses(cropId: string): Promise<Expense[]>
  saveExpense(expense: Expense): Promise<void>
  deleteExpense(expenseId: string): Promise<void>

  listSales(cropId: string): Promise<Sale[]>

  /** Whole-database read/replace, used by the JSON backup file. */
  exportAll(): Promise<BackupPayload>
  replaceAll(payload: BackupPayload): Promise<void>
}

export interface BackupPayload {
  crops: Crop[]
  expenses: Expense[]
  sales: Sale[]
}

export const dexieRepository: CropRepository = {
  async listCrops() {
    const crops = await db.crops.toArray()
    return crops.sort((a, b) => b.startDate.localeCompare(a.startDate))
  },

  async saveCrop(crop) {
    await db.crops.put(crop)
  },

  async deleteCrop(cropId) {
    // One transaction so a crop can never be left without its expenses or
    // vice versa if the tab is closed mid-delete.
    await db.transaction('rw', db.crops, db.expenses, db.sales, async () => {
      await db.expenses.where('cropId').equals(cropId).delete()
      await db.sales.where('cropId').equals(cropId).delete()
      await db.crops.delete(cropId)
    })
  },

  async listExpenses(cropId) {
    const expenses = await db.expenses.where('cropId').equals(cropId).toArray()
    return expenses.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    )
  },

  async saveExpense(expense) {
    await db.expenses.put(expense)
  },

  async deleteExpense(expenseId) {
    await db.expenses.delete(expenseId)
  },

  async listSales(cropId) {
    return db.sales.where('cropId').equals(cropId).toArray()
  },

  async exportAll() {
    const [crops, expenses, sales] = await Promise.all([
      db.crops.toArray(),
      db.expenses.toArray(),
      db.sales.toArray(),
    ])
    return { crops, expenses, sales }
  },

  async replaceAll(payload) {
    await db.transaction('rw', db.crops, db.expenses, db.sales, async () => {
      await Promise.all([db.crops.clear(), db.expenses.clear(), db.sales.clear()])
      await db.crops.bulkPut(payload.crops)
      await db.expenses.bulkPut(payload.expenses)
      await db.sales.bulkPut(payload.sales)
    })
  },
}
