import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Card, SectionTitle } from '../components/ui/Card'
import { downloadBackup } from '../data/backup'
import { buildDate, versionLabel } from '../lib/version'
import { Chip } from '../components/ui/Chip'
import {
  LANGUAGES,
  intlLocale,
  useLanguage,
  useLanguageStore,
  useT,
} from '../i18n'

export function SettingsPage() {
  const exportBackup = useLedgerStore((s) => s.exportBackup)
  const importBackup = useLedgerStore((s) => s.importBackup)
  const crops = useLedgerStore((s) => s.crops)
  const fileInput = useRef<HTMLInputElement>(null)
  const t = useT()
  const language = useLanguage()
  const setLanguage = useLanguageStore((s) => s.setLanguage)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string>()

  /**
   * Asks the service worker to re-check for a new build. If one exists, the
   * UpdatePrompt appears on its own; this only reports back when there is
   * nothing new, so "I checked and I am current" is a distinguishable answer
   * from "nothing happened".
   */
  const checkForUpdate = async () => {
    setUpdateStatus(t('checking'))
    if (!('serviceWorker' in navigator)) {
      setUpdateStatus(t('noServiceWorker'))
      return
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        setUpdateStatus(t('noOfflineCopy'))
        return
      }
      await registration.update()
      setUpdateStatus(
        registration.waiting ? t('updateReady') : t('upToDate')
      )
    } catch {
      setUpdateStatus(t('checkFailed'))
    }
  }

  const onExport = async () => {
    try {
      downloadBackup(await exportBackup())
      setStatus({ ok: true, text: t('backupDownloaded') })
    } catch {
      setStatus({ ok: false, text: t('backupFailed') })
    }
  }

  const onImport = async (file: File) => {
    const result = await importBackup(await file.text())
    setStatus(
      result.ok
        ? {
            ok: true,
            text:
              t('restored', {
                crops: t('crops', { count: result.crops }),
                expenses: t('expenses', { count: result.expenses }),
                photos:
                  result.receipts > 0 && result.photosFailed === 0
                    ? t('restoredPhotos', {
                        photos: t('photos', { count: result.receipts }),
                      })
                    : '',
              }) +
              // The ledger is safe either way; say so plainly rather than
              // letting a photo problem read as a failed restore.
              (result.photosFailed > 0
                ? ` ${t('photosNotRestored', {
                    photos: t('photos', { count: result.photosFailed }),
                  })}`
                : ''),
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
        {t('allCrops')}
      </Link>
      <h1 className="text-2xl font-bold text-[var(--ink)] mb-1 pr-12">
        {t('backupAndRestore')}
      </h1>
      <p className="text-sm text-[var(--muted)] mb-6">{t('backupIntro')}</p>

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

      <SectionTitle>{t('language')}</SectionTitle>
      <Card className="mb-6">
        <p className="text-sm text-[var(--muted)] mb-3">{t('languageBody')}</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((option) => (
            <Chip
              key={option.code}
              selected={language === option.code}
              onClick={() => setLanguage(option.code)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </Card>

      <SectionTitle>{t('export')}</SectionTitle>
      <Card className="mb-6">
        <p className="text-sm text-[var(--muted)] mb-3">
          {t('exportBody', { crops: t('crops', { count: crops.length }) })}
        </p>
        <Button variant="primary" onClick={() => void onExport()}>
          {t('downloadBackup')}
        </Button>
      </Card>

      <SectionTitle>{t('import')}</SectionTitle>
      <Card>
        <p className="text-sm text-[var(--muted)] mb-3">
          {t('importBody1')}{' '}
          <strong className="text-[var(--ink)] font-medium">
            {t('importBodyEmphasis')}
          </strong>{' '}
          {t('importBody2')}
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
          {t('chooseBackupFile')}
        </Button>
      </Card>

      <div className="mt-6" />
      <SectionTitle>{t('version')}</SectionTitle>
      <Card className="mt-0">
        <p className="font-medium text-[var(--ink)]">{versionLabel()}</p>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          {t('builtOn', { date: buildDate(intlLocale(language)) })}
        </p>
        <p className="text-sm text-[var(--muted)] mt-3">
          {t('versionExplainer')}
        </p>
        <Button className="mt-3" onClick={() => void checkForUpdate()}>
          {t('checkForUpdates')}
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
