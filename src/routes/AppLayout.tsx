import { useEffect, useLayoutEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme'
import { UpdatePrompt } from '../components/UpdatePrompt'
import { useLanguage, useT } from '../i18n'

export function AppLayout() {
  const load = useLedgerStore((s) => s.load)
  const language = useLanguage()
  const error = useLedgerStore((s) => s.error)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

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

  return (
    <div className="relative min-h-dvh bg-[var(--bg)]">
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
      <UpdatePrompt />
    </div>
  )
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme
  onToggle: () => void
}) {
  const t = useT()
  // Absolute rather than fixed: a fixed toggle sits on top of the sticky tab
  // bar once the page scrolls. Scrolling away with the header is the better
  // trade for a control this rarely used.
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
      className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-30 size-9 rounded-full bg-[var(--surface)] border border-[var(--hairline)] text-base active:scale-95 transition-transform"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
