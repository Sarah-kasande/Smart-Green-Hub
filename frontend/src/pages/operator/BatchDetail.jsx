// One batch: details, stage and price changes, stock adjustments with a reason (FR04),
// its sales and its history.
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import { record } from '../../offline/sync'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/Badges'
import { Fact, PageHeader } from '../../components/ui/Layout'
import { SelectField, TextField } from '../../components/ui/Fields'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { formatDate, formatDateTime, formatNumber, formatRWF } from '../../utils/format'

const STAGES = ['seedling', 'growing', 'ready', 'overgrown', 'cleared']

function EditForm({ batch, onSaved }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ stage: batch.stage, unit_price: batch.unit_price, expected_ready_date: batch.expected_ready_date, prime_end_date: batch.prime_end_date })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.patch(`/operator/batches/${batch.id}`, { ...form, unit_price: Number(form.unit_price) || 0 })
      onSaved('batches.saved')
    } catch (err) {
      setError(errorCode(err))
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      <SelectField
        label={t('batches.stage')}
        value={form.stage}
        onChange={set('stage')}
        hint={batch.suggested_stage !== form.stage ? t('batches.suggested', { stage: t(`stages.${batch.suggested_stage}`) }) : null}
        options={STAGES.map((s) => ({ value: s, label: t(`stages.${s}`) }))}
      />
      <TextField label={t('batches.unitPrice')} type="number" min="0" value={form.unit_price} onChange={set('unit_price')} error={fields.unit_price} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('batches.readyDate')} type="date" value={form.expected_ready_date} onChange={set('expected_ready_date')} error={fields.expected_ready_date} />
        <TextField label={t('batches.primeEnd')} type="date" value={form.prime_end_date} onChange={set('prime_end_date')} error={fields.prime_end_date} />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? t('common.saving') : t('common.save')}
      </Button>
    </form>
  )
}

function AdjustForm({ batch, onSaved }) {
  const { t } = useI18n()
  const [change, setChange] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})

  async function submit(event) {
    event.preventDefault()
    const missing = {}
    if (!Number(change)) missing.change = 'invalid_quantity'
    if (!reason.trim()) missing.reason = 'required'
    setFields(missing)
    if (Object.keys(missing).length) return
    setBusy(true)
    setError(null)
    const result = await record('stock_adjustment', { batch_id: batch.id, quantity_change: Number(change), reason: reason.trim() })
    setBusy(false)
    if (result.status === 'conflict') return setError({ code: result.code, details: result.details })
    setChange('')
    setReason('')
    onSaved(result.status === 'synced' ? 'batches.adjusted' : 'sync.savedOffline')
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice type="error">{t(`errors.${error.code}`, { available: error.details?.available ?? '' })}</Notice>}
      <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <TextField label={t('batches.change')} type="number" value={change} onChange={(e) => setChange(e.target.value)} error={fields.change} placeholder="-20" />
        <TextField label={t('batches.reason')} value={reason} onChange={(e) => setReason(e.target.value)} error={fields.reason} maxLength={255} placeholder={t('batches.reasonExample')} />
      </div>
      <p className="text-sm text-ink-soft">{t('batches.changeHint')}</p>
      <Button type="submit" variant="secondary" disabled={busy}>
        {t('batches.adjust')}
      </Button>
    </form>
  )
}

export default function BatchDetail() {
  const { t } = useI18n()
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, reload } = useApi(`/operator/batches/${id}`)
  const [notice, setNotice] = useState(null)

  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const { batch, adjustments, sales } = data

  function saved(text) {
    setNotice(text)
    reload()
  }

  async function archive() {
    const reason = window.prompt(t('batches.archiveConfirm'))
    if (reason === null) return
    try {
      await api.delete(`/operator/batches/${batch.id}`, { data: { reason } })
      navigate('/operator/batches', { state: { notice: { type: 'success', text: 'batches.archived' } } })
    } catch (err) {
      setNotice(null)
      window.alert(t(`errors.${errorCode(err)}`))
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Breadcrumb back to the list */}
      <nav aria-label={t('common.back')} className="text-sm">
        <Link to="/operator/batches" className="inline-flex min-h-12 items-center font-semibold text-teal-text underline">
          {t('batches.title')}
        </Link>
        <span className="text-ink-soft"> / #{batch.id}</span>
      </nav>
      <PageHeader
        title={`${batch.species?.common_name} · #${batch.id}`}
        actions={
          <>
            <Link to={`/operator/sales?tab=sale&batch=${batch.id}`} className={buttonClasses('primary')}>
              {t('dashboard.recordSale')}
            </Link>
            <Link to={`/operator/surplus?new=1&batch=${batch.id}`} className={buttonClasses('secondary')}>
              {t('dashboard.postSurplus')}
            </Link>
          </>
        }
      />
      {notice && <Notice type={notice === 'sync.savedOffline' ? 'warning' : 'success'}>{t(notice)}</Notice>}

      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label={t('batches.stage')}>
            <StatusBadge group="stages" status={batch.stage} />
          </Fact>
          <Fact label={t('batches.inStock')}>{formatNumber(batch.quantity_current)} / {formatNumber(batch.quantity_initial)}</Fact>
          <Fact label={t('batches.availableLabel')}>{formatNumber(batch.available)}</Fact>
          <Fact label={t('batches.unitPrice')}>{formatRWF(batch.unit_price)}</Fact>
          <Fact label={t('batches.plantingDate')}>{formatDate(batch.planting_date)}</Fact>
          <Fact label={t('batches.readyDate')}>{formatDate(batch.expected_ready_date)}</Fact>
          <Fact label={t('batches.primeEnd')}>{formatDate(batch.prime_end_date)}</Fact>
        </dl>
        {batch.available < batch.quantity_current && <p className="mt-3 text-sm text-ink-soft">{t('batches.promisedHint', { n: batch.quantity_current - batch.available })}</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t('batches.edit')}</h2>
          <EditForm key={batch.updated_at} batch={batch} onSaved={saved} />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t('batches.adjustTitle')}</h2>
          <AdjustForm batch={batch} onSaved={saved} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t('batches.sales')}</h2>
          {sales.length === 0 ? (
            <p className="text-ink-soft">{t('sales.noSales')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {sales.map((s) => (
                <li key={s.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {formatNumber(s.quantity)} × {formatRWF(s.unit_price)}
                    <span className="block text-sm text-ink-soft">{formatDateTime(s.sold_at)}</span>
                  </span>
                  <span className="font-semibold">{formatRWF(s.quantity * s.unit_price)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t('batches.adjustments')}</h2>
          {adjustments.length === 0 ? (
            <p className="text-ink-soft">{t('batches.noAdjustments')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {adjustments.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {a.reason}
                    <span className="block text-sm text-ink-soft">{formatDateTime(a.adjusted_at)}</span>
                  </span>
                  <span className={`font-semibold ${a.quantity_change < 0 ? 'text-risk-high-text' : 'text-leaf-text'}`}>
                    {a.quantity_change > 0 ? '+' : ''}
                    {formatNumber(a.quantity_change)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div>
        <Button variant="danger" onClick={archive}>
          {t('batches.archive')}
        </Button>
      </div>
    </div>
  )
}
