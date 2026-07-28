import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { firebaseConfig, isCloudConfigured } from './cloudConfig'

interface FirebaseHandles {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let handles: FirebaseHandles | null = null

/**
 * Initialises Firebase once, on first use.
 *
 * This module is only ever reached through a dynamic import, so a build with
 * no project configured never downloads the SDK and a configured one loads it
 * after the first paint instead of blocking on it.
 */
export function getFirebase(): FirebaseHandles {
  if (handles) return handles
  if (!isCloudConfigured()) {
    throw new Error('Firebase is not configured for this build.')
  }

  const app = initializeApp(firebaseConfig)

  const auth = getAuth(app)
  // Survive a reload and an app relaunch. Signing in once per device is the
  // whole point; a session that evaporated would be worse than no sync.
  void setPersistence(auth, browserLocalPersistence)

  // Firestore's own IndexedDB cache is what keeps the app usable with no
  // signal: reads are served locally and writes queue until the connection
  // returns. The multi-tab manager stops a browser tab and an installed PWA
  // from fighting over that cache.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  })

  handles = { app, auth, db }
  return handles
}
