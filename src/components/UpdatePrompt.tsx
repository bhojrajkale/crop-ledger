import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui/Button'

/** How often to ask the server whether a new build exists. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const check = async () => {
        // Don't bother while offline — a failed check just logs noise, and
        // the next foreground event will retry anyway.
        if (!navigator.onLine) return
        try {
          await registration.update()
        } catch {
          // A failed update check is not worth surfacing; the app keeps
          // working on the version it already has.
        }
      }

      void check()
      setInterval(check, CHECK_INTERVAL_MS)

      // Coming back to the app is the moment a stale build is most likely and
      // most annoying — an installed PWA can sit backgrounded for days.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void check()
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-[300] mx-auto max-w-md rounded-2xl border border-[var(--primary-border)] bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg"
    >
      <p className="font-semibold text-[var(--ink)]">Update available</p>
      <p className="mt-0.5 text-sm text-[var(--muted)]">
        A newer version of Crop Ledger is ready. Your data stays as it is.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          fullWidth
          onClick={() => void updateServiceWorker(true)}
        >
          Reload now
        </Button>
        <Button onClick={() => setNeedRefresh(false)}>Later</Button>
      </div>
    </div>
  )
}
