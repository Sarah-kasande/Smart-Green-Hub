// Administrator: plant species that nurseries asked to add (docs/DEVIATIONS.md W39).
// Each request shows the name, plant type, nursery, how many batches use it and the date.
//   Approve -> the administrator enters or confirms the growing rules; the batches get their dates
//   Reject  -> a reason is required; the nursery is told and chooses another species
//   Merge   -> a spelling duplicate: the batches move to the chosen approved species
// Every decision is saved in the audit log and the nurseries are notified.
import { useRef, useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import { EmptyState, Fact, PageHeader } from '../../components/ui/Layout'
import { DataTable, FilterSelect, SearchBox, Toolbar } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { SelectField, TextArea, TextField } from '../../components/ui/Fields'
import { formatDate, formatNumber } from '../../utils/format'

// 'all' first and by default: decided requests stay visible as history
const STATUSES = ['all', 'pending', 'approved', 'rejected', 'merged']
const CATEGORIES = ['flower', 'tree', 'shrub', 'other']
const STATUS_STYLE = { pending: ['amber', 'clock'], approved: ['green', 'check'], rejected: ['red', 'close'], merged: ['grey', 'arrowRight'] }

function RequestStatus({ item }) {
  const { t } = useI18n()
  const [tone, icon] = STATUS_STYLE[item.status] || ['grey', 'info']
  return (
    <Pill tone={tone} icon={icon}>
      {item.status === 'merged' && item.mergedInto ? t('speciesRequests.mergedInto', { name: item.mergedInto.common_name }) : t(`speciesRequests.status.${item.status}`)}
    </Pill>
  )
}

// Approve: the name and plant type can be corrected; the two rules are required (1-3650 days)
function ApproveForm({ item, onDone, onCancel }) {
  const { t } = useI18n()
  const [form, setForm] = useState({
    common_name: item.common_name,
    kinyarwanda_name: item.kinyarwanda_name || '',
    category: item.category,
    default_days_to_ready: '',
    default_prime_days: '',
  })
  const [fields, setFields] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const days = (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 3650

  async function submit(event) {
    event.preventDefault()
    const missing = {}
    if (!form.common_name.trim()) missing.common_name = 'required'
    if (!days(form.default_days_to_ready)) missing.default_days_to_ready = 'invalid'
    if (!days(form.default_prime_days)) missing.default_prime_days = 'invalid'
    setFields(missing)
    if (Object.keys(missing).length) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/species-requests/${item.id}/approve`, {
        common_name: form.common_name.trim(),
        kinyarwanda_name: form.kinyarwanda_name.trim() || null,
        category: form.category,
        default_days_to_ready: Number(form.default_days_to_ready),
        default_prime_days: Number(form.default_prime_days),
      })
      onDone('speciesRequests.approved')
    } catch (err) {
      setError(errorCode(err))
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t('species.name')} value={form.common_name} onChange={set('common_name')} error={fields.common_name} maxLength={120} />
        <TextField label={t('species.rwName')} value={form.kinyarwanda_name} onChange={set('kinyarwanda_name')} error={fields.kinyarwanda_name} maxLength={120} optional />
      </div>
      <SelectField label={t('species.category')} value={form.category} onChange={set('category')} options={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t('species.daysToReady')} type="number" min="1" max="3650" value={form.default_days_to_ready} onChange={set('default_days_to_ready')} error={fields.default_days_to_ready} />
        <TextField label={t('species.primeDays')} type="number" min="1" max="3650" value={form.default_prime_days} onChange={set('default_prime_days')} error={fields.default_prime_days} />
      </div>
      <p className="text-sm text-ink-soft">{t('speciesRequests.approveHint')}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={busy}>
          {t('speciesRequests.confirmApprove')}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

function RejectForm({ item, onDone, onCancel }) {
  const { t } = useI18n()
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!reason.trim()) return setReasonError('required')
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/species-requests/${item.id}/reject`, { reason: reason.trim() })
      onDone('speciesRequests.rejected')
    } catch (err) {
      setError(errorCode(err))
      setReasonError(fieldErrors(err).reason || null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      <TextArea label={t('speciesRequests.rejectReason')} value={reason} onChange={(e) => setReason(e.target.value)} error={reasonError} maxLength={500} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="danger" disabled={busy}>
          {t('speciesRequests.confirmReject')}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

// Merge: close names are offered first, then every other approved species
function MergeForm({ item, approved, onDone, onCancel }) {
  const { t } = useI18n()
  const suggested = item.merge_suggestions || []
  const [targetId, setTargetId] = useState(suggested[0] ? String(suggested[0].id) : '')
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const others = approved.filter((s) => !suggested.some((x) => x.id === s.id))
  const options = [
    ...suggested.map((s) => ({ value: s.id, label: `${s.common_name} · ${t('speciesRequests.closeName')}` })),
    ...others.map((s) => ({ value: s.id, label: s.common_name })),
  ]

  async function submit(event) {
    event.preventDefault()
    if (!targetId) return setFieldError('required')
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/species-requests/${item.id}/merge`, { target_id: Number(targetId), reason: reason.trim() || null })
      onDone('speciesRequests.merged')
    } catch (err) {
      setError(errorCode(err))
      setFieldError(fieldErrors(err).target_id || null)
    } finally {
      setBusy(false)
    }
  }

  if (options.length === 0) return <p>{t('speciesRequests.nothingToMerge')}</p>
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      <SelectField label={t('speciesRequests.mergeInto')} value={targetId} onChange={(e) => setTargetId(e.target.value)} error={fieldError} placeholder={t('auth.choose')} options={options} />
      <TextField label={t('speciesRequests.mergeNote')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} optional />
      <p className="text-sm text-ink-soft">{t('speciesRequests.mergeHint', { n: item.batch_count })}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={busy}>
          {t('speciesRequests.confirmMerge')}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

function Detail({ item, approved, onDone, onClose }) {
  const { t } = useI18n()
  const [mode, setMode] = useState(null) // 'approve' | 'reject' | 'merge'
  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{t('speciesRequests.requestedOn', { date: formatDate(item.created_at) })}</p>
          <h2 className="text-xl font-semibold">
            {item.common_name}
            {item.kinyarwanda_name && <span className="font-normal text-ink-soft"> · {item.kinyarwanda_name}</span>}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <RequestStatus item={item} />
          <Button variant="ghost" onClick={onClose}>
            {t('table.closeDetails')}
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Fact label={t('species.category')}>{t(`categories.${item.category}`)}</Fact>
        <Fact label={t('speciesRequests.nursery')}>
          {item.requestedBy?.name}
          {item.requestedBy?.district && <span className="block text-sm font-normal text-ink-soft">{t(`districts.${item.requestedBy.district}`)}</span>}
        </Fact>
        <Fact label={t('speciesRequests.batches')}>{t('speciesRequests.batchCount', { n: formatNumber(item.batch_count), plants: formatNumber(item.plant_count) })}</Fact>
        {item.decided_at && (
          <Fact label={t('speciesRequests.decided')}>
            {formatDate(item.decided_at)}
            {item.decidedBy && <span className="block text-sm font-normal text-ink-soft">{item.decidedBy.full_name}</span>}
          </Fact>
        )}
      </dl>
      {item.decision_reason && (
        <p>
          <span className="font-semibold">{t('batches.reason')}:</span> {item.decision_reason}
        </p>
      )}

      {item.status === 'pending' && (
        <div className="space-y-3 border-t border-line pt-4">
          {(item.merge_suggestions || []).length > 0 && !mode && (
            <Notice type="warning">{t('speciesRequests.possibleDuplicate', { names: item.merge_suggestions.map((s) => s.common_name).join(', ') })}</Notice>
          )}
          {!mode && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setMode('approve')}>{t('speciesRequests.approve')}</Button>
              <Button variant="secondary" onClick={() => setMode('merge')}>
                {t('speciesRequests.merge')}
              </Button>
              <Button variant="danger" onClick={() => setMode('reject')}>
                {t('speciesRequests.reject')}
              </Button>
            </div>
          )}
          {mode === 'approve' && <ApproveForm item={item} onDone={onDone} onCancel={() => setMode(null)} />}
          {mode === 'reject' && <RejectForm item={item} onDone={onDone} onCancel={() => setMode(null)} />}
          {mode === 'merge' && <MergeForm item={item} approved={approved} onDone={onDone} onCancel={() => setMode(null)} />}
        </div>
      )}
    </Card>
  )
}

export default function SpeciesRequests() {
  const { t } = useI18n()
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [notice, setNotice] = useState(null)
  const detailRef = useRef(null)
  const { data, error, reload } = useApi(`/admin/species-requests?status=${status}`)
  const approvedSpecies = useApi('/admin/species?archived=false')

  const items = data?.items || []
  const rows = items.filter((item) => matches(search, item.common_name, item.kinyarwanda_name, item.requestedBy?.name))
  const selected = items.find((item) => item.id === selectedId)
  const counts = data?.counts || {}
  const statusOptions = STATUSES.map((s) => ({
    value: s,
    label: `${s === 'all' ? t('table.allStatuses') : t(`speciesRequests.status.${s}`)} (${counts[s] || 0})`,
  }))

  function open(item) {
    setNotice(null)
    setSelectedId(item.id)
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function done(text) {
    setNotice(text)
    setSelectedId(null)
    reload()
    approvedSpecies.reload()
  }

  const columns = [
    {
      key: 'name',
      header: t('species.name'),
      primary: true,
      render: (item) => (
        <>
          {item.common_name}
          {item.kinyarwanda_name && <span className="font-normal text-ink-soft"> · {item.kinyarwanda_name}</span>}
        </>
      ),
    },
    { key: 'category', header: t('species.category'), render: (item) => t(`categories.${item.category}`) },
    { key: 'nursery', header: t('speciesRequests.nursery'), render: (item) => item.requestedBy?.name },
    { key: 'batches', header: t('speciesRequests.batches'), align: 'right', render: (item) => formatNumber(item.batch_count) },
    { key: 'date', header: t('speciesRequests.date'), render: (item) => <span className="whitespace-nowrap">{formatDate(item.created_at)}</span> },
    { key: 'status', header: t('table.status'), render: (item) => <RequestStatus item={item} /> },
    // Who decided, when and why: the history of every decided request
    {
      key: 'decided',
      header: t('speciesRequests.decided'),
      render: (item) =>
        item.decided_at ? (
          <>
            <span className="whitespace-nowrap">{formatDate(item.decided_at)}</span>
            {item.decidedBy && <span className="block text-sm text-ink-soft">{item.decidedBy.full_name}</span>}
            {item.decision_reason && <span className="block text-sm text-ink-soft">{item.decision_reason}</span>}
          </>
        ) : (
          <span className="text-ink-soft">–</span>
        ),
    },
    {
      key: 'actions',
      header: t('table.actions'),
      full: true,
      render: (item) => (
        <Button variant="secondary" onClick={() => open(item)} aria-label={`${t('table.open')}: ${item.common_name}`}>
          {t('table.open')}
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('speciesRequests.title')} meta={data && countLabel(t, rows.length)} />
      {notice && <Notice type="success">{t(notice)}</Notice>}
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('speciesRequests.search')} />
        <FilterSelect label={t('table.byStatus')} value={status} onChange={setStatus} options={statusOptions} />
      </Toolbar>
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {/* The empty state only when there is truly nothing; otherwise the table says nothing matches the filter */}
      {data && (counts.all || 0) === 0 ? (
        <EmptyState title={t('speciesRequests.empty')} />
      ) : (
        data && (
          <DataTable
            caption={t('speciesRequests.title')}
            columns={columns}
            rows={rows}
            rowKey={(item) => item.id}
            empty={search ? t('table.noMatch') : status === 'pending' ? t('speciesRequests.emptyPending') : t('speciesRequests.emptyStatus')}
          />
        )
      )}
      <div ref={detailRef}>
        {selected && <Detail key={selected.id} item={selected} approved={approvedSpecies.data?.species || []} onDone={done} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  )
}
