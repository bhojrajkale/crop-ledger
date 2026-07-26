import Dexie, { type EntityTable } from 'dexie'
import type { Crop, Expense, Sale } from '../domain/types'

/**
 * IndexedDB rather than localStorage: no practical size ceiling, structured
 * values instead of hand-parsed JSON strings, and indexed queries — all of
 * which matter once a few seasons of expenses (and eventually receipt photos)
 * accumulate.
 *
 * The `sales` table ships in version 1 despite being unused in V1. Declaring
 * it now costs nothing and means adding revenue later needs no schema
 * migration on devices that already hold data.
 */
class CropLedgerDB extends Dexie {
  crops!: EntityTable<Crop, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  sales!: EntityTable<Sale, 'id'>

  constructor() {
    super('crop-ledger')
    this.version(1).stores({
      crops: 'id, name, season, startDate, archived',
      expenses: 'id, cropId, date, category, paidBy',
      sales: 'id, cropId, date, receivedBy',
    })
  }
}

export const db = new CropLedgerDB()
