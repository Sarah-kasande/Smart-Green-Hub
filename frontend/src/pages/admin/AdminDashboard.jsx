// Administrator dashboard (FR15): registrations, active batches, open alerts by level,
// listings, requests, hand-overs and plants redirected.
import { useState } from 'react'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader, SectionTitle, StatCard } from '../../components/ui/Layout'
import { formatNumber } from '../../utils/format'
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
      setNotice({ type: 'success', text: 'adminHome.ran', values: { n: res.data.summary?.evaluated ?? 0, created: res.data.summary?.created ?? 0, expired: res.data.expired_listings ?? 0 } })
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
        <StatCard label={t('adminHome.nurseries')} value={formatNumber(sum(nurseries))} hint={t('adminHome.verifiedHint', { approved: nurseries.approved || 0, pending: nurseries.pending || 0 })} />
        <StatCard label={t('adminHome.institutions')} value={formatNumber(sum(institutions))} hint={t('adminHome.verifiedHint', { approved: institutions.approved || 0, pending: institutions.pending || 0 })} />
        <StatCard label={t('adminHome.activeBatches')} value={formatNumber(data.active_batches || 0)} />
        <StatCard label={t('dashboard.openAlerts')} value={formatNumber(sum(alerts))} hint={t('dashboard.alertsHint', { high: alerts.high || 0, medium: alerts.medium || 0 })} />
        <StatCard label={t('adminHome.activeListings')} value={formatNumber((listings.active || 0) + (listings.reserved || 0))} />
        <StatCard label={t('adminHome.openRequests')} value={formatNumber((requests.pending || 0) + (requests.approved || 0))} />
        <StatCard label={t('adminHome.pendingVerification')} value={formatNumber((nurseries.pending || 0) + (institutions.pending || 0))} />
        <StatCard label={t('adminHome.failedEmails')} value={formatNumber(data.failed_notifications || 0)} />
      </div>
      <SectionTitle>{t('impact.title')}</SectionTitle>
      <ImpactCards summary={data.impact || {}} />
    </div>
  )
}
