import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useSyncStore } from '../store/useSyncStore'

/**
 * Keeps the ledger pointed at whichever store the current sign-in state calls
 * for. Mounted once, by AppLayout.
 *
 * Signing in and out is the only thing that moves the app between the device
 * and the cloud, so it is the only thing that decides which repository the
 * ledger store reads from.
 */
export function useCloudSync() {
  const account = useAuthStore((s) => s.account)
  const init = useAuthStore((s) => s.init)
  const connect = useSyncStore((s) => s.connect)
  const disconnect = useSyncStore((s) => s.disconnect)

  useEffect(() => {
    void init()
  }, [init])

  const uid = account?.uid

  useEffect(() => {
    // `undefined` means Firebase has not finished checking for an existing
    // session. Acting on it would sign the user out of their own account for
    // the second it takes to answer.
    if (account === undefined) return
    if (uid) void connect(uid)
    else void disconnect()
  }, [account, uid, connect, disconnect])
}
