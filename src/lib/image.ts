/**
 * Longest edge a stored receipt is scaled down to. Receipts are read, not
 * admired: the numbers on a shop bill have to stay legible, so this is
 * deliberately higher than a thumbnail-grade limit. At this size a typical
 * photo lands around 200–400 KB.
 */
export const MAX_EDGE = 1600
export const JPEG_QUALITY = 0.7

export interface CompressedImage {
  /** Raw JPEG bytes — the form receipts are stored in. See Receipt.image. */
  bytes: ArrayBuffer
  mimeType: string
  width: number
  height: number
}

/**
 * Scales a photo down so its longest edge is at most `maxEdge`, preserving
 * aspect ratio. Images already smaller are left alone rather than upscaled —
 * enlarging cannot add detail and would only inflate storage.
 */
export function targetSize(
  width: number,
  height: number,
  maxEdge = MAX_EDGE
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge || longest === 0) {
    return { width, height }
  }
  const scale = maxEdge / longest
  return {
    // Round to whole pixels, and never round down to zero on an extreme
    // aspect ratio — a zero-width canvas throws.
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Re-encodes a picked photo as a bounded JPEG.
 *
 * Phone cameras produce 3–12 MB files; storing those verbatim would fill the
 * browser's quota within a season, and the quota is shared with the ledger
 * itself. `imageOrientation: 'from-image'` applies the EXIF rotation, without
 * which photos taken in portrait land sideways.
 */
export async function compressImage(
  file: File,
  maxEdge = MAX_EDGE
): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  })

  try {
    const { width, height } = targetSize(bitmap.width, bitmap.height, maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not read that image.')
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob) throw new Error('Could not process that image.')

    // Unwrapped to bytes immediately: a Blob is fine to produce, but must not
    // be what reaches IndexedDB.
    return {
      bytes: await blob.arrayBuffer(),
      mimeType: blob.type || 'image/jpeg',
      width,
      height,
    }
  } finally {
    // Bitmaps hold decoded pixels outside the JS heap; on a phone, leaking a
    // few of these while adding photos is enough to get the tab killed.
    bitmap.close()
  }
}

// String.fromCharCode is applied to slices, not the whole array: spreading a
// few hundred thousand bytes at once overflows the call stack.
const CHUNK = 0x8000

/**
 * Bytes → base64 data URL, for writing photos into the JSON backup file.
 *
 * Deliberately built on atob/btoa rather than FileReader: those exist in both
 * browsers and Node, so this stays directly testable, and the conversion is a
 * plain function instead of a callback wrapped in a promise.
 */
export function bytesToDataUrl(image: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(image)
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return `data:${mimeType || 'image/jpeg'};base64,${btoa(binary)}`
}

/** data URL → bytes, for restoring photos from a backup. */
export function dataUrlToBytes(dataUrl: string): {
  bytes: ArrayBuffer
  mimeType: string
} {
  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma === -1) {
    throw new Error('Not a data URL.')
  }
  const header = dataUrl.slice(5, comma)
  if (!header.includes('base64')) throw new Error('Unsupported image encoding.')

  const mimeType = header.split(';')[0] || 'image/jpeg'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return { bytes: bytes.buffer, mimeType }
}

/**
 * Normalises a stored receipt to the byte form. Photos saved before the
 * Blob-in-IndexedDB problem was found still hold a Blob, and those devices
 * must keep working.
 */
export async function receiptBytes(
  image: ArrayBuffer | Blob,
  mimeType?: string
): Promise<{ bytes: ArrayBuffer; mimeType: string }> {
  if (image instanceof Blob) {
    return {
      bytes: await image.arrayBuffer(),
      mimeType: image.type || mimeType || 'image/jpeg',
    }
  }
  return { bytes: image, mimeType: mimeType || 'image/jpeg' }
}
