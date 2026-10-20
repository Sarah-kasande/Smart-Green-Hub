// The sync status chip (CLAUDE.md): Online / Offline / "N waiting to sync" / "N problems".
// For operators it links to the sync page where waiting and refused changes are listed.
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { useI18n } from '../../i18n/I18nProvider'
import { useSync } from '../../offline/SyncProvider'

export default function SyncChip() {
  const { t } = useI18n()
  const { online, isOperator, pending, conflicts, syncing } = useSync()

  let tone = 'bg-leaf-light text-leaf-text'
  let icon = 'wifi'
  let text = t('connection.online')
  if (!online) {
    tone = 'bg-risk-medium text-risk-medium-text'
    icon = 'wifiOff'
    text = t('connection.offline')
  }
  if (isOperator && syncing) {
    tone = 'bg-info text-ink'
    icon = 'clock'
    text = t('sync.syncing')
  } else if (isOperator && conflicts.length) {
    tone = 'bg-risk-high text-risk-high-text'
    icon = 'alert'
    text = t('sync.problems', { n: conflicts.length })
  } else if (isOperator && pending) {
    tone = 'bg-risk-medium text-risk-medium-text'
    icon = 'clock'
    text = t('sync.waiting', { n: pending })
  }

  const chip = (
    <span role="status" className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${tone}`}>
      <Icon name={icon} size={16} />
      {text}
    </span>
  )
  if (!isOperator) return chip
  return (
    <Link to="/operator/sync" aria-label={`${text}. ${t('sync.title')}`}>
      {chip}
    </Link>
  )
}
