import { useEffect, useState } from 'react'
import type { Receipt } from '../domain/types'

/**
 * Turns a receipt's stored bytes into a URL an <img> can render, and revokes
 * it afterwards.
 *
 * The Blob is built here, at the last possible moment, and never goes near
 * storage — see Receipt.image for why. Object URLs pin the whole blob in
 * memory until revoked, so a receipt list that forgot to clean up would hold
 * every photo it had ever shown, which on a phone is a quick route to the tab
 * being killed.
 */
export function useReceiptUrl(receipt: Receipt | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!receipt) {
      setUrl(null)
      return
    }
    const blob = new Blob([receipt.image], {
      type: receipt.mimeType || 'image/jpeg',
    })
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [receipt])

  return url
}
