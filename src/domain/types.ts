// Pure domain types. Nothing in src/domain imports React or Dexie — this
// layer is plain data and arithmetic so it can be unit-tested directly and
// so the storage backend stays swappable.

/**
 * Every money value in this app is an integer count of paise, never a float
 * of rupees. Dividing ₹100 three ways and adding it back must land on exactly
 * ₹100; binary floats do not guarantee that, and a ledger that drifts by a
 * paisa per split is a bug that only shows up after a season of entries.
 */
export type Paise = number

export type CategoryId =
  | 'seeds'
  | 'fertilizer'
  | 'labour'
  | 'machinery'
  | 'irrigation'
  | 'transport'
  | 'land'
  | 'custom'

export interface Member {
  id: string
  name: string
  phone?: string
}

export interface Crop {
  id: string
  /** e.g. "Cotton" */
  name: string
  /** Free text, e.g. "Kharif 2026" — lets the same crop repeat across years. */
  season: string
  startDate: string // ISO yyyy-mm-dd
  endDate?: string
  members: Member[]
  archived?: boolean
  createdAt: string // ISO timestamp
}

/** One member's share of an expense, in paise. Only used for custom splits. */
export interface SplitAmount {
  memberId: string
  amount: Paise
}

export interface Expense {
  id: string
  cropId: string
  amount: Paise
  category: CategoryId
  /** Display name when category === 'custom'. */
  customCategory?: string
  date: string // ISO yyyy-mm-dd
  notes: string

  /** Member who actually handed over the money. */
  paidBy: string
  /**
   * Members the cost belongs to. Deliberately independent of `paidBy`, which
   * is what lets one mechanism cover both cases the app must support:
   *   - paid by one, shared by several  → several ids here
   *   - paid by one, owed wholly by another → exactly one id, not the payer
   */
  owedBy: string[]
  /**
   * Present ⇒ custom per-member amounts, and these are authoritative.
   * Absent ⇒ split `amount` equally across `owedBy`.
   */
  splitAmounts?: SplitAmount[]

  createdAt: string // ISO timestamp
}

/**
 * A harvest sale. Not surfaced in V1 — declared now so the storage schema and
 * the settlement engine are already shaped for it and V2 is purely additive.
 * Arithmetically a sale is an inverted expense: the member who collected the
 * cash is debited the total, and every member is credited an equal share.
 */
export interface Sale {
  id: string
  cropId: string
  /** Member who collected the money. */
  receivedBy: string
  quantity: number
  unit: string // e.g. "quintal"
  rate: Paise // per unit
  total: Paise
  date: string // ISO yyyy-mm-dd
  buyer?: string
  notes?: string
  createdAt: string // ISO timestamp
}

/** A single "X pays Y" transfer produced by the settlement engine. */
export interface Transfer {
  from: string // member id
  to: string // member id
  amount: Paise
}
