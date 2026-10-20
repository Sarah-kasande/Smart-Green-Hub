// In-app notifications (FR14). The text is built from the notification type and its details,
// in the user's language.
import api from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import { EmptyState, PageHeader } from '../../components/ui/Layout'
import { formatDateTime } from '../../utils/format'

const ICONS = {
  alert_created: 'alert',
  request_created: 'inbox',
  request_decided: 'check',
  request_cancelled: 'close',
  handover_confirmed: 'clock',
  handover_completed: 'check',
  listing_expired: 'clock',
  verification_approved: 'shield',
  verification_rejected: 'edit',
}

function notificationText(t, n) {
  const p = n.payload || {}
  const values = {
    ...p,
    level: p.level ? t(`risk.${p.level}`) : '',
    action: p.action ? t(`actions.${p.action}`) : '',
    decision: p.decision ? t(`requestStatus.${p.decision}`) : '',
  }
  return t(`notifications.types.${n.type}`, values)
}

export default function Notifications() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/notifications')

  async function markAll() {
    await api.post('/notifications/read', {})
    reload()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={t('notifications.title')}
        actions={
          data?.unread > 0 && (
            <Button variant="secondary" icon="check" onClick={markAll}>
              {t('notifications.markAll')}
            </Button>
          )
        }
      />
      {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      {!data && !error && <PageLoader />}
      {data && data.items.length === 0 && <EmptyState icon="bell" title={t('notifications.empty')} />}
      {data && data.items.length > 0 && (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-line">
            {data.items.map((n) => (
              <li key={n.id} className={`flex gap-3 p-4 ${n.read_at ? '' : 'bg-info'}`}>
                <Icon name={ICONS[n.type] || 'bell'} className="mt-0.5 text-teal-text" />
                <div className="min-w-0 flex-1">
                  <p className={n.read_at ? '' : 'font-semibold'}>{notificationText(t, n)}</p>
                  <p className="text-sm text-ink-soft">
                    {formatDateTime(n.created_at)}
                    {!n.read_at && ` · ${t('notifications.new')}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
