/**
 * Firebase project settings, supplied at build time.
 *
 * These are not secrets — they identify the project and ship inside any web
 * app's bundle. What actually protects the data is the Firestore security
 * rules (firestore.rules), which only ever let a signed-in user read or write
 * documents under their own uid.
 *
 * Kept in its own module, free of any Firebase import, so that asking "is
 * there a cloud to talk to?" costs nothing. Everything that touches the SDK
 * is loaded dynamically and only once the answer is yes.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * Whether this build was given a project to talk to.
 *
 * A build without configuration must still run. The app worked entirely
 * on-device before sync existed and has to keep working that way if the
 * environment variables are missing — otherwise one forgotten CI secret turns
 * into a blank screen for someone standing in a field. Every cloud control is
 * hidden when this is false, and storage falls back to the device alone.
 */
export function isCloudConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
  )
}
