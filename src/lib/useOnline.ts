import { useEffect, useState } from 'react'

/**
 * Whether the browser currently thinks it has a connection.
 *
 * `navigator.onLine` is only as good as the OS's own guess — it says true on
 * a wifi network with no route out, which is a normal state on a farm. So it
 * is worth showing "your changes are saved here and will sync" rather than
 * "you are offline": the first is true either way, and the second can be a
 * lie in the direction that matters.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    // Re-check on mount: the events only fire on a change, and the app may
    // have been launched while already offline.
    update()
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online
}
