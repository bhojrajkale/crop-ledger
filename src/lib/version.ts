export const APP_VERSION = __APP_VERSION__
export const BUILD_SHA = __BUILD_SHA__
export const BUILD_TIME = __BUILD_TIME__

/** e.g. "v0.1.0 · 3f3b40e" — enough to tell two builds apart at a glance. */
export function versionLabel(): string {
  return `v${APP_VERSION} · ${BUILD_SHA}`
}

export function buildDate(locale = 'en-IN'): string {
  const date = new Date(BUILD_TIME)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
