import type { ReactNode } from 'react'
import { Button } from './ui/Button'
import { Card, SectionTitle } from './ui/Card'
import { useAuthStore } from '../store/useAuthStore'
import { useSyncStore, type SyncStatus } from '../store/useSyncStore'
import { useOnline } from '../lib/useOnline'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'

/** The one-line answer to "where is my data right now?". */
const STATUS_TEXT: Record<SyncStatus, TranslationKey> = {
  offline: 'cloudOfflineStatus',
  connecting: 'cloudConnecting',
  uploading: 'cloudUploading',
  ready: 'cloudReady',
  error: 'cloudErrorStatus',
}

/**
 * Sign-in and sync state, shown on the Backup & restore screen.
 *
 * Renders nothing when the build has no Firebase project configured — the app
 * still works entirely on-device in that case, and a sign-in button that
 * could never succeed would be worse than no button.
 */
export function CloudSyncCard() {
  const t = useT()
  const available = useAuthStore((s) => s.available)
  const account = useAuthStore((s) => s.account)
  const busy = useAuthStore((s) => s.busy)
  const authError = useAuthStore((s) => s.error)
  const signIn = useAuthStore((s) => s.signIn)
  const signOut = useAuthStore((s) => s.signOut)

  const status = useSyncStore((s) => s.status)
  const uploaded = useSyncStore((s) => s.uploaded)
  const localCopyKept = useSyncStore((s) => s.localCopyKept)
  const dismissNotice = useSyncStore((s) => s.dismissNotice)
  const online = useOnline()

  if (!available) return null

  const signedIn = Boolean(account)
  // `undefined` means the session check has not finished. The buttons stay
  // out until it has, so the screen never invites a second sign-in to an
  // account that is about to appear on its own.
  const settled = account !== undefined

  return (
    <>
      <SectionTitle>{t('cloudSync')}</SectionTitle>
      <Card className="mb-6">
        <p className="text-sm text-[var(--muted)] mb-3">
          {signedIn
            ? t('cloudSyncOnBody')
            : online
              ? t('cloudSyncOffBody')
              : t('cloudSyncOffBodyOffline')}
        </p>

        {settled ? (
          <p
            role="status"
            aria-label={t('cloudStatusLabel')}
            className="text-sm text-[var(--ink)] mb-3"
          >
            {/* With no signal the ledger is still being saved — it is the
                account that is behind, which is a different thing from the
                connection having failed. */}
            {!online && status === 'ready'
              ? t('offlineBanner')
              : t(STATUS_TEXT[status])}
          </p>
        ) : null}

        {uploaded ? (
          <Notice
            tone="positive"
            onDismiss={dismissNotice}
            dismissLabel={t('dismiss')}
          >
            {uploaded.photos > 0
              ? t('cloudUploadedPhotos', {
                  crops: t('crops', { count: uploaded.crops }),
                  expenses: t('expenses', { count: uploaded.expenses }),
                  photos: t('photos', { count: uploaded.photos }),
                })
              : t('cloudUploaded', {
                  crops: t('crops', { count: uploaded.crops }),
                  expenses: t('expenses', { count: uploaded.expenses }),
                })}
            {/* The ledger is up either way; a photo that would not upload
                must not read as a failed move. */}
            {uploaded.photosFailed > 0
              ? ` ${t('cloudPhotosFailed', {
                  photos: t('photos', { count: uploaded.photosFailed }),
                })}`
              : ''}
          </Notice>
        ) : null}

        {localCopyKept ? (
          <Notice
            tone="warning"
            onDismiss={dismissNotice}
            dismissLabel={t('dismiss')}
          >
            {t('cloudLocalCopyKept')}
          </Notice>
        ) : null}

        {authError ? (
          <Notice tone="negative">{t(authError)}</Notice>
        ) : null}

        {settled ? (
          signedIn ? (
            <>
              <p className="text-sm text-[var(--ink)] font-medium">
                {t('signedInAs', { name: account?.name ?? '' })}
              </p>
              <p className="text-sm text-[var(--muted)] mt-0.5 mb-3">
                {t('signOutBody')}
              </p>
              <Button disabled={busy} onClick={() => void signOut()}>
                {t('signOut')}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void signIn()}
            >
              {busy ? t('signingIn') : t('signInWithGoogle')}
            </Button>
          )
        ) : null}
      </Card>
    </>
  )
}

const TONES = {
  positive: ['var(--positive-tint)', 'var(--positive)'],
  warning: ['var(--warning-tint)', 'var(--warning)'],
  negative: ['var(--negative-tint)', 'var(--negative)'],
} as const

function Notice({
  tone,
  children,
  onDismiss,
  dismissLabel,
}: {
  tone: keyof typeof TONES
  children: ReactNode
  onDismiss?: () => void
  dismissLabel?: string
}) {
  const [background, colour] = TONES[tone]
  return (
    <div
      role="status"
      className="rounded-xl px-3 py-2.5 text-sm mb-3 flex items-start gap-2"
      style={{ backgroundColor: background, color: colour }}
    >
      <span className="flex-1">{children}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 opacity-70 active:scale-95 transition-transform"
        >
          ✕
        </button>
      ) : null}
    </div>
  )
}
