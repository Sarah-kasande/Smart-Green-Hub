// Small helpers for the list pages (used together with DataView.jsx).
import { useState } from 'react'
import { formatNumber } from '../../utils/format'

// "1 entry" / "28 entries"
export function countLabel(t, n) {
  return n === 1 ? t('table.countOne') : t('table.count', { n: formatNumber(n) })
}

// True when a row contains the search text (in any of the given values), ignoring case.
// Searching happens in the browser, on the rows that are already loaded.
export function matches(search, ...values) {
  const text = search.trim().toLowerCase()
  if (!text) return true
  return values.some((v) => v !== null && v !== undefined && v !== false && String(v).toLowerCase().includes(text))
}

// Remembers "table" or "cards" per page on this device. Storage can be blocked (private mode):
// then the choice simply lasts until the page is left.
export function useViewMode(page, initial = 'table') {
  const key = `sgh_view_${page}`
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(key) || initial
    } catch {
      return initial
    }
  })
  function change(next) {
    setMode(next)
    try {
      localStorage.setItem(key, next)
    } catch {
      // not saved; nothing else to do
    }
  }
  return [mode, change]
}
