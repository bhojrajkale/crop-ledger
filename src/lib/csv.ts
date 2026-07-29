import { formatPlain, type Cell, type Statement } from './statement'

/**
 * A cell is quoted when it could otherwise break the row apart. Embedded
 * quotes are doubled, which is the CSV escape — a backslash would be read
 * literally by every spreadsheet there is.
 */
function escape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function render(cell: Cell): string {
  if (typeof cell === 'string') return escape(cell)
  // ISO, not the localised form: it is what a spreadsheet recognises as a
  // date and what sorts correctly as plain text if it does not.
  if ('date' in cell) return cell.date
  return formatPlain(cell.amount)
}

/**
 * Byte-order mark.
 *
 * Excel opens a .csv as the system's legacy encoding unless the file starts
 * with this, which turns every Marathi name into mojibake. Numbers would
 * still add up, but the sheet would be unreadable — and unreadable is how a
 * shared statement gets ignored.
 */
const BOM = '﻿'

/**
 * The whole statement as one spreadsheet.
 *
 * Several tables in a single sheet rather than several files: the point is to
 * hand somebody one attachment holding the season's accounts, and a blank
 * line with a heading is something every spreadsheet program copes with.
 */
export function statementToCsv(statement: Statement): string {
  const lines: string[] = [escape(statement.title), escape(statement.subtitle), '']

  for (const { label, value } of statement.headline) {
    lines.push(`${escape(label)},${render(value)}`)
  }

  for (const table of statement.tables) {
    lines.push('', escape(table.title))
    lines.push(table.columns.map(escape).join(','))
    for (const row of table.rows) lines.push(row.map(render).join(','))
    if (table.note) lines.push(escape(table.note))
  }

  // CRLF: the line ending Excel expects, and the one the CSV spec names.
  return BOM + lines.join('\r\n') + '\r\n'
}

/**
 * A filename built from the crop, falling back when the name would not
 * survive the trip.
 *
 * The slug is ASCII-only because a non-ASCII download filename is mangled by
 * some mobile browsers and mail clients. That means a Marathi crop name
 * reduces to nothing useful — "कापूस खरीप 2026" leaves just "2026", which
 * names the file after a number nobody will recognise. So a slug with no
 * letters at all is treated as no slug, and the date does the identifying
 * instead.
 */
export function statementFilename(
  cropName: string,
  season: string,
  extension: string,
  now = new Date()
): string {
  const slug = `${cropName} ${season}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const stem = /[a-z]/.test(slug) ? slug : 'crop-ledger'
  return `${stem}-${now.toISOString().slice(0, 10)}.${extension}`
}

/** Hands the spreadsheet to the browser as a download. */
export function downloadCsv(csv: string, filename: string): void {
  // charset=utf-8 alongside the BOM: belt and braces, since some Android
  // mail clients read the header and ignore the mark.
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
