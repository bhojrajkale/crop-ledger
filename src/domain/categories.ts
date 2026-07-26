import type { CategoryId } from './types'

export interface Category {
  id: CategoryId
  label: string
  emoji: string
  /** CSS custom property name holding this category's accent colour. */
  colorVar: string
}

export const CATEGORIES: Category[] = [
  { id: 'seeds', label: 'Seeds', emoji: '🌱', colorVar: '--cat-seeds' },
  {
    id: 'fertilizer',
    label: 'Fertilizer & pesticide',
    emoji: '🧪',
    colorVar: '--cat-fertilizer',
  },
  { id: 'labour', label: 'Labour', emoji: '👨‍🌾', colorVar: '--cat-labour' },
  {
    id: 'machinery',
    label: 'Machinery & fuel',
    emoji: '🚜',
    colorVar: '--cat-machinery',
  },
  {
    id: 'irrigation',
    label: 'Irrigation & electricity',
    emoji: '💧',
    colorVar: '--cat-irrigation',
  },
  {
    id: 'transport',
    label: 'Transport & marketing',
    emoji: '🛻',
    colorVar: '--cat-transport',
  },
  { id: 'land', label: 'Land & rent', emoji: '🏞️', colorVar: '--cat-land' },
  { id: 'custom', label: 'Other', emoji: '✏️', colorVar: '--cat-custom' },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: CategoryId): Category {
  return BY_ID.get(id) ?? CATEGORIES[CATEGORIES.length - 1]!
}

/** The label to actually render, honouring a custom category's free text. */
export function categoryLabel(
  id: CategoryId,
  customCategory?: string
): string {
  if (id === 'custom' && customCategory?.trim()) return customCategory.trim()
  return getCategory(id).label
}
