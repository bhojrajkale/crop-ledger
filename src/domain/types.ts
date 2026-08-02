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

/**
 * Money actually handed over towards an expense. An expense carries a list of
 * these rather than a single payer, because farm costs are routinely bought on
 * credit: some cash at the shop now, the rest as "baaki" cleared weeks later,
 * possibly by a different member and possibly in instalments.
 *
 * No payments at all means the whole amount is still outstanding.
 */
export interface Payment {
  id: string
  memberId: string
  amount: Paise
  paidAt: string // ISO yyyy-mm-dd
}

export interface Expense {
  id: string
  /** The full cost, whether or not it has been paid yet. */
  amount: Paise
  cropId: string
  category: CategoryId
  /** Display name when category === 'custom'. */
  customCategory?: string
  date: string // ISO yyyy-mm-dd
  notes: string

  /**
   * What has actually been paid, and by whom. Empty ⇒ wholly on credit.
   * The shortfall against `amount` is owed outside the group (to a shop or
   * contractor), which is a different kind of debt from one member owing
   * another — see computeOutstanding vs computeBalances.
   */
  payments: Payment[]
  /** Who the unpaid balance is owed to — a shop, dealer, labour contractor. */
  owedTo?: string
  /**
   * How many receipt photos are attached. Only a count lives here: the images
   * themselves are in a separate store, because every screen that lists
   * expenses reads these rows and must never drag megabytes of photo along.
   */
  receiptCount?: number
  /**
   * Members the cost belongs to. Deliberately independent of who paid, which
   * is what lets one mechanism cover every case the app must support:
   *   - paid by one, shared by several  → several ids here
   *   - paid by one, owed wholly by another → exactly one id, not the payer
   *   - nobody paid yet → the split still applies, there is just no credit
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
 * A photo of a bill, stored in its own table keyed by `expenseId` rather than
 * on the expense row. Expenses are read in bulk on every list render; photos
 * are read only when someone actually opens one, so keeping them apart is
 * what stops a season of receipts from making the app crawl.
 */
export interface Receipt {
  id: string
  expenseId: string
  /**
   * Raw JPEG bytes, already scaled down by compressImage().
   *
   * Deliberately an ArrayBuffer rather than a Blob. iOS Safari fails to put
   * a Blob built from raw bytes into IndexedDB — "Error preparing Blob/File
   * data to be stored in object store" — which broke restoring a backup on
   * a phone. (A Blob straight from canvas.toBlob() happens to survive, which
   * is why capturing a photo worked while importing one did not.) ArrayBuffer
   * is plainly structured-cloneable and stores reliably everywhere, so the
   * bytes are the stored form and a Blob is rebuilt only for display.
   */
  image: ArrayBuffer
  mimeType: string
  width: number
  height: number
  addedAt: string // ISO timestamp
}

/** The pre-fix shape, still on devices that stored photos before. */
export interface LegacyBlobReceipt extends Omit<Receipt, 'image' | 'mimeType'> {
  image: Blob
  mimeType?: string
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

/**
 * Money one member actually handed to another to square up — the transfer
 * above, once it has really happened.
 *
 * This is the only movement in the ledger that is purely between members, and
 * that is what makes it simple: it settles nothing with the outside world, so
 * `computeOutstanding()` must never see it. A shop is still owed exactly what
 * it was owed before.
 *
 * Arithmetically it is a symmetric pair — the payer is credited, the receiver
 * debited, by the same amount — so the zero-sum invariant holds by
 * construction rather than by care.
 */
export interface Settlement {
  id: string
  cropId: string
  /** Member who handed the money over. */
  from: string
  /** Member who received it. */
  to: string
  amount: Paise
  date: string // ISO yyyy-mm-dd
  note?: string
  createdAt: string // ISO timestamp
}
