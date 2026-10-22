// In-app notifications (FR14). The text is built from the notification type and its details,
// in the user's language.
import api from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { EmptyState, PageHeader } from '../../components/ui/Layout'
import { formatDateTime } from '../../utils/format'

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
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title={t('notifications.title')}
        meta={data && t('notifications.unreadCount', { n: data.unread || 0 })}
        actions={
          data?.unread > 0 && (
            <Button variant="secondary" onClick={markAll}>
              {t('notifications.markAll')}
            </Button>
          )
        }
      />
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && data.items.length === 0 && <EmptyState title={t('notifications.empty')} />}
      {data && data.items.length > 0 && (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-line">
            {data.items.map((n) => (
              <li key={n.id} className={`px-5 py-4 ${n.read_at ? '' : 'bg-info'}`}>
                <div className="min-w-0">
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
