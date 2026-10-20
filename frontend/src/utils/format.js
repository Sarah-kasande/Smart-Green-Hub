// Rwandan display formats (FR18): dates as DD/MM/YYYY, numbers with comma thousands, money in RWF.

export function formatDate(value) {
  if (!value) return ''
  // "YYYY-MM-DD" (a calendar date) is shown as is, without time-zone shifting
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-')
    return `${d}/${m}/${y}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${date.getFullYear()}`
}

export function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${formatDate(date)} ${hh}:${mi}`
}

export function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(Number(value) || 0)
}

// Rwandan francs are whole numbers: "RWF 12,500" (a loss shows as "-RWF 2,000")
export function formatRWF(value) {
  const n = Number(value) || 0
  return `${n < 0 ? '-' : ''}RWF ${formatNumber(Math.abs(n))}`
}

export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// Today on this device as "YYYY-MM-DD" (for date inputs)
export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "2026-10" -> "10/2026"
export function formatMonth(month) {
  const [y, m] = String(month).split('-')
  return `${m}/${y}`
}
