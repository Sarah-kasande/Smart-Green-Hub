// Surplus-risk alerts (FR06, FR07). Each alert explains its numbers so the operator can see why
// the batch was flagged, suggests an action, and the operator decides.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { RiskBadge, StatusBadge } from '../../components/ui/Badges'
import { Disclosure, EmptyState, Fact, PageHeader, Segmented } from '../../components/ui/Layout'
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
          <Link to={`/operator/batches/${alert.batch_id}`} className="text-lg font-bold underline-offset-2 hover:underline">
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
              <Button variant="secondary" icon="check" disabled={busy} onClick={() => change('acknowledged')}>
                {t('alerts.acknowledge')}
              </Button>
            )}
            <Button icon="check" disabled={busy} onClick={() => change('resolved')}>
              {t('alerts.resolve')}
            </Button>
            <Button variant="ghost" icon="close" disabled={busy} onClick={() => change('dismissed')}>
              {t('alerts.dismiss')}
            </Button>
            {alert.suggested_action === 'surplus_board_or_donate' && (
              <Link to={`/operator/surplus?new=1&batch=${alert.batch_id}`} className={buttonClasses('secondary')}>
                <Icon name="board" />
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
  const { data, error, reload } = useApi(`/operator/alerts?status=${status}`)
  const [notice, setNotice] = useState(null)
  const [checking, setChecking] = useState(false)

  async function checkNow() {
    setChecking(true)
    try {
      const res = await api.post('/operator/alerts/evaluate')
      setNotice({ type: 'success', text: 'alerts.checked', values: { n: res.data.summary.evaluated, created: res.data.summary.created } })
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

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={t('alerts.title')}
        intro={t('alerts.intro')}
        actions={
          <Button variant="secondary" icon="clock" onClick={checkNow} disabled={checking}>
            {checking ? t('common.loading') : t('alerts.checkNow')}
          </Button>
        }
      />
      {notice && <Notice type={notice.type}>{t(notice.text, notice.values)}</Notice>}
      <Segmented label={t('alerts.title')} value={status} onChange={setStatus} options={FILTERS.map((f) => ({ value: f, label: f === 'all' ? t('common.all') : t(`alertStatus.${f}`) }))} />
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && data.alerts.length === 0 && <EmptyState icon="check" title={t('alerts.empty')} text={t('alerts.emptyText')} />}
      {data && data.alerts.length > 0 && (
        <ul className="space-y-4">
          {data.alerts.map((a) => (
            <li key={a.id}>
              <AlertCard alert={a} onChanged={changed} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
