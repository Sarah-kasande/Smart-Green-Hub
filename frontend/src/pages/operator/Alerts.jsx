// Surplus-risk alerts (FR06, FR07). Each alert explains its numbers so the operator can see why
// the batch was flagged, suggests an action, and the operator decides.
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
import { RiskBadge, StatusBadge } from '../../components/ui/Badges'
import { Disclosure, EmptyState, Fact, PageHeader } from '../../components/ui/Layout'
import { FilterPanel, FilterSelect, SearchBox, Toolbar, WithFilters } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { formatDateTime, formatNumber } from '../../utils/format'

const FILTERS = ['open', 'acknowledged', 'resolved', 'dismissed', 'all']

function AlertCard({ alert, onChanged }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const batch = alert.batch
  const stock = batch?.quantity_current ?? 0
  const rate = Number(alert.sales_rate)
  const ratioPercent = Math.round(Number(alert.risk_ratio) * 100)

  async function change(status) {
    setBusy(true)
    try {
      await api.patch(`/operator/alerts/${alert.id}`, { status, note: note || null })
      onChanged({ type: 'success', text: `alerts.changed.${status}` })
    } catch (err) {
      onChanged({ type: 'error', text: `errors.${errorCode(err)}` })
    } finally {
      setBusy(false)
    }
  }

  const open = ['open', 'acknowledged'].includes(alert.status)
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link to={`/operator/batches/${alert.batch_id}`} className="text-lg font-semibold underline-offset-2 hover:underline">
            {batch?.species?.common_name} · #{alert.batch_id}
          </Link>
          <p className="text-sm text-ink-soft">{t('alerts.generated', { date: formatDateTime(alert.generated_at) })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskBadge level={alert.risk_level} />
          <StatusBadge group="alertStatus" status={alert.status} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label={t('alerts.projected')}>{formatNumber(alert.projected_unsold)}</Fact>
        <Fact label={t('alerts.daysLeftLabel')}>{formatNumber(alert.days_to_prime_end)}</Fact>
        <Fact label={t('alerts.salesRate')}>{t('alerts.perDay', { n: formatNumber(rate, 2) })}</Fact>
        <Fact label={t('alerts.riskRatio')}>{ratioPercent}%</Fact>
      </dl>

      <div className="rounded-xl bg-info p-3">
        <p className="text-sm font-semibold text-ink-soft">{t('alerts.suggested')}</p>
        <p className="font-semibold">{t(`actions.${alert.suggested_action}`)}</p>
        <p className="mt-1 text-sm text-ink-soft">{t('alerts.youDecide')}</p>
      </div>

      <Disclosure summary={t('alerts.why')}>
        {/* The Table 5 calculation with this batch's numbers */}
        <ul className="space-y-1 text-sm">
          <li>{t('alerts.explain.stock', { s: formatNumber(stock) })}</li>
          <li>{t('alerts.explain.rate', { r: formatNumber(rate, 2) })}</li>
          <li>{t('alerts.explain.days', { d: alert.days_to_prime_end })}</li>
          <li>{t('alerts.explain.unsold', { s: formatNumber(stock), r: formatNumber(rate, 2), d: alert.days_to_prime_end, u: formatNumber(alert.projected_unsold) })}</li>
          <li>{t('alerts.explain.ratio', { u: formatNumber(alert.projected_unsold), s: formatNumber(stock), p: ratioPercent })}</li>
          <li>{t('alerts.explain.levels')}</li>
        </ul>
      </Disclosure>

      {open && (
        <div className="space-y-3 border-t border-line pt-3">
          <label className="block text-sm font-semibold" htmlFor={`note-${alert.id}`}>
            {t('alerts.note')} <span className="font-normal text-ink-soft">({t('common.optional')})</span>
          </label>
          <input id={`note-${alert.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="block min-h-12 w-full rounded-xl border border-line bg-surface px-3" />
          <div className="flex flex-wrap gap-2">
            {alert.status === 'open' && (
              <Button variant="secondary" disabled={busy} onClick={() => change('acknowledged')}>
                {t('alerts.acknowledge')}
              </Button>
            )}
            <Button disabled={busy} onClick={() => change('resolved')}>
              {t('alerts.resolve')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => change('dismissed')}>
              {t('alerts.dismiss')}
            </Button>
            {alert.suggested_action === 'surplus_board_or_donate' && (
              <Link to={`/operator/surplus?new=1&batch=${alert.batch_id}`} className={buttonClasses('secondary')}>
                {t('dashboard.postSurplus')}
              </Link>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function Alerts() {
  const { t } = useI18n()
  const [status, setStatus] = useState('open')
  const [risk, setRisk] = useState('all')
  const [search, setSearch] = useState('')
  const { data, error, reload } = useApi(`/operator/alerts?status=${status}`)
  const [notice, setNotice] = useState(null)
  const [checking, setChecking] = useState(false)

  async function checkNow() {
    setChecking(true)
    try {
      const res = await api.post('/operator/alerts/evaluate')
      setNotice({ type: 'success', text: 'alerts.checked', values: { n: res.data.summary?.evaluated ?? 0, created: res.data.summary?.created ?? 0 } })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    } finally {
      setChecking(false)
    }
  }

  function changed(message) {
    setNotice(message)
    reload()
  }

  const alerts = data?.alerts || []
  const statusOptions = FILTERS.map((f) => ({ value: f, label: f === 'all' ? t('table.allStatuses') : t(`alertStatus.${f}`) }))
  // Risk levels are counted in the browser from the alerts already loaded
  const riskOptions = ['all', 'high', 'medium', 'low'].map((level) => ({
    value: level,
    label: level === 'all' ? t('table.allLevels') : t(`risk.${level}`),
    count: level === 'all' ? alerts.length : alerts.filter((a) => a.risk_level === level).length,
  }))
  const rows = alerts.filter((a) => (risk === 'all' || a.risk_level === risk) && matches(search, a.batch?.species?.common_name, `#${a.batch_id}`))

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title={t('alerts.title')}
        meta={data && countLabel(t, rows.length)}
        actions={
          <Button variant="secondary" onClick={checkNow} disabled={checking}>
            {checking ? t('common.loading') : t('alerts.checkNow')}
          </Button>
        }
      />
      {notice && <Notice type={notice.type}>{t(notice.text, notice.values)}</Notice>}
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('table.searchPlants')} />
        <FilterSelect label={t('table.byStatus')} value={status} onChange={setStatus} options={statusOptions} />
        <FilterSelect label={t('table.byRisk')} value={risk} onChange={setRisk} options={riskOptions} />
      </Toolbar>
      {error && <ErrorState code={error} onRetry={reload} />}
      <WithFilters
        panel={
          <FilterPanel
            groups={[
              { label: t('table.byStatus'), value: status, onChange: setStatus, options: statusOptions },
              { label: t('table.byRisk'), value: risk, onChange: setRisk, options: riskOptions },
            ]}
          />
        }
      >
        {!data && !error && <PageLoader />}
        {data && rows.length === 0 && (alerts.length === 0 ? <EmptyState title={t('alerts.empty')} text={t('alerts.emptyText')} /> : <EmptyState title={t('table.noMatch')} />)}
        {rows.length > 0 && (
          <ul className="space-y-4">
            {rows.map((a) => (
              <li key={a.id}>
                <AlertCard alert={a} onChanged={changed} />
              </li>
            ))}
          </ul>
        )}
      </WithFilters>
    </div>
  )
}
