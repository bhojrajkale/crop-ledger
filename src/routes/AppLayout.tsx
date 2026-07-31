import { useEffect, useLayoutEffect, useState } from 'react'
import { Link, Outlet } from 'react-router'
import { SYNC_FAILED, useLedgerStore } from '../store/useLedgerStore'
import { useAuthStore } from '../store/useAuthStore'
import { useSyncStore, type SyncStatus } from '../store/useSyncStore'
import { useCloudSync } from '../lib/useCloudSync'
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme'
import { UpdatePrompt } from '../components/UpdatePrompt'
import { useBackupExport, type ExportOutcome } from '../lib/useBackupExport'
import { useLanguage, useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'

export function AppLayout() {
  const load = useLedgerStore((s) => s.load)
  const t = useT()
  const language = useLanguage()
  const error = useLedgerStore((s) => s.error)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())
  const [notice, setNotice] = useState<ExportOutcome>(null)

  // Points the ledger at the signed-in account, or at this device when nobody
  // is signed in. It lives here because it has to be running whichever screen
  // the app happens to open on.
  useCloudSync()

  // Before paint, so the app never flashes light before switching to dark.
  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    void load()
  }, [load])

  // Keep the document language in step so screen readers and the browser's
  // own text handling follow the chosen language.
  useEffect(() => {
    document.documentElement.setAttribute('lang', language)
  }, [language])

  // The header notice is transient — it confirms a tap, it is not state the
  // user has to dismiss.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  return (
    <div className="relative min-h-dvh bg-[var(--bg)]">
      <HeaderActions
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onExported={setNotice}
      />
      {error ? (
        <div
          role="alert"
          className="mx-4 mt-4 rounded-xl bg-[var(--negative-tint)] text-[var(--negative)] px-4 py-3 text-sm"
        >
          {error === SYNC_FAILED ? t('syncFailed') : error}
        </div>
      ) : null}
      <Outlet />
      {notice ? (
        <div
          role="status"
          className="fixed inset-x-3 bottom-3 z-[300] mx-auto max-w-md rounded-2xl px-4 py-3 text-sm shadow-lg border"
          style={{
            backgroundColor: notice.ok
              ? 'var(--positive-tint)'
              : 'var(--negative-tint)',
            color: notice.ok ? 'var(--positive)' : 'var(--negative)',
            borderColor: 'var(--hairline)',
          }}
        >
          {notice.text}
        </div>
      ) : null}
      <UpdatePrompt />
    </div>
  )
}

/**
 * Where the ledger is being kept, at a glance, and a way through to do
 * something about it.
 *
 * The state worth catching is `error`: the app has quietly fallen back to
 * this device's own copy, everything still works, and the only sign of it
 * would otherwise be on a screen nobody visits daily.
 */
const CLOUD_ICON: Record<SyncStatus, string> = {
  offline: '☁️',
  connecting: '⏳',
  uploading: '⏳',
  ready: '☁️',
  error: '⚠️',
}

const CLOUD_STATUS_TEXT: Record<SyncStatus, TranslationKey> = {
  offline: 'cloudOfflineStatus',
  connecting: 'cloudConnecting',
  uploading: 'cloudUploading',
  ready: 'cloudReady',
  error: 'cloudErrorStatus',
}

function CloudIndicator() {
  const t = useT()
  const available = useAuthStore((s) => s.available)
  const settled = useAuthStore((s) => s.account) !== undefined
  const status = useSyncStore((s) => s.status)

  // Nothing to say on a build with no project configured, and nothing honest
  // to say before the session check has finished.
  if (!available || !settled) return null

  return (
    <Link
      to="/settings"
      aria-label={t(CLOUD_STATUS_TEXT[status])}
      title={t(CLOUD_STATUS_TEXT[status])}
      className="size-9 rounded-full bg-[var(--surface)] border border-[var(--hairline)] text-base flex items-center justify-center active:scale-95 transition-transform"
      // Signed out, the icon is a prompt rather than a state — dimmed so it
      // does not read as "backed up".
      style={status === 'offline' ? { opacity: 0.45 } : undefined}
    >
      {CLOUD_ICON[status]}
    </Link>
  )
}

/**
 * The controls pinned to the top-right of every screen.
 *
 * Absolute rather than fixed: a fixed row sits on top of the sticky tab bar
 * once the page scrolls. Scrolling away with the header is the better trade
 * for controls used this rarely. Pages reserve space with right padding —
 * widen it here and widen it there too.
 */
function HeaderActions({
  theme,
  onToggleTheme,
  onExported,
}: {
  theme: Theme
  onToggleTheme: () => void
  onExported: (outcome: ExportOutcome) => void
}) {
  const t = useT()
  const { canShare, busy, share } = useBackupExport()

  return (
    <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-30 flex items-center gap-2">
      <CloudIndicator />
      {canShare ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => onExported(await share())}
          aria-label={t('shareBackup')}
          className="size-9 rounded-full bg-[var(--surface)] border border-[var(--hairline)] text-base active:scale-95 transition-transform disabled:opacity-50"
        >
          {busy ? '…' : '📤'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
        className="size-9 rounded-full bg-[var(--surface)] border border-[var(--hairline)] text-base active:scale-95 transition-transform"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  )
}
