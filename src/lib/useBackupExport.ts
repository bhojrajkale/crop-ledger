import { useCallback, useState } from 'react'
import { useLedgerStore } from '../store/useLedgerStore'
import {
  backupFilename,
  downloadBackup,
  serialiseBackup,
} from '../data/backup'
import { canShareBackup, shareBackup } from './share'
import { useT } from '../i18n'

/** null means "say nothing" — used when the user dismisses the share sheet. */
export type ExportOutcome = { ok: boolean; text: string } | null

/**
 * The share/download behaviour, in one place because it is offered from two:
 * the header button and the Backup & restore screen. The fallback rules are
 * fiddly enough (see share.ts) that two copies would drift.
 */
export function useBackupExport() {
  const exportBackup = useLedgerStore((s) => s.exportBackup)
  const t = useT()
  // Probed once: a Share button the platform will refuse is worse than none.
  const [canShare] = useState(() => canShareBackup())
  const [busy, setBusy] = useState(false)

  const download = useCallback(async (): Promise<ExportOutcome> => {
    setBusy(true)
    try {
      downloadBackup(await exportBackup())
      return { ok: true, text: t('backupDownloaded') }
    } catch {
      return { ok: false, text: t('backupFailed') }
    } finally {
      setBusy(false)
    }
  }, [exportBackup, t])

  const share = useCallback(async (): Promise<ExportOutcome> => {
    setBusy(true)
    try {
      const backup = await exportBackup()
      const outcome = await shareBackup(serialiseBackup(backup), backupFilename())
      if (outcome === 'shared') return { ok: true, text: t('backupShared') }
      // Dismissing the sheet is a choice, not a failure.
      if (outcome === 'cancelled') return null
      // Never leave the user with nothing: hand them the file the ordinary
      // way and say what happened.
      downloadBackup(backup)
      return { ok: true, text: t('sharedInsteadDownloaded') }
    } catch {
      return { ok: false, text: t('backupFailed') }
    } finally {
      setBusy(false)
    }
  }, [exportBackup, t])

  return { canShare, busy, share, download }
}
