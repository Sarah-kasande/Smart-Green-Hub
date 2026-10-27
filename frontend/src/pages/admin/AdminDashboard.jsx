// Administrator dashboard (FR15, UI.md 5.6): registrations, active batches, open alerts by level,
// listings, requests, emails not delivered, what needs attention now, and platform impact charts.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader, SectionTitle, StatCard } from '../../components/ui/Layout'
import { SimpleBarChart } from '../../components/charts'
import { formatMonth, formatNumber } from '../../utils/format'
import { ImpactCards } from '../shared/Impact'

// Adds up { pending: 2, approved: 5 } -> 7. Missing values count as 0 (older or newer API).
const sum = (obj) => Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0)

export default function AdminDashboard() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/admin/dashboard')
  const [notice, setNotice] = useState(null)
  const [running, setRunning] = useState(false)

  async function runRisk() {
    setRunning(true)
    try {
      const res = await api.post('/admin/risk/run')
      const values = { n: res.data.summary?.evaluated ?? 0, created: res.data.summary?.created ?? 0, expired: res.data.expired_listings ?? 0 }
      setNotice({ type: 'success', text: 'adminHome.ran', values })
      toast.success(t('adminHome.ran', values))
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    } finally {
      setRunning(false)
    }
  }

  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const nurseries = data.nurseries || {}
  const institutions = data.institutions || {}
  const alerts = data.open_alerts || {}
  const listings = data.listings || {}
  const requests = data.requests || {}
  const impact = data.impact || {}
  const waiting = (nurseries.pending || 0) + (institutions.pending || 0)

  // What needs the administrator now, in order of urgency
  const todo = [
    { count: waiting, label: 'adminHome.todoVerify', to: '/admin/verification' },
    { count: data.failed_notifications || 0, label: 'adminHome.todoEmails', to: '/admin/notifications-failed' },
  ].filter((item) => item.count > 0)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t('adminHome.title')}
        actions={
          <Button variant="secondary" onClick={runRisk} disabled={running}>
            {running ? t('common.loading') : t('adminHome.runRisk')}
          </Button>
        }
      />
      {notice && <Notice type={notice.type}>{t(notice.text, notice.values)}</Notice>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t('adminHome.nurseries')} count={sum(nurseries)} hint={t('adminHome.verifiedHint', { approved: nurseries.approved || 0, pending: nurseries.pending || 0 })} />
        <StatCard label={t('adminHome.institutions')} count={sum(institutions)} hint={t('adminHome.verifiedHint', { approved: institutions.approved || 0, pending: institutions.pending || 0 })} />
        <StatCard label={t('adminHome.activeBatches')} count={data.active_batches || 0} />
        <StatCard label={t('dashboard.openAlerts')} count={sum(alerts)} hint={t('dashboard.alertsHint', { high: alerts.high || 0, medium: alerts.medium || 0 })} />
        <StatCard label={t('adminHome.activeListings')} count={(listings.active || 0) + (listings.reserved || 0)} />
        <StatCard label={t('adminHome.openRequests')} count={(requests.pending || 0) + (requests.approved || 0)} />
        <StatCard label={t('adminHome.pendingVerification')} count={waiting} />
        <StatCard label={t('adminHome.failedEmails')} count={data.failed_notifications || 0} />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <SectionTitle>{t('adminHome.todoTitle')}</SectionTitle>
          {todo.length === 0 ? (
            <p className="mt-3 text-ink-soft">{t('adminHome.todoNone')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {todo.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="flex min-h-14 items-center justify-between gap-3 py-2 hover:text-teal-text">
                    <span>
                      <span className="mr-2 inline-grid min-w-8 place-items-center rounded-full bg-risk-medium px-2 font-bold text-risk-medium-text">{formatNumber(item.count)}</span>
                      {t(item.label)}
                    </span>
                    <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="lg:col-span-7">
          <SectionTitle>{t('impact.monthly')}</SectionTitle>
          <div className="mt-4">
            {(impact.monthly || []).length > 0 ? (
              <SimpleBarChart title={t('impact.monthly')} valueLabel={t('impact.plants')} data={impact.monthly.map((m) => ({ label: formatMonth(m.month), value: m.plants }))} format={(v) => formatNumber(v)} color="var(--chart-2)" />
            ) : (
              <p className="text-ink-soft">{t('impact.emptyText')}</p>
            )}
          </div>
        </Card>
      </div>

      <SectionTitle>{t('impact.title')}</SectionTitle>
      <ImpactCards summary={impact} />
    </div>
  )
}
