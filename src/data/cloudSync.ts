import type { BackupPayload, CropRepository } from './repository'

/**
 * What to do with a device's local ledger the first time an account signs in
 * on it.
 *
 * - `upload` — the cloud account is empty and this device holds the only
 *   copy. This is the case that matters: it is how a ledger built up on a
 *   phone before sync existed gets to the cloud without the user having to
 *   export and re-import a file.
 * - `skip` — both sides hold data. Deliberately does nothing. Merging two
 *   ledgers cannot be done safely without knowing which edit came later, and
 *   ids collide by design (the same crop exported and restored keeps its id),
 *   so an automatic merge would either duplicate entries or silently
 *   overwrite the newer side. The user is told instead, and can restore a
 *   backup file if this device's copy is the one they want.
 * - `nothing` — no local data, so there is nothing to decide.
 */
export type UploadDecision = 'upload' | 'skip' | 'nothing'

export function decideUpload(
  localCrops: number,
  cloudCrops: number
): UploadDecision {
  if (localCrops === 0) return 'nothing'
  return cloudCrops === 0 ? 'upload' : 'skip'
}

export interface UploadSummary {
  crops: number
  expenses: number
  sales: number
  photos: number
  photosFailed: number
}

export function summarise(
  payload: BackupPayload,
  photosFailed: number
): UploadSummary {
  return {
    crops: payload.crops.length,
    expenses: payload.expenses.length,
    sales: payload.sales.length,
    photos: payload.receipts.length,
    photosFailed,
  }
}

/**
 * Copies this device's ledger into the signed-in account, if the account is
 * empty and the device is not.
 *
 * The local copy is never deleted. It costs nothing to keep, and it is the
 * only thing standing between the user and an empty screen if the upload
 * turns out to have gone somewhere they did not expect. Backup & restore
 * remains the way to move data deliberately.
 */
export async function uploadLocalLedger(
  local: CropRepository,
  cloud: CropRepository
): Promise<
  | { decision: 'nothing' | 'skip' }
  | { decision: 'upload'; summary: UploadSummary }
> {
  const [localCrops, cloudCrops] = await Promise.all([
    local.listCrops(),
    cloud.listCrops(),
  ])

  const decision = decideUpload(localCrops.length, cloudCrops.length)
  if (decision !== 'upload') return { decision }

  const payload = await local.exportAll()
  const { photosFailed } = await cloud.replaceAll(payload)
  return { decision, summary: summarise(payload, photosFailed) }
}
