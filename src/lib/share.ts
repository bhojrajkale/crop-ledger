/**
 * Handing the backup to the OS share sheet, so on a phone it can go straight
 * to iCloud Drive, WhatsApp or email instead of landing in Downloads where it
 * is easy to lose track of.
 */

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported'

/**
 * Safari restricts which file types the share sheet will accept, and JSON is
 * not reliably among them, so plain text is the fallback.
 *
 * The extension follows the type rather than staying .json. iOS derives a
 * file's identity from its MIME type, and an item declared text/plain but
 * named .json is a mismatch it can present as loose text rather than a
 * document — which is exactly when "Save to Files", and so iCloud Drive,
 * drops out of the sheet. Importing accepts both extensions, so a .txt
 * backup restores just as well.
 */
const TYPES: { mime: string; extension: string }[] = [
  { mime: 'application/json', extension: '.json' },
  { mime: 'text/plain', extension: '.txt' },
]

function canShareType({ mime, extension }: { mime: string; extension: string }) {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    const probe = new File(['{}'], `probe${extension}`, { type: mime })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/** The type and extension the share sheet will take, or null if none. */
export function shareableType(): { mime: string; extension: string } | null {
  return TYPES.find(canShareType) ?? null
}

export function canShareBackup(): boolean {
  return shareableType() !== null
}

/**
 * Opens the share sheet with the backup.
 *
 * Returns 'cancelled' when the user dismisses the sheet — that is a normal
 * choice, not a failure, and must not be reported as an error. Returns
 * 'unsupported' when sharing is unavailable *or* when the browser refuses
 * because the user gesture was lost while the file was being prepared, which
 * Safari does if assembling a large backup takes too long. Either way the
 * caller should fall back to downloading, so the user still gets their file.
 */
export async function shareBackup(
  contents: string,
  filename: string
): Promise<ShareOutcome> {
  const type = shareableType()
  if (!type) return 'unsupported'

  // Rename to match the type actually being shared, so the file iOS hands to
  // Files carries the extension its content really has.
  const named = filename.replace(/\.json$/, type.extension)

  try {
    // Files only — no title or text alongside them. iOS composes a different,
    // message-oriented sheet when a share carries both, and the document
    // actions ("Save to Files") are the ones that get dropped.
    await navigator.share({ files: [new File([contents], named, { type: type.mime })] })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled'
    }
    return 'unsupported'
  }
}
