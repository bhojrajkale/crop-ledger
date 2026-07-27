/**
 * Handing the backup to the OS share sheet, so on a phone it can go straight
 * to iCloud Drive, WhatsApp or email instead of landing in Downloads where it
 * is easy to lose track of.
 */

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported'

/**
 * Safari restricts which file types the share sheet will accept, and JSON is
 * not reliably among them. When the real type is refused we retry as plain
 * text: the filename still ends in .json, so Files saves it under the right
 * name and it imports back cleanly — only the type advertised to the sheet
 * differs. If neither is allowed, callers fall back to a normal download.
 */
const TYPES = ['application/json', 'text/plain']

function canShareType(type: string): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    const probe = new File(['{}'], 'probe.json', { type })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/** The type the share sheet will take, or null if it will not take a file. */
export function shareableType(): string | null {
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

  try {
    await navigator.share({
      files: [new File([contents], filename, { type })],
      title: filename,
    })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled'
    }
    return 'unsupported'
  }
}
