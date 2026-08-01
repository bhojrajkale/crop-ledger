/**
 * How rows are ordered, in one place.
 *
 * Both repositories sort their reads with these, and the store sorts its own
 * in-memory updates with them too. That shared definition is what lets a save
 * update the list without re-reading it: the row lands exactly where a fresh
 * read would have put it, so the list cannot visibly reshuffle the next time
 * one happens.
 */

/** Anything with a date the user chose and a moment it was recorded. */
export interface Dated {
  date: string
  createdAt: string
}

/**
 * Newest first, by the date on the entry and then by when it was recorded.
 * Two expenses dated the same day keep the order they were entered in,
 * reversed — the one just added sits at the top, where it can be checked.
 */
export function byNewestFirst<T extends Dated>(a: T, b: T): number {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
}

/** Most recently sown first, which is the crop being worked on. */
export function byStartDateDesc<T extends { startDate: string }>(
  a: T,
  b: T
): number {
  return b.startDate.localeCompare(a.startDate)
}

/**
 * Replaces a row with the same id, or adds it, and re-sorts.
 *
 * Returns a new array — the store hands these straight to React, which will
 * not re-render on a mutated one.
 */
export function upsertSorted<T extends { id: string }>(
  rows: T[],
  row: T,
  compare: (a: T, b: T) => number
): T[] {
  const without = rows.filter((existing) => existing.id !== row.id)
  return [...without, row].sort(compare)
}
