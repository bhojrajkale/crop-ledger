import { create } from 'zustand'
import { en, type TranslationKey } from './en'
import { mr } from './mr'

export type Language = 'mr' | 'en'

export const LANGUAGES: { code: Language; label: string; english: string }[] = [
  { code: 'mr', label: 'मराठी', english: 'Marathi' },
  { code: 'en', label: 'English', english: 'English' },
]

const CATALOGUES: Record<Language, Record<string, string>> = { en, mr }

const KEY = 'cl_lang'

/**
 * Marathi is the default — this app is for a Marathi-speaking farm, and the
 * browser's own locale is a poor proxy for that (most phones here report
 * en-IN regardless of what their owner reads most comfortably).
 */
export const DEFAULT_LANGUAGE: Language = 'mr'

/**
 * Storage access is guarded because this module is imported by unit tests and
 * evaluated at load time by the store below — reaching for localStorage
 * unconditionally would throw outside a browser.
 */
function readStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === 'en' || stored === 'mr' ? stored : null
  } catch {
    return null
  }
}

export function getInitialLanguage(): Language {
  return readStoredLanguage() ?? DEFAULT_LANGUAGE
}

export interface Vars {
  [name: string]: string | number
}

/**
 * Looks up a key and fills `{placeholders}`.
 *
 * When `count` is supplied, a `_one` variant is preferred for exactly 1. That
 * is enough for both languages here: English needs the singular, and Marathi
 * mostly reuses one form, which the catalogue expresses by repeating it rather
 * than by special-casing in code.
 *
 * A missing key falls back to English and then to the key itself, so a gap can
 * never render as blank space — though the catalogue is typed to make gaps a
 * build error in the first place.
 */
export function translate(
  language: Language,
  key: TranslationKey,
  vars?: Vars
): string {
  const catalogue = CATALOGUES[language]
  const singular = `${key}_one`
  const useSingular = vars?.count === 1 && singular in catalogue

  const template =
    (useSingular ? catalogue[singular] : catalogue[key]) ??
    catalogue[key] ??
    en[key] ??
    key

  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole
  )
}

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (language) => {
    try {
      localStorage.setItem(KEY, language)
      // Screen readers and the browser's own text handling key off this.
      document.documentElement.setAttribute('lang', language)
    } catch {
      // A blocked storage API must not stop the language from changing for
      // this session.
    }
    set({ language })
  },
}))

/** The translator for the active language. Re-renders on a language change. */
export function useT() {
  const language = useLanguageStore((s) => s.language)
  return (key: TranslationKey, vars?: Vars) => translate(language, key, vars)
}

export function useLanguage(): Language {
  return useLanguageStore((s) => s.language)
}

/**
 * BCP-47 tag for Intl, with the numbering system forced to Latin digits.
 * Marathi's default is Devanagari (२६ जुलै), but money and dates are read
 * alongside shop bills and bank messages that use 1234567.
 */
export function intlLocale(language: Language): string {
  return language === 'mr' ? 'mr-IN-u-nu-latn' : 'en-IN'
}
