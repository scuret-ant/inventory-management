// Quote a cell only when needed (contains comma, quote, or newline).
// Embedded quotes are escaped per RFC 4180 by doubling them.
function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Build a CSV string from rows + column definitions.
// `columns` is an array of { key, label, format? } — `format` is optional and
// receives the raw row so callers can compute derived values (e.g. total_value).
function buildCsv(rows, columns) {
  const header = columns.map(c => escapeCell(c.label)).join(',')
  const body = rows.map(row =>
    columns.map(c => {
      const value = c.format ? c.format(row) : row[c.key]
      return escapeCell(value)
    }).join(',')
  ).join('\n')
  // BOM prefix so Excel opens UTF-8 (Japanese product names) correctly without a manual import step.
  return '﻿' + header + '\n' + body
}

// Trigger a browser download of the generated CSV.
export function exportToCsv(filename, rows, columns) {
  const csv = buildCsv(rows, columns)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
