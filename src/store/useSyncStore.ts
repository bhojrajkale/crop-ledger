import { create } from 'zustand'
import { dexieRepository } from '../data/repository'
import type { UploadSummary } from '../data/cloudSync'
import { useLedgerStore } from './useLedgerStore'

/**
 * How far along the connection to a signed-in account is.
 *
 * `uploading` exists as its own state because the first sign-in on a device
 * that already holds a season of expenses is not instant, and a spinner with
 * no explanation during it would look like the app had lost the data.
 */
export type SyncStatus =
  | 'offline' // no account — the ledger is this device's own
  | 'connecting'
  | 'uploading'
  | 'ready'
  | 'error'

interface SyncState {
  status: SyncStatus
  /** Set once, after a first sign-in that moved this device's ledger up. */
  uploaded: UploadSummary | null
  /**
   * True when the account already held a ledger and this device's local copy
   * was therefore left alone. Worth saying out loud — otherwise the user sees
   * the wrong data and has no idea why.
   */
  localCopyKept: boolean

  connect: (uid: string) => Promise<void>
  disconnect: () => Promise<void>
  dismissNotice: () => void
}

/**
 * The account currently wired up. Guards against connecting twice for the
 * same uid — React's development double-invoked effects would otherwise run
 * the first-sign-in upload concurrently with itself, and the second run could
 * read the account as still empty and replace what the first had just
 * written.
 */
let connectedUid: string | null = null

export const useSyncStore = create<SyncState>((set) => ({
  status: 'offline',
  uploaded: null,
  localCopyKept: false,

  async connect(uid) {
    if (connectedUid === uid) return
    connectedUid = uid
    set({ status: 'connecting', uploaded: null, localCopyKept: false })
    try {
      // Dynamic, so the Firestore SDK is fetched only once somebody actually
      // signs in — the app's first paint never waits on it.
      const [{ cloudRepository }, { uploadLocalLedger }] = await Promise.all([
        import('../data/cloudRepository'),
        import('../data/cloudSync'),
      ])
      const cloud = cloudRepository(uid, {
        // Writes resolve as soon as they are safe on the device, so a genuine
        // server rejection lands here — long after the tap, with nothing on
        // screen still waiting for it. Surfacing it late is far better than
        // not at all: the user's copy and the account's would otherwise
        // disagree silently.
        onWriteError: () => useLedgerStore.getState().reportSyncFailure(),
      })

      set({ status: 'uploading' })
      const result = await uploadLocalLedger(dexieRepository, cloud)

      await useLedgerStore.getState().setRepository(cloud, 'cloud')
      set({
        status: 'ready',
        uploaded: result.decision === 'upload' ? result.summary : null,
        localCopyKept: result.decision === 'skip',
      })
    } catch {
      // Fall back to the device's own copy rather than leaving the user
      // staring at nothing: an unreachable cloud must not cost them access to
      // the ledger they already have.
      connectedUid = null
      await useLedgerStore.getState().setRepository(dexieRepository, 'local')
      set({ status: 'error' })
    }
  },

  async disconnect() {
    // Already on the device's own copy — nothing to tear down, and reloading
    // for a sign-out that never happened would blank the screen on launch.
    if (connectedUid === null) return
    connectedUid = null
    await useLedgerStore.getState().setRepository(dexieRepository, 'local')
    set({ status: 'offline', uploaded: null, localCopyKept: false })
  },

  dismissNotice: () => set({ uploaded: null, localCopyKept: false }),
}))
