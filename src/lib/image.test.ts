import { describe, expect, it } from 'vitest'
import {
  bytesToDataUrl,
  dataUrlToBytes,
  MAX_EDGE,
  receiptBytes,
  targetSize,
} from './image'

describe('targetSize', () => {
  it('leaves an image that is already small enough alone', () => {
    // Upscaling cannot add detail and would only inflate storage.
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
    expect(targetSize(MAX_EDGE, 900)).toEqual({ width: MAX_EDGE, height: 900 })
  })

  it('scales a landscape photo down by its longest edge', () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 })
  })

  it('scales a portrait photo down by its longest edge', () => {
    expect(targetSize(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('preserves aspect ratio within a pixel', () => {
    const { width, height } = targetSize(4032, 3024)
    expect(Math.abs(width / height - 4032 / 3024)).toBeLessThan(0.01)
  })

  it('respects a custom limit', () => {
    expect(targetSize(2000, 1000, 500)).toEqual({ width: 500, height: 250 })
  })

  it('never collapses an extreme aspect ratio to zero', () => {
    // A zero-width canvas throws, so the short edge has to stay at least 1px.
    const { width, height } = targetSize(8000, 3, 1600)
    expect(width).toBe(1600)
    expect(height).toBeGreaterThanOrEqual(1)
  })

  it('handles a degenerate zero-sized image without dividing by zero', () => {
    expect(targetSize(0, 0)).toEqual({ width: 0, height: 0 })
  })
})

describe('bytesToDataUrl / dataUrlToBytes', () => {
  const sample = [0xff, 0xd8, 0xff, 0x00, 0x42, 0x7f, 0x80, 0xfe]
  const buffer = () => new Uint8Array(sample).buffer

  it('round-trips bytes exactly', () => {
    const { bytes } = dataUrlToBytes(bytesToDataUrl(buffer(), 'image/jpeg'))
    expect([...new Uint8Array(bytes)]).toEqual(sample)
  })

  it('preserves the mime type', () => {
    const url = bytesToDataUrl(buffer(), 'image/png')
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
    expect(dataUrlToBytes(url).mimeType).toBe('image/png')
  })

  it('handles an image large enough to need chunking', () => {
    // Spreading this many bytes into fromCharCode at once would blow the stack.
    const big = new Uint8Array(200_000).map((_, i) => i % 256)
    const { bytes } = dataUrlToBytes(bytesToDataUrl(big.buffer, 'image/jpeg'))
    const out = new Uint8Array(bytes)
    expect(out.length).toBe(big.length)
    expect(out[0]).toBe(big[0])
    expect(out[199_999]).toBe(big[199_999])
  })

  it('falls back to JPEG when no type is given', () => {
    expect(bytesToDataUrl(buffer(), '')).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('rejects something that is not a data URL', () => {
    expect(() => dataUrlToBytes('https://example.com/a.jpg')).toThrow()
    expect(() => dataUrlToBytes('data:image/jpeg,notbase64')).toThrow()
  })
})

describe('receiptBytes', () => {
  const sample = [1, 2, 3, 250]

  it('passes an ArrayBuffer straight through', async () => {
    const buffer = new Uint8Array(sample).buffer
    const result = await receiptBytes(buffer, 'image/jpeg')
    expect(result.bytes).toBe(buffer)
    expect(result.mimeType).toBe('image/jpeg')
  })

  it('unwraps a legacy Blob, so photos stored before the fix still open', async () => {
    const blob = new Blob([new Uint8Array(sample)], { type: 'image/png' })
    const result = await receiptBytes(blob)
    expect([...new Uint8Array(result.bytes)]).toEqual(sample)
    expect(result.mimeType).toBe('image/png')
  })

  it('defaults the type when a legacy Blob has none', async () => {
    const blob = new Blob([new Uint8Array(sample)])
    expect((await receiptBytes(blob)).mimeType).toBe('image/jpeg')
  })
})
