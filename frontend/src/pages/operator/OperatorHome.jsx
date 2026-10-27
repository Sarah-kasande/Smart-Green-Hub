// Nursery operator dashboard (UI.md 5.4): today's picture of the nursery.
//  - 4 key numbers (stock, open alerts, sales this month with a 6-month trend, Surplus Board)
//  - "Act now": the batch most at risk, with its suggested action
//  - risk overview, prime-window timeline, requests waiting, income vs expenses, planting suggestions
// Everything comes from the existing API (dashboard, finance, requests, planting) and the batches
// stored on this phone; no number is invented.
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TriangleAlert } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import { qs, useApi } from '../../api/useApi'
import { useBatches } from '../../offline/useOfflineData'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import PrimeTimeline from '../../components/ui/PrimeTimeline'
import { RiskBadge, StatusBadge } from '../../components/ui/Badges'
import { EmptyState, PageHeader, SectionTitle, StatCard } from '../../components/ui/Layout'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { IncomeExpenseChart } from '../../components/charts'
import Donut from '../../components/ui/Donut'
import Reveal from '../../components/ui/Reveal'
import useIdleReady from '../../components/ui/useIdleReady'
import { formatDate, formatMonth, formatNumber, formatRWF, todayIso } from '../../utils/format'
import { greetingKey } from '../../utils/greeting'
import AccountHome from '../account/AccountHome'

// Quick actions: plain buttons, the first one is the main action
const QUICK = [
  { to: '/operator/batches/new', label: 'dashboard.addBatch', variant: 'primary' },
  { to: '/operator/sales?tab=sale', label: 'dashboard.recordSale', variant: 'secondary' },
  { to: '/operator/sales?tab=expense', label: 'dashboard.recordExpense', variant: 'secondary' },
  { to: '/operator/surplus?new=1', label: 'dashboard.postSurplus', variant: 'secondary' },
]

// First day of the month, 5 months ago: the finance chart shows 6 months
function sixMonthsAgo() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 5)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// The batch most at risk, with what to do about it
const ActNow = memo(function ActNow({ item }) {
  const { t } = useI18n()
  return (
    <Card className="relative overflow-hidden border-2 border-risk-high-text/40">
      <p className="flex items-center gap-2 text-sm font-semibold text-risk-high-text">
        <TriangleAlert className="size-4" aria-hidden="true" />
        {t('dashboard.actNow')}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xl font-bold tracking-tight">{item.species}</p>
          <p className="text-sm text-ink-soft">
            #{item.batch_id} · {formatNumber(item.quantity)} {t('common.plants')} · {t('alerts.daysLeft', { n: item.days_left })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge group="stages" status={item.stage} />
          <RiskBadge level={item.risk_level} />
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-info px-3 py-2 text-sm">
        <span className="font-semibold">{t('alerts.suggested')}:</span> {t(`actions.${item.suggested_action}`)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/operator/surplus?new=1&batch=${item.batch_id}`} className={buttonClasses('primary')}>
          {t('dashboard.postSurplus')}
        </Link>
        <Link to="/operator/alerts" className={buttonClasses('secondary')}>
          {t('dashboard.openAlerts')}
        </Link>
      </div>
    </Card>
  )
})

const RequestsWaiting = memo(function RequestsWaiting() {
  const { t } = useI18n()
  const { data } = useApi('/operator/requests?status=pending')
  const requests = (data?.requests || []).slice(0, 4)
  return (
    <Card className="h-full">
      <SectionTitle
        actions={
          <Link to="/operator/requests" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-teal-text">
            {t('dashboard.viewAll')} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      >
        {t('dashboard.requestsWaiting')}
      </SectionTitle>
      {!data ? (
        <p className="mt-3 text-ink-soft">{t('common.loading')}</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-ink-soft">{t('requests.empty')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {requests.map((r, i) => (
            <li key={r.id}>
              <Reveal delay={60 * i}>
                <Link to="/operator/requests" className="block py-3 hover:text-teal-text">
                  <span className="block font-semibold">
                    {formatNumber(r.quantity_requested)} × {r.species}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {r.institution?.name} · {formatDate(r.created_at)}
                  </span>
                  {r.purpose && <span className="block truncate text-sm text-ink-soft">“{r.purpose}”</span>}
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
})

// The prime-window timeline reads the batches stored on this phone itself, so loading them
// redraws only this card
const TimelineCard = memo(function TimelineCard() {
  const { t } = useI18n()
  const { batches } = useBatches()
  return (
    <Card className="lg:col-span-7">
      <SectionTitle>{t('dashboard.timeline')}</SectionTitle>
      <div className="mt-4">{batches ? <PrimeTimeline batches={batches} /> : <p className="text-ink-soft">{t('common.loading')}</p>}</div>
    </Card>
  )
})

const PlantingPreview = memo(function PlantingPreview() {
  const { t } = useI18n()
  const { data } = useApi('/operator/planting')
  const items = (data?.recommendations || []).slice(0, 3)
  return (
    <Card className="h-full">
      <SectionTitle
        actions={
          <Link to="/operator/planting" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-teal-text">
            {t('dashboard.viewAll')} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      >
        {t('planting.title')}
      </SectionTitle>
      {items.length === 0 ? (
        <p className="mt-3 text-ink-soft">{data ? t('planting.empty') : t('common.loading')}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((r) => (
            <li key={r.species_id} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5">
              <span className="min-w-0 truncate font-medium">{r.species}</span>
              {r.enough_history ? (
                <span className="shrink-0 font-bold tabular-nums text-leaf-text">{t('planting.plantAbout', { n: formatNumber(r.quantity) })}</span>
              ) : (
                <span className="shrink-0 text-sm text-ink-soft">{t('planting.notEnough')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
})

function Dashboard() {
  const { t } = useI18n()
  const { user, organisation } = useAuth()
  const { data, error, reload } = useApi('/operator/dashboard')
  const finance = useApi(`/operator/finance${qs({ from: sixMonthsAgo(), to: todayIso() })}`)
  const restReady = useIdleReady()

  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />
  // Missing values count as 0 (in case the API is an older or newer version)
  const alerts = data.open_alerts || {}
  const month = data.month || {}
  const attention = data.attention || []
  const monthly = finance.data?.monthly || []
  const trend = monthly.map((m) => m.income)
  const lastMonth = monthly.length > 1 ? monthly[monthly.length - 2].income : null
  const change = lastMonth ? Math.round((((month.income || 0) - lastMonth) / lastMonth) * 100) : null
  const activeBatches = data.active_batches || 0
  const high = alerts.high || 0
  const medium = alerts.medium || 0

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t(greetingKey(), { name: user.full_name.split(' ')[0] })} meta={`${organisation.name} · ${formatDate(new Date())}`} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t('dashboard.plantsInStock')} count={data.plants_in_stock || 0} hint={t('dashboard.inBatches', { n: activeBatches })} />
        <StatCard label={t('dashboard.openAlerts')} count={high + medium} hint={t('dashboard.alertsHint', { high, medium })} />
        <StatCard
          label={t('dashboard.salesMonth')}
          value={formatRWF(month.income || 0)}
          hint={change === null ? t('dashboard.monthHint', { income: formatRWF(month.income || 0), expenses: formatRWF(month.expenses || 0) }) : t('dashboard.vsLastMonth', { p: `${change > 0 ? '+' : ''}${change}%` })}
          trend={trend.length > 1 ? trend : null}
        />
        <StatCard label={t('dashboard.activeListings')} count={data.active_listings || 0} hint={t('dashboard.pendingRequests', { n: data.pending_requests || 0 })} trendClass="text-teal" />
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className={`${buttonClasses(q.variant)} shrink-0`}>
            {t(q.label)}
          </Link>
        ))}
      </div>

      {/* The lower part (lists, charts, timeline) is drawn right after the first screen */}
      {!restReady ? (
        <div className="min-h-96" aria-hidden="true" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <section className="space-y-3 lg:col-span-7">
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
              <>
                <ActNow item={attention[0]} />
                {attention.length > 1 && (
                  <ul className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-xs">
                    {attention.slice(1).map((a) => (
                      <li key={a.alert_id}>
                        <Link to={`/operator/batches/${a.batch_id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-canvas">
                          {/* Phones: the badges go on their own line under the text */}
                          <span className="w-full min-w-0 sm:w-auto sm:flex-1">
                            <span className="block font-semibold">{a.species}</span>
                            <span className="block text-sm text-ink-soft">
                              #{a.batch_id} · {formatNumber(a.quantity)} {t('common.plants')} · {t('alerts.daysLeft', { n: a.days_left })}
                            </span>
                          </span>
                          <StatusBadge group="stages" status={a.stage} />
                          <RiskBadge level={a.risk_level} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <Card className="lg:col-span-5">
            <SectionTitle>{t('dashboard.riskOverview')}</SectionTitle>
            <div className="mt-4">
              <Donut
                title={t('dashboard.riskOverview')}
                centerValue={formatNumber(activeBatches)}
                centerLabel={t('dashboard.batchesLabel')}
                parts={[
                  { key: 'high', label: t('risk.high'), value: high, color: 'var(--color-risk-high-text)' },
                  { key: 'medium', label: t('risk.medium'), value: medium, color: 'var(--color-risk-medium-text)' },
                  { key: 'low', label: t('dashboard.lowOrNone'), value: Math.max(0, activeBatches - high - medium), color: 'var(--color-leaf)' },
                ]}
              />
            </div>
          </Card>

          <TimelineCard />

          <div className="lg:col-span-5">
            <RequestsWaiting />
          </div>

          <Card className="lg:col-span-7">
            <SectionTitle>{t('dashboard.incomeExpenses')}</SectionTitle>
            <div className="mt-4">
              {monthly.length > 0 ? (
                <IncomeExpenseChart
                  title={t('dashboard.incomeExpenses')}
                  labels={{ income: t('sales.income'), expenses: t('sales.expensesLabel') }}
                  data={monthly.map((m) => ({ label: formatMonth(m.month), income: m.income, expenses: m.expenses }))}
                  format={(v) => formatNumber(v)}
                />
              ) : (
                <p className="text-ink-soft">{finance.data ? t('sales.noSales') : t('common.loading')}</p>
              )}
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              {t('dashboard.monthNet')}: <span className="font-semibold text-ink">{formatRWF(month.profit || 0)}</span>
            </p>
          </Card>

          <div className="lg:col-span-5">
            <PlantingPreview />
          </div>
        </div>
      )}

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
