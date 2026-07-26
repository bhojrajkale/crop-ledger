import { useEffect, useState } from 'react'

/**
 * Turns a Blob into a URL an <img> can render, and revokes it afterwards.
 *
 * Object URLs pin the whole blob in memory until revoked, so a receipt list
 * that forgot to clean up would hold every photo it had ever shown — which on
 * a phone is a quick route to the tab being killed.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  return url
}
