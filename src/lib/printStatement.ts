import { formatINR } from '../domain/money'
import { formatDate } from './format'
import type { Cell, Statement } from './statement'

/**
 * The printed statement.
 *
 * No PDF library. The browser's own print dialog produces a PDF on every
 * platform this app runs on — on iOS Safari the share sheet offers "Save to
 * Files", which is exactly the file somebody wants to send on — and a
 * generated PDF would have to carry an embedded Devanagari font to render
 * Marathi at all, which is megabytes of dependency to reproduce something
 * the browser already does properly.
 */

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character
  )

const renderCell = (cell: Cell, locale: string): string => {
  if (typeof cell === 'string') return escapeHtml(cell)
  if ('date' in cell) {
    // "29 जुलै" rather than 2026-07-29 — this is read, not parsed.
    return `<span class="nowrap">${escapeHtml(formatDate(cell.date, locale))}</span>`
  }
  return `<span class="num">${escapeHtml(formatINR(cell.amount))}</span>`
}

const isAmount = (cell: Cell) => typeof cell === 'object' && 'amount' in cell

function renderTable(table: Statement['tables'][number], locale: string): string {
  // Columns holding amounts are right-aligned, decided from the first row so
  // a column of figures lines up down the page.
  const numeric = (table.rows[0] ?? []).map(isAmount)
  const head = table.columns
    .map(
      (column, i) =>
        `<th${numeric[i] ? ' class="r"' : ''}>${escapeHtml(column)}</th>`
    )
    .join('')
  const body = table.rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, i) =>
              `<td${numeric[i] ? ' class="r"' : ''}>${renderCell(cell, locale)}</td>`
          )
          .join('')}</tr>`
    )
    .join('')

  const note = table.note
    ? `<p class="note">${escapeHtml(table.note)}</p>`
    : ''

  return `<section><h2>${escapeHtml(table.title)}</h2>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${note}</section>`
}

export function statementToHtml(
  statement: Statement,
  lang: string,
  locale: string
): string {
  const headline = statement.headline
    .map(
      (item) =>
        `<div class="fig"><span class="lbl">${escapeHtml(item.label)}</span>
          <strong>${renderCell(item.value, locale)}</strong></div>`
    )
    .join('')

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(statement.title)}</title>
<style>
  /* Everything inline — the print window is a separate document and cannot
     reach this app's stylesheet. Colours are print colours, not the app's
     theme: this is read on paper or as a PDF, never in dark mode. */
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #1a1a17; margin: 0; padding: 20px; line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #6b6b60; font-size: 12px; margin: 0 0 18px; }
  .figs { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
  .fig {
    border: 1px solid #ddd9cf; border-radius: 8px; padding: 8px 12px; min-width: 130px;
  }
  .lbl { display: block; font-size: 10px; text-transform: uppercase;
         letter-spacing: .06em; color: #6b6b60; }
  .fig strong { font-size: 16px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em;
       color: #4a7c3f; margin: 20px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #e6e2d8;
           vertical-align: top; }
  th { font-weight: 600; color: #6b6b60; border-bottom: 1px solid #c9c4b6; }
  .r { text-align: right; white-space: nowrap; }
  .note { font-size: 10px; color: #6b6b60; margin: 6px 0 0; max-width: 60em; }
  .num { font-variant-numeric: tabular-nums; }
  .nowrap { white-space: nowrap; }
  /* Keep a table's heading with at least the start of its rows. */
  section { break-inside: auto; }
  h2 { break-after: avoid; }
  tr { break-inside: avoid; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${escapeHtml(statement.title)}</h1>
  <p class="sub">${escapeHtml(statement.subtitle)}</p>
  <div class="figs">${headline}</div>
  ${statement.tables.map((table) => renderTable(table, locale)).join('')}
</body>
</html>`
}

/**
 * Opens the statement in a new window and asks the browser to print it.
 *
 * Returns false when the window could not be opened, which on a phone almost
 * always means pop-ups are blocked — worth telling the user, because from
 * their side the button simply did nothing.
 *
 * Must be called straight from the click handler: a `window.open` that
 * happens after an await has lost the user gesture, and Safari refuses it.
 */
export function printStatement(html: string): boolean {
  const target = window.open('', '_blank')
  if (!target) return false

  target.document.open()
  target.document.write(html)
  target.document.close()

  // A beat for layout and fonts before the dialog freezes the page. Printing
  // immediately can capture a half-laid-out document, which is how a
  // statement ends up with its columns collapsed.
  target.setTimeout(() => {
    target.focus()
    target.print()
  }, 250)
  return true
}
