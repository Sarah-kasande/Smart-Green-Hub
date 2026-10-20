// Notification emails that could not be delivered (FR14: failures visible for follow-up).
import { useState } from 'react'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import { EmptyState, PageHeader } from '../../components/ui/Layout'
import { formatDateTime } from '../../utils/format'

export default function EmailProblems() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/admin/notifications/failed')
  const [notice, setNotice] = useState(null)

  async function retry(id) {
    try {
      const res = await api.post(`/admin/notifications/${id}/retry`)
      setNotice({ type: 'success', text: 'emailProblems.retried', values: res.data.result })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={t('emailProblems.title')} intro={t('emailProblems.intro')} />
      {notice && <Notice type={notice.type}>{t(notice.text, notice.values)}</Notice>}
      {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      {!data && !error && <PageLoader />}
      {data && data.notifications.length === 0 && <EmptyState icon="check" title={t('emailProblems.none')} />}
      {data && data.notifications.length > 0 && (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-line">
            {data.notifications.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {n.type} → {n.user?.full_name} ({n.user?.email})
                  </p>
                  <p className="text-sm text-ink-soft">
                    {formatDateTime(n.updated_at)} · {t('emailProblems.attempts', { n: n.attempts })}
                  </p>
                  <p className="text-sm text-risk-high-text">{n.last_error}</p>
                </div>
                <Button variant="secondary" icon="mail" onClick={() => retry(n.id)}>
                  {t('emailProblems.retry')}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
