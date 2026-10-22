// Operator dashboard: stock, alerts, Surplus Board, this month's money, quick actions and
// the batches that need attention.
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import { useApi } from '../../api/useApi'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { RiskBadge, StatusBadge } from '../../components/ui/Badges'
import { EmptyState, PageHeader, SectionTitle, StatCard } from '../../components/ui/Layout'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { formatNumber, formatRWF } from '../../utils/format'
import AccountHome from '../account/AccountHome'

// Quick actions: plain buttons, the first one is the main action
const QUICK = [
  { to: '/operator/batches/new', label: 'dashboard.addBatch', variant: 'primary' },
  { to: '/operator/sales?tab=sale', label: 'dashboard.recordSale', variant: 'secondary' },
  { to: '/operator/sales?tab=expense', label: 'dashboard.recordExpense', variant: 'secondary' },
  { to: '/operator/surplus?new=1', label: 'dashboard.postSurplus', variant: 'secondary' },
]

function Dashboard() {
  const { t } = useI18n()
  const { organisation } = useAuth()
  const { data, error, reload } = useApi('/operator/dashboard')

  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />
  // Missing values count as 0 (in case the API is an older or newer version)
  const alerts = data.open_alerts || {}
  const month = data.month || {}
  const attention = data.attention || []

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t('nav.dashboard')} meta={organisation.name} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t('dashboard.plantsInStock')} value={formatNumber(data.plants_in_stock || 0)} hint={t('dashboard.inBatches', { n: data.active_batches || 0 })} />
        <StatCard
          label={t('dashboard.openAlerts')}
          value={formatNumber((alerts.high || 0) + (alerts.medium || 0))}
          hint={t('dashboard.alertsHint', { high: alerts.high || 0, medium: alerts.medium || 0 })}
        />
        <StatCard label={t('dashboard.activeListings')} value={formatNumber(data.active_listings || 0)} hint={t('dashboard.pendingRequests', { n: data.pending_requests || 0 })} />
        <StatCard
          label={t('dashboard.monthNet')}
          value={formatRWF(month.profit || 0)}
          hint={t('dashboard.monthHint', { income: formatRWF(month.income || 0), expenses: formatRWF(month.expenses || 0) })}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className={buttonClasses(q.variant)}>
            {t(q.label)}
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <SectionTitle
          actions={
            <Link to="/operator/alerts" className="inline-flex min-h-12 items-center font-semibold text-teal-text underline">
              {t('dashboard.viewAll')}
            </Link>
          }
        >
          {t('dashboard.attention')}
        </SectionTitle>
        {attention.length === 0 ? (
          <EmptyState title={t('dashboard.attentionEmpty')} />
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {attention.map((a) => (
              <li key={a.alert_id}>
                <Link to={`/operator/batches/${a.batch_id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-canvas">
                  {/* Phones: the badges go on their own line under the text */}
                  <span className="w-full min-w-0 sm:w-auto sm:flex-1">
                    <span className="block font-semibold">{a.species}</span>
                    <span className="block text-sm text-ink-soft">
                      #{a.batch_id} · {formatNumber(a.quantity)} {t('common.plants')} · {t('alerts.daysLeft', { n: a.days_left })}
                    </span>
                    <span className="block text-sm text-ink-soft">{t(`actions.${a.suggested_action}`)}</span>
                  </span>
                  <StatusBadge group="stages" status={a.stage} />
                  <RiskBadge level={a.risk_level} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-ink-soft">{t('dashboard.offlineNote')}</p>
    </div>
  )
}

export default function OperatorHome() {
  const { organisation } = useAuth()
  // Before approval: show the account check, details and documents
  if (organisation?.verification_status !== 'approved') return <AccountHome />
  return <Dashboard />
}
