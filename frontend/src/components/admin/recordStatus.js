// The Active / Archived / All filter of the administrator's record pages, with counts (W47)
import { formatNumber } from '../../utils/format'

export const RECORD_STATUSES = ['active', 'archived', 'all']

export function recordStatusOptions(t, counts) {
  return RECORD_STATUSES.map((s) => ({ value: s, label: `${t(`records.status.${s}`)} (${formatNumber(counts?.[s] ?? 0)})` }))
}
