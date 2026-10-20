// Email report for the administrator (FR14, docs/DEVIATIONS.md W20).
// Every email (confirmation codes, password-reset codes, notifications) is in the outbox with a
// status. This page shows the counts and every email that was NOT delivered:
//   failed   Brevo refused it or could not be reached (the exact error is shown)
//   skipped  not sent on purpose: no Brevo key (development), printed in the server console
import { useState } from 'react'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import { EmptyState, PageHeader, StatCard } from '../../components/ui/Layout'
import { formatDateTime, formatNumber } from '../../utils/format'

export default function EmailProblems() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/admin/emails')
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function retry(item) {
    setBusyId(item.id)
    try {
      const res = await api.post(`/admin/emails/${item.id}/retry`)
      const r = res.data.result
      setNotice({ type: r.status === 'sent' ? 'success' : 'warning', text: r.new_code ? 'emailProblems.retriedNewCode' : 'emailProblems.retried', values: { status: t(`emailProblems.status.${r.status}`) } })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={t('emailProblems.title')} intro={t('emailProblems.intro')} />
      {notice && <Notice type={notice.type}>{t(notice.text, notice.values)}</Notice>}
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t('emailProblems.status.sent')} value={formatNumber(data.counts.sent)} icon="check" />
            <StatCard label={t('emailProblems.status.failed')} value={formatNumber(data.counts.failed)} icon="alert" tone={data.counts.failed ? 'red' : 'blue'} />
            <StatCard label={t('emailProblems.status.skipped')} value={formatNumber(data.counts.skipped)} hint={t('emailProblems.skippedHint')} icon="clock" tone={data.counts.skipped ? 'amber' : 'blue'} />
          </div>
          {data.counts.queued > 0 && <p className="text-sm text-ink-soft">{t('emailProblems.queued', { n: data.counts.queued })}</p>}
          {data.items.length === 0 ? (
            <EmptyState icon="check" title={t('emailProblems.none')} />
          ) : (
            <Card className="overflow-x-auto p-0 sm:p-0">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="border-b border-line text-ink-soft">
                  <tr>
                    <th className="p-3">{t('emailProblems.time')}</th>
                    <th className="p-3">{t('emailProblems.type')}</th>
                    <th className="p-3">{t('emailProblems.recipient')}</th>
                    <th className="p-3">{t('emailProblems.statusLabel')}</th>
                    <th className="p-3 text-right">{t('emailProblems.attemptsLabel')}</th>
                    <th className="p-3">{t('emailProblems.error')}</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="whitespace-nowrap p-3">{formatDateTime(item.time)}</td>
                      <td className="p-3">{t(`emailProblems.types.${item.type}`) === `emailProblems.types.${item.type}` ? item.type : t(`emailProblems.types.${item.type}`)}</td>
                      <td className="p-3 font-mono text-xs">{item.recipient}</td>
                      <td className="p-3">
                        <Pill tone={item.status === 'failed' ? 'red' : 'amber'} icon={item.status === 'failed' ? 'alert' : 'clock'}>
                          {t(`emailProblems.status.${item.status}`)}
                        </Pill>
                      </td>
                      <td className="p-3 text-right">{item.attempts}</td>
                      <td className="max-w-xs break-words p-3 text-risk-high-text">{item.error}</td>
                      <td className="p-3">
                        <Button variant="secondary" icon="mail" onClick={() => retry(item)} disabled={busyId === item.id}>
                          {item.retry_issues_new_code ? t('emailProblems.retryNewCode') : t('emailProblems.retry')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
