// Administrator dashboard (FR15): registrations, active batches, open alerts by level,
// listings, requests, hand-overs and plants redirected.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader, StatCard } from '../../components/ui/Layout'
import { formatNumber } from '../../utils/format'
import { ImpactCards } from '../shared/Impact'

const sum = (obj = {}) => Object.values(obj).reduce((a, b) => a + b, 0)

export default function AdminDashboard() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/admin/dashboard')
  const [notice, setNotice] = useState(null)
  const [running, setRunning] = useState(false)

  async function runRisk() {
    setRunning(true)
    try {
      const res = await api.post('/admin/risk/run')
      setNotice({ type: 'success', text: 'adminHome.ran', values: { n: res.data.summary.evaluated, created: res.data.summary.created, expired: res.data.expired_listings } })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    } finally {
      setRunning(false)
    }
  }

  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={t('adminHome.title')}
        intro={t('adminHome.intro')}
        actions={
          <Button variant="secondary" icon="clock" onClick={runRisk} disabled={running}>
            {running ? t('common.loading') : t('adminHome.runRisk')}
          </Button>
        }
      />
      {notice && <Notice type={notice.type}>{t(notice.text, notice.values)}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('adminHome.nurseries')} value={formatNumber(sum(data.nurseries))} hint={t('adminHome.verifiedHint', { approved: data.nurseries.approved || 0, pending: data.nurseries.pending || 0 })} icon="sprout" />
        <StatCard label={t('adminHome.institutions')} value={formatNumber(sum(data.institutions))} hint={t('adminHome.verifiedHint', { approved: data.institutions.approved || 0, pending: data.institutions.pending || 0 })} icon="building" tone="teal" />
        <StatCard label={t('adminHome.activeBatches')} value={formatNumber(data.active_batches)} icon="list" tone="blue" />
        <StatCard
          label={t('dashboard.openAlerts')}
          value={formatNumber(sum(data.open_alerts))}
          hint={t('dashboard.alertsHint', { high: data.open_alerts.high || 0, medium: data.open_alerts.medium || 0 })}
          icon="bell"
          tone={data.open_alerts.high ? 'red' : 'amber'}
        />
        <StatCard label={t('adminHome.activeListings')} value={formatNumber((data.listings.active || 0) + (data.listings.reserved || 0))} icon="board" tone="teal" />
        <StatCard label={t('adminHome.openRequests')} value={formatNumber((data.requests.pending || 0) + (data.requests.approved || 0))} icon="inbox" tone="amber" />
        <StatCard label={t('adminHome.pendingVerification')} value={formatNumber((data.nurseries.pending || 0) + (data.institutions.pending || 0))} icon="shield" tone="amber" />
        <StatCard label={t('adminHome.failedEmails')} value={formatNumber(data.failed_notifications)} icon="mail" tone={data.failed_notifications ? 'red' : 'blue'} />
      </div>
      <h2 className="text-lg font-bold">{t('impact.title')}</h2>
      <ImpactCards summary={data.impact} />
      <Card className="flex flex-wrap gap-4">
        <Link to="/admin/verification" className="font-semibold text-teal-text underline">
          {t('nav.verification')}
        </Link>
        <Link to="/admin/rules" className="font-semibold text-teal-text underline">
          {t('nav.rules')}
        </Link>
        <Link to="/admin/listings" className="font-semibold text-teal-text underline">
          {t('nav.listings')}
        </Link>
        <Link to="/admin/audit" className="font-semibold text-teal-text underline">
          {t('nav.audit')}
        </Link>
      </Card>
    </div>
  )
}
