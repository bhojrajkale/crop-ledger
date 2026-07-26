import { describe, expect, it } from 'vitest'
import { blobToDataUrl, dataUrlToBlob, MAX_EDGE, targetSize } from './image'

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

describe('blobToDataUrl / dataUrlToBlob', () => {
  const bytes = [0xff, 0xd8, 0xff, 0x00, 0x42, 0x7f, 0x80, 0xfe]

  it('round-trips bytes exactly', async () => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })
    const restored = await dataUrlToBlob(await blobToDataUrl(blob))
    expect([...new Uint8Array(await restored.arrayBuffer())]).toEqual(bytes)
  })

  it('preserves the mime type', async () => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
    const url = await blobToDataUrl(blob)
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
    expect((await dataUrlToBlob(url)).type).toBe('image/png')
  })

  it('handles a blob large enough to need chunking', async () => {
    // Spreading this many bytes into fromCharCode at once would blow the stack.
    const big = new Uint8Array(200_000).map((_, i) => i % 256)
    const restored = await dataUrlToBlob(
      await blobToDataUrl(new Blob([big], { type: 'image/jpeg' }))
    )
    const out = new Uint8Array(await restored.arrayBuffer())
    expect(out.length).toBe(big.length)
    expect(out[0]).toBe(big[0])
    expect(out[199_999]).toBe(big[199_999])
  })

  it('rejects something that is not a data URL', async () => {
    await expect(dataUrlToBlob('https://example.com/a.jpg')).rejects.toThrow()
    await expect(dataUrlToBlob('data:image/jpeg,notbase64')).rejects.toThrow()
  })
})
