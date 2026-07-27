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
    expect(shareableType()).toEqual({ mime: 'application/json', extension: '.json' })
  })

  it('falls back to plain text when JSON is refused', () => {
    mockNavigator({ acceptTypes: ['text/plain'] })
    expect(shareableType()).toEqual({ mime: 'text/plain', extension: '.txt' })
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

  it('shares files alone, with no title or text', async () => {
    // iOS composes a message-oriented sheet when a share carries both, and
    // drops the document actions — "Save to Files" among them.
    const spy = vi.fn((_data: ShareData) => Promise.resolve())
    vi.stubGlobal('navigator', { canShare: () => true, share: spy })
    await shareBackup('{}', 'b.json')
    expect(Object.keys(spy.mock.calls[0]![0])).toEqual(['files'])
  })

  it('renames the file to match the type when falling back to text', async () => {
    // A text/plain item named .json is a mismatch iOS can treat as loose text
    // rather than a document.
    const spy = vi.fn((_data: ShareData) => Promise.resolve())
    vi.stubGlobal('navigator', {
      canShare: ({ files }: { files?: File[] }) =>
        !!files?.every((f) => f.type === 'text/plain'),
      share: spy,
    })
    await shareBackup('{}', 'crop-ledger-backup-2026-07-26.json')
    const file = spy.mock.calls[0]![0].files![0]!
    expect(file.name).toBe('crop-ledger-backup-2026-07-26.txt')
    expect(file.type).toBe('text/plain')
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
    const spy = vi.fn((_data: ShareData) => Promise.resolve())
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
