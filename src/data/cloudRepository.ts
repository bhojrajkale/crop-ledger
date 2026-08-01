import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromCache,
  query,
  setDoc,
  where,
  writeBatch,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'
import type { Crop, Expense, Receipt, Sale } from '../domain/types'
import { byNewestFirst, byStartDateDesc } from '../domain/order'
import { receiptBytes } from '../lib/image'
import { getFirebase } from './firebase'
import type { CropRepository } from './repository'

/**
 * Everything lives under `users/{uid}/…`, mirroring the local Dexie tables
 * one for one:
 *
 *   users/{uid}/crops/{cropId}
 *   users/{uid}/expenses/{expenseId}
 *   users/{uid}/expenses/{expenseId}/receipts/{receiptId}
 *   users/{uid}/sales/{saleId}
 *
 * The flat shape (expenses beside crops rather than nested inside them) is
 * deliberate: it is exactly what the local schema does, so the two
 * implementations of CropRepository stay readable against each other and a
 * backup file restores identically into either. Receipts are the one nested
 * collection, for the same reason they are a separate table locally — listing
 * expenses must never drag photo bytes along, and a subcollection is not read
 * when its parent document is.
 */

/** Firestore's per-batch write limit. */
const BATCH_LIMIT = 500

/**
 * Strips `undefined` fields. Firestore rejects them outright, and the domain
 * types are full of optional fields (`endDate`, `owedTo`, `customCategory`,
 * `receiptCount`) that are simply absent most of the time.
 */
function clean<T extends object>(value: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value)) {
    if (v !== undefined) out[key] = v
  }
  return out as T
}

/** A receipt as stored: image bytes become a Firestore Bytes value. */
interface StoredReceipt extends Omit<Receipt, 'image'> {
  image: Bytes
}

function toStored(receipt: Receipt, bytes: ArrayBuffer, mimeType: string) {
  return clean<StoredReceipt>({
    ...receipt,
    image: Bytes.fromUint8Array(new Uint8Array(bytes)),
    mimeType,
  })
}

/**
 * Back to the in-memory shape. `toUint8Array()` can return a view onto a
 * larger buffer, so the bytes are copied out rather than handing over
 * `.buffer` — which would otherwise expose neighbouring data as part of the
 * image.
 */
function fromStored(stored: StoredReceipt): Receipt {
  const view = stored.image.toUint8Array()
  return {
    ...stored,
    image: view.slice().buffer,
    mimeType: stored.mimeType || 'image/jpeg',
  }
}

/**
 * Collects writes and rolls over to a fresh batch every BATCH_LIMIT of them.
 *
 * Batches are atomic per chunk but not across chunks. That is acceptable at
 * every call site here — a delete or a restore that stops half way leaves a
 * partially applied change, and each caller re-reads afterwards — and it is
 * the only option available, because a season of expenses will pass 500
 * writes long before it strains anything else.
 */
function batchWriter(db: Firestore) {
  const batches: WriteBatch[] = [writeBatch(db)]
  let count = 0

  const current = () => batches[batches.length - 1]!
  const bump = () => {
    count += 1
    if (count >= BATCH_LIMIT) {
      batches.push(writeBatch(db))
      count = 0
    }
  }

  return {
    set(ref: DocumentReference<DocumentData>, data: DocumentData) {
      current().set(ref, data)
      bump()
    },
    delete(ref: DocumentReference<DocumentData>) {
      current().delete(ref)
      bump()
    },
    /**
     * Sequentially: parallel batches touching the same documents have no
     * defined order between them, and a phone on a weak connection is better
     * served sending one at a time.
     */
    async commit() {
      for (const batch of batches) await batch.commit()
    },
  }
}

/**
 * Cloud-backed storage for one signed-in account.
 *
 * Note what this does *not* do: subscribe to live updates. There is a single
 * user, on one device at a time, so live listeners would add a class of
 * ordering bugs for a collaboration case that does not exist yet.
 *
 * Every list read here goes to the server and waits for it — `getDocs` does
 * not answer from the cache just because the cache has the rows. That is why
 * the store updates its lists from the row it just wrote instead of re-reading
 * after every save, and why `cachedCropData` exists for the one read that
 * cannot be avoided.
 */
export interface CloudRepositoryOptions {
  /**
   * The Firestore instance to use. Defaults to the app's own. Injectable so
   * this implementation can be exercised against the local emulator, where
   * the app's instance cannot be used — it is configured with the browser's
   * IndexedDB cache, which does not exist under Node.
   */
  firestore?: Firestore
  /**
   * Called when a write is eventually rejected by the server. Because writes
   * resolve locally (see `queued` below), a genuine failure — a permission
   * change, a malformed document — surfaces long after the tap that caused
   * it, and would otherwise be swallowed entirely.
   */
  onWriteError?: (error: unknown) => void
}

export function cloudRepository(
  uid: string,
  { firestore, onWriteError }: CloudRepositoryOptions = {}
): CropRepository {
  const db = firestore ?? getFirebase().db

  /**
   * Treats a write as done once Firestore has it locally.
   *
   * Firestore's write promises resolve on **server acknowledgement**, so with
   * no signal they simply never settle. The store awaits every write before
   * it updates the screen, which meant that recording a payment — or adding
   * an expense, or anyone — in a field with no bars appeared to do nothing at
   * all. That is the opposite of offline-first, and it is what this app is
   * for.
   *
   * Resolving early is safe because the write is already applied to
   * Firestore's own IndexedDB cache by the time the call returns, and the SDK
   * retries until the server has it. The local cache is real storage, not a
   * guess — so the screen is telling the truth, just ahead of the server.
   */
  const queued = (write: Promise<unknown>): Promise<void> => {
    write.catch((error) => onWriteError?.(error))
    return Promise.resolve()
  }

  const root = `users/${uid}`
  const crops = () => collection(db, `${root}/crops`)
  const expenses = () => collection(db, `${root}/expenses`)
  const sales = () => collection(db, `${root}/sales`)
  const receipts = (expenseId: string) =>
    collection(db, `${root}/expenses/${expenseId}/receipts`)

  const readAll = async <T>(ref: CollectionReference<DocumentData>) =>
    (await getDocs(ref)).docs.map((d) => d.data() as T)

  /** Every receipt document id belonging to one expense. */
  const receiptIds = async (expenseId: string) =>
    (await getDocs(receipts(expenseId))).docs.map((d) => d.id)

  return {
    async listCrops() {
      const all = await readAll<Crop>(crops())
      return all.sort(byStartDateDesc)
    },

    async saveCrop(crop) {
      await queued(setDoc(doc(crops(), crop.id), clean(crop)))
    },

    async deleteCrop(cropId) {
      const owned = await getDocs(query(expenses(), where('cropId', '==', cropId)))
      const cropSales = await getDocs(query(sales(), where('cropId', '==', cropId)))
      // Receipts hang off expenses, so their ids have to be collected before
      // the expenses go — afterwards there is nothing left to enumerate them
      // from, and the photos would sit in the account forever.
      const photos = await Promise.all(
        owned.docs.map(async (d) => ({
          expenseId: d.id,
          ids: await receiptIds(d.id),
        }))
      )

      const batch = batchWriter(db)
      for (const { expenseId, ids } of photos) {
        for (const id of ids) batch.delete(doc(receipts(expenseId), id))
      }
      for (const d of owned.docs) batch.delete(d.ref)
      for (const d of cropSales.docs) batch.delete(d.ref)
      batch.delete(doc(crops(), cropId))
      await queued(batch.commit())
    },

    async listExpenses(cropId) {
      const rows = (
        await getDocs(query(expenses(), where('cropId', '==', cropId)))
      ).docs.map((d) => d.data() as Expense)
      return rows.sort(byNewestFirst)
    },

    async saveExpense(expense) {
      await queued(setDoc(doc(expenses(), expense.id), clean(expense)))
    },

    async deleteExpense(expenseId) {
      const ids = await receiptIds(expenseId)
      const batch = batchWriter(db)
      for (const id of ids) batch.delete(doc(receipts(expenseId), id))
      batch.delete(doc(expenses(), expenseId))
      await queued(batch.commit())
    },

    async listReceipts(expenseId) {
      const rows = (await getDocs(receipts(expenseId))).docs.map(
        (d) => d.data() as StoredReceipt
      )
      return rows
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
        .map(fromStored)
    },

    async saveReceipt(receipt) {
      // A photo written on an older build may still hold a Blob; normalise
      // before it reaches the wire, where a Blob is not a storable value.
      const { bytes, mimeType } = await receiptBytes(
        receipt.image,
        receipt.mimeType
      )
      await queued(
        setDoc(
          doc(receipts(receipt.expenseId), receipt.id),
          toStored(receipt, bytes, mimeType)
        )
      )
    },

    async deleteReceipt(receiptId, expenseId) {
      await queued(deleteDoc(doc(receipts(expenseId), receiptId)))
    },

    /**
     * Reads only what Firestore already has on this device.
     *
     * `getDocs` asks the server and waits for it, even when the same rows are
     * sitting in the local cache — which is why opening a crop used to pause
     * on a slow connection. This is the same query answered from the cache
     * alone, so the screen can paint at once while `listExpenses`/`listSales`
     * fetch the authoritative copy behind it.
     *
     * An empty cache returns null rather than empty arrays: the caller cannot
     * tell "nothing stored yet" from "this crop has no expenses", and
     * rendering the latter would flash a wrong, alarming answer.
     */
    async cachedCropData(cropId) {
      try {
        const [expenseDocs, saleDocs] = await Promise.all([
          getDocsFromCache(query(expenses(), where('cropId', '==', cropId))),
          getDocsFromCache(query(sales(), where('cropId', '==', cropId))),
        ])
        if (expenseDocs.empty && saleDocs.empty) return null

        const cachedExpenses = expenseDocs.docs.map((d) => d.data() as Expense)
        const cachedSales = saleDocs.docs.map((d) => d.data() as Sale)
        return {
          // Same ordering as the server-backed reads, so the rows do not
          // visibly reshuffle when the fresh copy lands.
          expenses: cachedExpenses.sort(byNewestFirst),
          sales: cachedSales.sort(byNewestFirst),
        }
      } catch {
        // No cache, or it could not be read. Not an error worth surfacing —
        // the real read is already on its way.
        return null
      }
    },

    async listSales(cropId) {
      const rows = (
        await getDocs(query(sales(), where('cropId', '==', cropId)))
      ).docs.map((d) => d.data() as Sale)
      // Newest first: the harvest tab is read as a record of what has sold so
      // far, and the most recent sale is the one being checked.
      return rows.sort(byNewestFirst)
    },

    async saveSale(sale) {
      await queued(setDoc(doc(sales(), sale.id), clean(sale)))
    },

    async deleteSale(saleId) {
      await queued(deleteDoc(doc(sales(), saleId)))
    },

    async exportAll() {
      const [cropRows, expenseRows, saleRows] = await Promise.all([
        readAll<Crop>(crops()),
        readAll<Expense>(expenses()),
        readAll<Sale>(sales()),
      ])
      // Only expenses that claim a photo are asked for one, so an ordinary
      // export costs one read per expense that actually has receipts rather
      // than one per expense.
      const photos = await Promise.all(
        expenseRows
          .filter((e) => (e.receiptCount ?? 0) > 0)
          .map(async (e) =>
            (await getDocs(receipts(e.id))).docs.map((d) =>
              fromStored(d.data() as StoredReceipt)
            )
          )
      )
      return {
        crops: cropRows,
        expenses: expenseRows,
        sales: saleRows,
        receipts: photos.flat(),
      }
    },

    /**
     * Replaces the account's whole ledger, then its photos.
     *
     * Split in two the same way the local implementation is, and for the same
     * reason: the ledger is the irreplaceable part, so it commits on its own
     * and stays committed. A photo that will not store is reported back, not
     * allowed to take the restore down with it.
     */
    async replaceAll(payload) {
      const existing = await Promise.all([
        getDocs(crops()),
        getDocs(expenses()),
        getDocs(sales()),
      ])
      const oldPhotos = await Promise.all(
        existing[1].docs.map(async (d) => ({
          expenseId: d.id,
          ids: await receiptIds(d.id),
        }))
      )

      const batch = batchWriter(db)
      for (const snapshot of existing) {
        for (const d of snapshot.docs) batch.delete(d.ref)
      }
      for (const crop of payload.crops) {
        batch.set(doc(crops(), crop.id), clean(crop))
      }
      for (const expense of payload.expenses) {
        batch.set(doc(expenses(), expense.id), clean(expense))
      }
      for (const sale of payload.sales) {
        batch.set(doc(sales(), sale.id), clean(sale))
      }
      await batch.commit()

      try {
        // Old photos go first: their expenses have just been replaced, and a
        // receipt whose expense is gone can never be reached again.
        for (const { expenseId, ids } of oldPhotos) {
          for (const id of ids) await deleteDoc(doc(receipts(expenseId), id))
        }
        for (const receipt of payload.receipts) {
          const { bytes, mimeType } = await receiptBytes(
            receipt.image,
            receipt.mimeType
          )
          await setDoc(
            doc(receipts(receipt.expenseId), receipt.id),
            toStored(receipt, bytes, mimeType)
          )
        }
        return { photosFailed: 0 }
      } catch {
        return { photosFailed: payload.receipts.length }
      }
    },
  }
}
