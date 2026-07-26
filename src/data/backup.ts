import type { Crop, Expense, Sale } from '../domain/types'
import type { BackupPayload } from './repository'

export const BACKUP_VERSION = 1

export interface BackupFile extends BackupPayload {
  app: 'crop-ledger'
  version: number
  exportedAt: string
}

export function buildBackup(payload: BackupPayload): BackupFile {
  return {
    app: 'crop-ledger',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...payload,
  }
}

export function backupFilename(now = new Date()): string {
  return `crop-ledger-backup-${now.toISOString().slice(0, 10)}.json`
}

export type ParseResult =
  | { ok: true; payload: BackupPayload; crops: number; expenses: number }
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

function isExpense(value: unknown): value is Expense {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.cropId) &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    isString(value.paidBy) &&
    Array.isArray(value.owedBy)
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
export function parseBackup(text: string): ParseResult {
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

  return {
    ok: true,
    payload: { crops, expenses, sales },
    crops: crops.length,
    expenses: expenses.length,
  }
}

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupFilename()
  link.click()
  URL.revokeObjectURL(url)
}
