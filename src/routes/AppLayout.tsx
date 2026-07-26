import { useEffect, useLayoutEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme'
import { UpdatePrompt } from '../components/UpdatePrompt'

export function AppLayout() {
  const load = useLedgerStore((s) => s.load)
  const error = useLedgerStore((s) => s.error)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

  // Before paint, so the app never flashes light before switching to dark.
  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    void load()
  }, [load])

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
  // Absolute rather than fixed: a fixed toggle sits on top of the sticky tab
  // bar once the page scrolls. Scrolling away with the header is the better
  // trade for a control this rarely used.
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-30 size-9 rounded-full bg-[var(--surface)] border border-[var(--hairline)] text-base active:scale-95 transition-transform"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
