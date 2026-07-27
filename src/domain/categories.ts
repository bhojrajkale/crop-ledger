import type { CategoryId } from './types'

export interface Category {
  id: CategoryId
  /**
   * Translation key, not display text — the domain layer has no business
   * knowing which language the UI is in. Resolve it with useT().
   */
  labelKey: CategoryLabelKey
  emoji: string
  /** CSS custom property name holding this category's accent colour. */
  colorVar: string
}

export type CategoryLabelKey =
  | 'catSeeds'
  | 'catFertilizer'
  | 'catLabour'
  | 'catMachinery'
  | 'catIrrigation'
  | 'catTransport'
  | 'catLand'
  | 'catCustom'

export const CATEGORIES: Category[] = [
  { id: 'seeds', labelKey: 'catSeeds', emoji: '🌱', colorVar: '--cat-seeds' },
  {
    id: 'fertilizer',
    labelKey: 'catFertilizer',
    emoji: '🧪',
    colorVar: '--cat-fertilizer',
  },
  { id: 'labour', labelKey: 'catLabour', emoji: '👨‍🌾', colorVar: '--cat-labour' },
  {
    id: 'machinery',
    labelKey: 'catMachinery',
    emoji: '🚜',
    colorVar: '--cat-machinery',
  },
  {
    id: 'irrigation',
    labelKey: 'catIrrigation',
    emoji: '💧',
    colorVar: '--cat-irrigation',
  },
  {
    id: 'transport',
    labelKey: 'catTransport',
    emoji: '🛻',
    colorVar: '--cat-transport',
  },
  { id: 'land', labelKey: 'catLand', emoji: '🏞️', colorVar: '--cat-land' },
  { id: 'custom', labelKey: 'catCustom', emoji: '✏️', colorVar: '--cat-custom' },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: CategoryId): Category {
  return BY_ID.get(id) ?? CATEGORIES[CATEGORIES.length - 1]!
}

/**
 * The label to render. A custom category's free text is the user's own words
 * and is never translated; everything else resolves through `translate`,
 * which the caller supplies so this stays free of React and of the store.
 */
export function categoryLabel(
  id: CategoryId,
  translate: (key: CategoryLabelKey) => string,
  customCategory?: string
): string {
  if (id === 'custom' && customCategory?.trim()) return customCategory.trim()
  return translate(getCategory(id).labelKey)
}
