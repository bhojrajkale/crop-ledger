import Dexie, { type EntityTable } from 'dexie'
import type { Crop, Expense, Sale } from '../domain/types'
import { migrateExpense } from './migrate'

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
    // v2: expenses gained a `payments` list and lost the single `paidBy`, so
    // costs can be recorded on credit and paid off later. The `paidBy` index
    // goes with it. Existing rows are rewritten by the upgrade below —
    // never edit version 1, or devices already holding data will not upgrade.
    this.version(2)
      .stores({
        crops: 'id, name, season, startDate, archived',
        expenses: 'id, cropId, date, category',
        sales: 'id, cropId, date, receivedBy',
      })
      .upgrade((tx) =>
        tx
          .table('expenses')
          .toCollection()
          .modify((expense: Record<string, unknown>) => {
            const migrated = migrateExpense(
              expense as unknown as Parameters<typeof migrateExpense>[0]
            )
            expense.payments = migrated.payments
            delete expense.paidBy
          })
      )
  }
}

export const db = new CropLedgerDB()
