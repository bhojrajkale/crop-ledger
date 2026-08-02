import type { Crop, Expense, Receipt, Sale, Settlement } from '../domain/types'
import { byNewestFirst, byStartDateDesc } from '../domain/order'
import { receiptBytes } from '../lib/image'
import { db } from './db'

/**
 * Photos written before the Blob-in-IndexedDB problem was found still hold a
 * Blob. Reads normalise them to bytes so nothing downstream has to care, and
 * any subsequent write stores the fixed shape.
 */
async function normalise(receipt: Receipt): Promise<Receipt> {
  const { bytes, mimeType } = await receiptBytes(receipt.image, receipt.mimeType)
  return { ...receipt, image: bytes, mimeType }
}

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
  saveSale(sale: Sale): Promise<void>
  deleteSale(saleId: string): Promise<void>

  listSettlements(cropId: string): Promise<Settlement[]>
  saveSettlement(settlement: Settlement): Promise<void>
  deleteSettlement(settlementId: string): Promise<void>

  /**
   * Rows the device already holds for a crop, without touching the network.
   *
   * Optional, and only worth implementing where a read would otherwise wait
   * on a server. It exists so opening a crop can paint immediately from what
   * is already on the phone while the authoritative read catches up — the
   * difference between a two-second wait and none, on data that was sitting
   * right there.
   *
   * Returns null when there is nothing cached, which the caller must treat as
   * "keep waiting" rather than "this crop is empty".
   */
  cachedCropData?(cropId: string): Promise<{
    expenses: Expense[]
    sales: Sale[]
    settlements: Settlement[]
  } | null>

  /** Photos for one expense. Only ever read when someone opens them. */
  listReceipts(expenseId: string): Promise<Receipt[]>
  saveReceipt(receipt: Receipt): Promise<void>
  /**
   * The expense is passed alongside the id because a receipt is addressed by
   * its parent in the cloud layout (a subcollection of the expense), and the
   * only caller always knows which expense it is removing a photo from.
   */
  deleteReceipt(receiptId: string, expenseId: string): Promise<void>

  /** Whole-database read/replace, used by the JSON backup file. */
  exportAll(): Promise<BackupPayload>
  /** Resolves with how many photos could not be stored; the ledger is saved regardless. */
  replaceAll(payload: BackupPayload): Promise<{ photosFailed: number }>
}

export interface BackupPayload {
  crops: Crop[]
  expenses: Expense[]
  sales: Sale[]
  receipts: Receipt[]
  settlements: Settlement[]
}

export const dexieRepository: CropRepository = {
  async listCrops() {
    const crops = await db.crops.toArray()
    return crops.sort(byStartDateDesc)
  },

  async saveCrop(crop) {
    await db.crops.put(crop)
  },

  async deleteCrop(cropId) {
    // One transaction so a crop can never be left without its expenses or
    // vice versa if the tab is closed mid-delete. Receipts go too — orphaned
    // photos would sit in the quota forever with nothing pointing at them.
    await db.transaction(
      'rw',
      db.crops,
      db.expenses,
      db.sales,
      db.receipts,
      db.settlements,
      async () => {
        const expenseIds = await db.expenses
          .where('cropId')
          .equals(cropId)
          .primaryKeys()
        await db.receipts.where('expenseId').anyOf(expenseIds).delete()
        await db.expenses.where('cropId').equals(cropId).delete()
        await db.sales.where('cropId').equals(cropId).delete()
        await db.settlements.where('cropId').equals(cropId).delete()
        await db.crops.delete(cropId)
      }
    )
  },

  async listExpenses(cropId) {
    const expenses = await db.expenses.where('cropId').equals(cropId).toArray()
    return expenses.sort(byNewestFirst)
  },

  async saveExpense(expense) {
    await db.expenses.put(expense)
  },

  async deleteExpense(expenseId) {
    await db.transaction('rw', db.expenses, db.receipts, async () => {
      await db.receipts.where('expenseId').equals(expenseId).delete()
      await db.expenses.delete(expenseId)
    })
  },

  async listReceipts(expenseId) {
    const receipts = await db.receipts
      .where('expenseId')
      .equals(expenseId)
      .toArray()
    return Promise.all(
      receipts
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
        .map(normalise)
    )
  },

  async saveReceipt(receipt) {
    await db.receipts.put(receipt)
  },

  // expenseId is part of the interface for the cloud implementation's sake;
  // locally the receipt id is the primary key and is enough on its own.
  async deleteReceipt(receiptId) {
    await db.receipts.delete(receiptId)
  },

  async listSales(cropId) {
    const sales = await db.sales.where('cropId').equals(cropId).toArray()
    // Newest first: the harvest tab is read as a record of what has been sold
    // so far, and the most recent sale is the one being checked.
    return sales.sort(byNewestFirst)
  },

  async saveSale(sale) {
    await db.sales.put(sale)
  },

  async deleteSale(saleId) {
    await db.sales.delete(saleId)
  },

  async listSettlements(cropId) {
    const settlements = await db.settlements
      .where('cropId')
      .equals(cropId)
      .toArray()
    return settlements.sort(byNewestFirst)
  },

  async saveSettlement(settlement) {
    await db.settlements.put(settlement)
  },

  async deleteSettlement(settlementId) {
    await db.settlements.delete(settlementId)
  },

  async exportAll() {
    const [crops, expenses, sales, receipts, settlements] = await Promise.all([
      db.crops.toArray(),
      db.expenses.toArray(),
      db.sales.toArray(),
      db.receipts.toArray(),
      db.settlements.toArray(),
    ])
    return {
      crops,
      expenses,
      sales,
      settlements,
      receipts: await Promise.all(receipts.map(normalise)),
    }
  },

  /**
   * Restores the ledger, then the photos, in two separate transactions.
   *
   * They were one transaction until a phone failed to store photos and took
   * the entire restore down with it, leaving the user with nothing. The
   * ledger is the irreplaceable part: it commits first and stays committed,
   * and a photo failure is reported rather than thrown away with everything
   * else.
   */
  async replaceAll(payload) {
    await db.transaction(
      'rw',
      db.crops,
      db.expenses,
      db.sales,
      db.settlements,
      async () => {
        await Promise.all([
          db.crops.clear(),
          db.expenses.clear(),
          db.sales.clear(),
          db.settlements.clear(),
        ])
        await db.crops.bulkPut(payload.crops)
        await db.expenses.bulkPut(payload.expenses)
        await db.sales.bulkPut(payload.sales)
        await db.settlements.bulkPut(payload.settlements)
      }
    )

    try {
      await db.transaction('rw', db.receipts, async () => {
        await db.receipts.clear()
        await db.receipts.bulkPut(payload.receipts)
      })
      return { photosFailed: 0 }
    } catch {
      return { photosFailed: payload.receipts.length }
    }
  },
}
