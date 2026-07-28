import { create } from 'zustand'
import { isCloudConfigured } from '../data/cloudConfig'

/**
 * The signed-in user, reduced to what the app actually displays. Firebase's
 * own User object is not kept in the store: nothing outside src/data should
 * need the SDK's types, and this keeps the cloud swappable in the same way
 * CropRepository keeps the storage swappable.
 */
export interface Account {
  uid: string
  name: string
  email: string
  photoURL?: string
}

/**
 * `undefined` while Firebase is still working out whether a previous session
 * is still valid, `null` once it is settled and nobody is signed in. The
 * distinction matters: showing "not signed in" during the check would flash a
 * wrong answer on every launch, and worse, invite a second sign-in.
 */
export type AuthState = Account | null | undefined

/**
 * Failures are held as translation keys rather than sentences: the store has
 * no business knowing which language the app is in, and the message has to
 * change when the user switches language while it is on screen.
 */
export type AuthError = 'signInFailed' | 'signOutFailed'

interface AuthStore {
  account: AuthState
  /** True while a sign-in or sign-out is in flight. */
  busy: boolean
  error: AuthError | null
  /** Whether this build has a Firebase project to talk to at all. */
  available: boolean

  init: () => Promise<void>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

/**
 * Sign-in failures the user caused, or that the fallback already handled.
 * These are silent: a cancelled sign-in is a decision, not a fault, and an
 * error banner for it would be noise.
 */
const SILENT = new Set([
  'auth/cancelled-popup-request',
  'auth/popup-closed-by-user',
  'auth/user-cancelled',
])

/** Popup routes that mean "this browser won't do popups" — retry by redirect. */
const NEEDS_REDIRECT = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
])

const codeOf = (e: unknown): string =>
  typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : ''

let initialised = false

export const useAuthStore = create<AuthStore>((set) => ({
  // Without configuration there is nothing to resolve, so settle immediately
  // as signed out rather than leaving every screen waiting on a check that
  // will never run.
  account: isCloudConfigured() ? undefined : null,
  busy: false,
  error: null,
  available: isCloudConfigured(),

  async init() {
    if (initialised || !isCloudConfigured()) return
    initialised = true

    // Dynamic, so a build without cloud configuration never downloads the
    // Firebase SDK at all, and a configured one loads it after first paint.
    const { getFirebase } = await import('../data/firebase')
    const { onAuthStateChanged, getRedirectResult } = await import(
      'firebase/auth'
    )
    const { auth } = getFirebase()

    onAuthStateChanged(
      auth,
      (user) => {
        set({
          account: user
            ? {
                uid: user.uid,
                name: user.displayName ?? user.email ?? 'Account',
                email: user.email ?? '',
                ...(user.photoURL ? { photoURL: user.photoURL } : {}),
              }
            : null,
          busy: false,
        })
      },
      () => set({ account: null, busy: false })
    )

    // Completes a sign-in that had to leave the page (see signIn below). The
    // listener above delivers the account either way; this is only here to
    // surface a redirect that came back as a failure, which would otherwise
    // look like the button simply not working.
    try {
      await getRedirectResult(auth)
    } catch (e) {
      if (!SILENT.has(codeOf(e))) set({ error: 'signInFailed' })
    }
  },

  async signIn() {
    if (!isCloudConfigured()) return
    set({ busy: true, error: null })

    const { getFirebase } = await import('../data/firebase')
    const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
      await import('firebase/auth')
    const { auth } = getFirebase()
    const provider = new GoogleAuthProvider()

    try {
      // A popup keeps the app running underneath, which matters for an
      // installed PWA: a redirect there can bounce the user out to the
      // browser and back into a cold start.
      await signInWithPopup(auth, provider)
    } catch (e) {
      const code = codeOf(e)
      if (NEEDS_REDIRECT.has(code)) {
        try {
          // Leaves the page; init()'s getRedirectResult picks it up on the
          // way back in.
          await signInWithRedirect(auth, provider)
          return
        } catch {
          set({ busy: false, error: 'signInFailed' })
          return
        }
      }
      set({ busy: false, ...(SILENT.has(code) ? {} : { error: 'signInFailed' }) })
      return
    }
    // onAuthStateChanged clears busy once the account actually lands.
  },

  async signOut() {
    if (!isCloudConfigured()) return
    set({ busy: true, error: null })
    try {
      const { getFirebase } = await import('../data/firebase')
      const { signOut } = await import('firebase/auth')
      await signOut(getFirebase().auth)
    } catch {
      set({ busy: false, error: 'signOutFailed' })
    }
  },

  clearError: () => set({ error: null }),
}))
