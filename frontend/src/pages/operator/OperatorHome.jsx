// Operator dashboard (design/home.png): stock, alerts, Surplus Board, this month's money,
// batches that need attention and quick actions.
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import { useApi } from '../../api/useApi'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { RiskBadge, StatusBadge } from '../../components/ui/Badges'
import { StatCard } from '../../components/ui/Layout'
import { formatNumber, formatRWF } from '../../utils/format'
import AccountHome from '../account/AccountHome'

const QUICK = [
  { to: '/operator/batches/new', icon: 'sprout', label: 'dashboard.addBatch', tone: 'bg-leaf text-white' },
  { to: '/operator/sales?tab=sale', icon: 'wallet', label: 'dashboard.recordSale', tone: 'bg-navy text-white' },
  { to: '/operator/sales?tab=expense', icon: 'file', label: 'dashboard.recordExpense', tone: 'bg-info text-ink' },
  { to: '/operator/surplus?new=1', icon: 'board', label: 'dashboard.postSurplus', tone: 'bg-teal-light text-teal-text' },
]

function Dashboard() {
  const { t } = useI18n()
  const { user, organisation } = useAuth()
  const { data, error, reload } = useApi('/operator/dashboard')

  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const net = data.month.profit

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-leaf-text">{organisation.name}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('account.welcome', { name: user.full_name })}</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.plantsInStock')} value={formatNumber(data.plants_in_stock)} hint={t('dashboard.inBatches', { n: data.active_batches })} icon="sprout" />
        <StatCard
          label={t('dashboard.openAlerts')}
          value={formatNumber(data.open_alerts.high + data.open_alerts.medium)}
          hint={t('dashboard.alertsHint', { high: data.open_alerts.high, medium: data.open_alerts.medium })}
          icon="bell"
          tone={data.open_alerts.high ? 'red' : 'amber'}
        />
        <StatCard label={t('dashboard.activeListings')} value={formatNumber(data.active_listings)} hint={t('dashboard.pendingRequests', { n: data.pending_requests })} icon="board" tone="teal" />
        <StatCard
          label={t('dashboard.monthNet')}
          value={formatRWF(net)}
          hint={t('dashboard.monthHint', { income: formatRWF(data.month.income), expenses: formatRWF(data.month.expenses) })}
          icon="wallet"
          tone={net < 0 ? 'red' : 'blue'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Icon name="alert" className="text-risk-high-text" />
              {t('dashboard.attention')}
            </h2>
            <Link to="/operator/alerts" className="font-semibold text-teal-text underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {data.attention.length === 0 ? (
            <p className="flex items-center gap-2 text-ink-soft">
              <Icon name="check" className="text-leaf-text" />
              {t('dashboard.attentionEmpty')}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {data.attention.map((a) => (
                <li key={a.alert_id}>
                  <Link to={`/operator/batches/${a.batch_id}`} className="flex flex-wrap items-center gap-3 py-3 hover:text-teal-text">
                    <span className="min-w-0 flex-1">
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
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold">{t('dashboard.quickActions')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK.map((q) => (
              <Link key={q.to} to={q.to} className={`flex min-h-24 flex-col justify-between rounded-xl p-3 font-semibold ${q.tone}`}>
                <Icon name={q.icon} size={24} />
                {t(q.label)}
              </Link>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft">
            <Icon name="wifiOff" size={16} className="mt-0.5" />
            {t('dashboard.offlineNote')}
          </p>
        </Card>
      </div>
    </div>
  )
}

export default function OperatorHome() {
  const { organisation } = useAuth()
  // Before approval: show the account check, details and documents
  if (organisation?.verification_status !== 'approved') return <AccountHome />
  return <Dashboard />
}
