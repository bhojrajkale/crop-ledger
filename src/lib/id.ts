/**
 * Ids are generated on-device and never coordinated with a server, so they
 * must not collide across a phone and a laptop whose backups get merged.
 * crypto.randomUUID covers that; the fallback exists only for the handful of
 * older WebViews that expose crypto but not randomUUID.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
