import { useEffect, useLayoutEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme'
import { UpdatePrompt } from '../components/UpdatePrompt'
import { useBackupExport, type ExportOutcome } from '../lib/useBackupExport'
import { useLanguage, useT } from '../i18n'

export function AppLayout() {
  const load = useLedgerStore((s) => s.load)
  const language = useLanguage()
  const error = useLedgerStore((s) => s.error)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())
  const [notice, setNotice] = useState<ExportOutcome>(null)

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
          {error}
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
