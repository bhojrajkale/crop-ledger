import { afterEach, describe, expect, it, vi } from 'vitest'
import { canShareBackup, shareBackup, shareableType } from './share'

/** Stands in for a browser's share support. */
function mockNavigator(options: {
  acceptTypes?: string[]
  share?: (data: ShareData) => Promise<void>
  noCanShare?: boolean
}) {
  const share = options.share ?? (() => Promise.resolve())
  vi.stubGlobal('navigator', {
    ...(options.noCanShare
      ? {}
      : {
          canShare: ({ files }: { files?: File[] }) =>
            !!files?.every((f) => options.acceptTypes?.includes(f.type)),
        }),
    share,
  })
  return { share }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('shareableType', () => {
  it('prefers the real JSON type when the platform accepts it', () => {
    mockNavigator({ acceptTypes: ['application/json', 'text/plain'] })
    expect(shareableType()).toBe('application/json')
  })

  it('falls back to plain text when JSON is refused', () => {
    // Safari restricts shareable file types; the .json filename still gets
    // the file saved under the right name.
    mockNavigator({ acceptTypes: ['text/plain'] })
    expect(shareableType()).toBe('text/plain')
  })

  it('reports nothing shareable when no type is accepted', () => {
    mockNavigator({ acceptTypes: [] })
    expect(shareableType()).toBeNull()
    expect(canShareBackup()).toBe(false)
  })

  it('reports nothing shareable on a browser without canShare', () => {
    mockNavigator({ noCanShare: true })
    expect(canShareBackup()).toBe(false)
  })
})

describe('shareBackup', () => {
  it('opens the share sheet with the file and its name', async () => {
    const { share } = mockNavigator({ acceptTypes: ['application/json'] })
    const spy = vi.fn(share)
    vi.stubGlobal('navigator', {
      canShare: () => true,
      share: spy,
    })

    expect(await shareBackup('{"a":1}', 'crop-ledger-backup-2026-07-26.json')).toBe(
      'shared'
    )
    const data = spy.mock.calls[0]![0] as ShareData
    expect(data.files).toHaveLength(1)
    expect(data.files![0]!.name).toBe('crop-ledger-backup-2026-07-26.json')
  })

  it('treats dismissing the sheet as a choice, not a failure', async () => {
    mockNavigator({
      acceptTypes: ['application/json'],
      share: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
    })
    expect(await shareBackup('{}', 'b.json')).toBe('cancelled')
  })

  it('reports unsupported when the browser refuses the gesture', async () => {
    // Safari does this if assembling a large backup outlasts the tap, and the
    // caller must then fall back to a download rather than lose the file.
    mockNavigator({
      acceptTypes: ['application/json'],
      share: () => Promise.reject(new DOMException('gesture', 'NotAllowedError')),
    })
    expect(await shareBackup('{}', 'b.json')).toBe('unsupported')
  })

  it('reports unsupported without calling share when no type is accepted', async () => {
    const spy = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { canShare: () => false, share: spy })
    expect(await shareBackup('{}', 'b.json')).toBe('unsupported')
    expect(spy).not.toHaveBeenCalled()
  })

  it('survives a browser that throws from canShare', async () => {
    vi.stubGlobal('navigator', {
      canShare: () => {
        throw new Error('nope')
      },
      share: () => Promise.resolve(),
    })
    expect(await shareBackup('{}', 'b.json')).toBe('unsupported')
  })
})
