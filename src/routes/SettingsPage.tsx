import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { downloadBackup } from '../data/backup'
import { pluralize } from '../lib/format'
import { buildDate, versionLabel } from '../lib/version'

export function SettingsPage() {
  const exportBackup = useLedgerStore((s) => s.exportBackup)
  const importBackup = useLedgerStore((s) => s.importBackup)
  const crops = useLedgerStore((s) => s.crops)
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string>()

  /**
   * Asks the service worker to re-check for a new build. If one exists, the
   * UpdatePrompt appears on its own; this only reports back when there is
   * nothing new, so "I checked and I am current" is a distinguishable answer
   * from "nothing happened".
   */
  const checkForUpdate = async () => {
    setUpdateStatus('Checking…')
    if (!('serviceWorker' in navigator)) {
      setUpdateStatus('This browser cannot check automatically — just reload.')
      return
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        setUpdateStatus('No offline copy is installed yet, so you are current.')
        return
      }
      await registration.update()
      setUpdateStatus(
        registration.waiting
          ? 'An update is ready — see the prompt at the bottom.'
          : 'You are on the latest version.'
      )
    } catch {
      setUpdateStatus('Could not check right now. Try again when online.')
    }
  }

  const onExport = async () => {
    try {
      downloadBackup(await exportBackup())
      setStatus({ ok: true, text: 'Backup downloaded.' })
    } catch {
      setStatus({ ok: false, text: 'Could not create the backup file.' })
    }
  }

  const onImport = async (file: File) => {
    const result = await importBackup(await file.text())
    setStatus(
      result.ok
        ? {
            ok: true,
            text: `Restored ${pluralize(result.crops, 'crop')} and ${pluralize(
              result.expenses,
              'expense'
            )}.`,
          }
        : { ok: false, text: result.error }
    )
    // Reset so re-picking the same file fires change again.
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link
        to="/"
        className="text-sm text-[var(--muted)] inline-block mb-3 active:scale-95 transition-transform"
      >
        ← All crops
      </Link>
      <h1 className="text-2xl font-bold text-[var(--ink)] mb-1 pr-12">
        Backup &amp; restore
      </h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        Everything is stored on this device only. Nothing is uploaded anywhere,
        and nothing syncs — so a backup file is the only copy that survives
        clearing your browser data or switching phones.
      </p>

      {status ? (
        <div
          role="status"
          className="rounded-xl px-4 py-3 text-sm mb-4"
          style={{
            backgroundColor: status.ok
              ? 'var(--positive-tint)'
              : 'var(--negative-tint)',
            color: status.ok ? 'var(--positive)' : 'var(--negative)',
          }}
        >
          {status.text}
        </div>
      ) : null}

      <SectionTitle>Export</SectionTitle>
      <Card className="mb-6">
        <p className="text-sm text-[var(--muted)] mb-3">
          Saves {pluralize(crops.length, 'crop')} and all their expenses as a
          JSON file. Keep it somewhere safe — email it to yourself, or drop it
          in cloud storage.
        </p>
        <Button variant="primary" onClick={() => void onExport()}>
          Download backup
        </Button>
      </Card>

      <SectionTitle>Import</SectionTitle>
      <Card>
        <p className="text-sm text-[var(--muted)] mb-3">
          Restores from a backup file.{' '}
          <strong className="text-[var(--ink)] font-medium">
            This replaces everything currently on this device
          </strong>{' '}
          — export first if you have data here you want to keep.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onImport(file)
          }}
        />
        <Button onClick={() => fileInput.current?.click()}>
          Choose backup file
        </Button>
      </Card>

      <div className="mt-6" />
      <SectionTitle>Version</SectionTitle>
      <Card className="mt-0">
        <p className="font-medium text-[var(--ink)]">{versionLabel()}</p>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Built {buildDate()}
        </p>
        <p className="text-sm text-[var(--muted)] mt-3">
          The app keeps a copy of itself on your device so it works offline, so
          a new version can take a moment to arrive. Check here if you are
          expecting a change and cannot see it.
        </p>
        <Button className="mt-3" onClick={() => void checkForUpdate()}>
          Check for updates
        </Button>
        {updateStatus ? (
          <p role="status" className="text-sm text-[var(--muted)] mt-2">
            {updateStatus}
          </p>
        ) : null}
      </Card>
    </main>
  )
}
