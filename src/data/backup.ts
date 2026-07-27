import type { Crop, Expense, Receipt, Sale } from '../domain/types'
import type { BackupPayload } from './repository'
import { migrateExpense } from './migrate'
import { bytesToDataUrl, dataUrlToBytes } from '../lib/image'

// v2 added receipt photos. Version 1 files still import — only a *newer*
// version than we understand is refused.
export const BACKUP_VERSION = 2

/** A receipt as it travels in JSON: the bytes become a base64 data URL. */
interface SerialisedReceipt extends Omit<Receipt, 'image' | 'mimeType'> {
  image: string
  mimeType?: string
}

export interface BackupFile extends Omit<BackupPayload, 'receipts'> {
  app: 'crop-ledger'
  version: number
  exportedAt: string
  receipts: SerialisedReceipt[]
}

export async function buildBackup(payload: BackupPayload): Promise<BackupFile> {
  const receipts = payload.receipts.map((receipt) => ({
    ...receipt,
    image: bytesToDataUrl(receipt.image, receipt.mimeType),
  }))
  return {
    app: 'crop-ledger',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    crops: payload.crops,
    expenses: payload.expenses,
    sales: payload.sales,
    receipts,
  }
}

export function backupFilename(now = new Date()): string {
  return `crop-ledger-backup-${now.toISOString().slice(0, 10)}.json`
}

export type ParseResult =
  | {
      ok: true
      payload: BackupPayload
      crops: number
      expenses: number
      receipts: number
    }
  | { ok: false; error: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isString = (v: unknown): v is string => typeof v === 'string'

function isCrop(value: unknown): value is Crop {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.name) &&
    Array.isArray(value.members)
  )
}

/**
 * Accepts both shapes: current expenses carry a `payments` array, while
 * backups taken before credit tracking existed carry a single `paidBy`.
 * Either is valid input — migrateExpense() normalises them on the way in.
 */
function isExpense(value: unknown): value is Expense {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.cropId) &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    (Array.isArray(value.payments) || isString(value.paidBy)) &&
    Array.isArray(value.owedBy)
  )
}

function isSerialisedReceipt(value: unknown): value is SerialisedReceipt {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.expenseId) &&
    isString(value.image) &&
    value.image.startsWith('data:')
  )
}

function isSale(value: unknown): value is Sale {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.cropId) &&
    typeof value.total === 'number'
  )
}

/**
 * Validates a backup file before it is allowed anywhere near the database.
 * Importing replaces everything, so a truncated or wrong-app file that got
 * halfway in would destroy the only copy of the data — this refuses the whole
 * file instead of partially applying it.
 */
export async function parseBackup(text: string): Promise<ParseResult> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: "That file isn't valid JSON." }
  }

  if (!isObject(data)) {
    return { ok: false, error: "That file isn't a Crop Ledger backup." }
  }

  if (data.app !== 'crop-ledger') {
    return {
      ok: false,
      error: "That file isn't a Crop Ledger backup.",
    }
  }

  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return {
      ok: false,
      error:
        'That backup was made by a newer version of Crop Ledger. Update the app first.',
    }
  }

  if (!Array.isArray(data.crops) || !Array.isArray(data.expenses)) {
    return { ok: false, error: 'That backup is missing its crops or expenses.' }
  }

  const crops = data.crops.filter(isCrop)
  const expenses = data.expenses.filter(isExpense)
  const sales = Array.isArray(data.sales) ? data.sales.filter(isSale) : []

  if (crops.length !== data.crops.length || expenses.length !== data.expenses.length) {
    return {
      ok: false,
      error: 'That backup contains damaged records, so it was not imported.',
    }
  }

  const rawReceipts = Array.isArray(data.receipts) ? data.receipts : []
  const serialised = rawReceipts.filter(isSerialisedReceipt)
  if (serialised.length !== rawReceipts.length) {
    return {
      ok: false,
      error: 'That backup contains damaged photos, so it was not imported.',
    }
  }

  let receipts: Receipt[]
  try {
    receipts = serialised.map((receipt) => {
      const { bytes, mimeType } = dataUrlToBytes(receipt.image)
      return { ...receipt, image: bytes, mimeType }
    })
  } catch {
    return {
      ok: false,
      error: 'The photos in that backup could not be read, so nothing was imported.',
    }
  }

  return {
    ok: true,
    // Normalise on the way in, so a backup taken before credit tracking
    // existed restores as ordinary fully-paid expenses rather than landing
    // in the database in a shape the rest of the app no longer understands.
    payload: { crops, expenses: expenses.map(migrateExpense), sales, receipts },
    crops: crops.length,
    expenses: expenses.length,
    receipts: receipts.length,
  }
}

/** The exact bytes written to disk, shared by the download and share paths. */
export function serialiseBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([serialiseBackup(backup)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupFilename()
  link.click()
  URL.revokeObjectURL(url)
}
