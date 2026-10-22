// Administrator: approve nurseries and institutions, or ask them to correct their details
// (FR02, FR15). A table of applications with a filter panel; "Open" shows the details and the
// decision buttons below the table.
import { useCallback, useEffect, useRef, useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import VerificationBadge from '../../components/ui/VerificationBadge'
import { TextArea } from '../../components/ui/Fields'
import { PageHeader } from '../../components/ui/Layout'
import { DataTable, FilterPanel, FilterSelect, SearchBox, Toolbar, WithFilters } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { formatDate } from '../../utils/format'
import { DocumentList } from '../account/Documents'

const STATUSES = ['pending', 'approved', 'rejected', 'all']
const TYPE_FILTERS = [
  { value: 'all', label: 'admin.filterAll' },
  { value: 'nursery', label: 'admin.filterNursery' },
  { value: 'institution', label: 'admin.filterInstitution' },
]

function Detail({ item, onDecided, onClose }) {
  const { t } = useI18n()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [reasonError, setReasonError] = useState(null)

  async function decide(decision) {
    setError(null)
    setReasonError(null)
    if (decision === 'reject' && !reason.trim()) {
      setReasonError('required')
      return
    }
    setBusy(true)
    try {
      await api.post(`/admin/verifications/${item.type}/${item.id}/decision`, {
        decision,
        reason: decision === 'reject' ? reason.trim() : null,
      })
      setRejecting(false)
      setReason('')
      await onDecided()
    } catch (err) {
      setError(errorCode(err))
      setReasonError(fieldErrors(err).reason || null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">
            {t(`admin.${item.type}`)}
            {item.org_type && ` · ${t(`orgTypes.${item.org_type}`)}`} · {t('admin.registered', { date: formatDate(item.created_at) })}
          </p>
          <h2 className="text-xl font-semibold">{item.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <VerificationBadge status={item.verification_status} />
          <Button variant="ghost" onClick={onClose}>
            {t('table.closeDetails')}
          </Button>
        </div>
      </div>

      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t('auth.district')}</dt>
          <dd className="mt-1">{t(`districts.${item.district}`)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t('auth.sector')}</dt>
          <dd className="mt-1">{item.sector}</dd>
        </div>
        {item.address_text && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t('auth.address')}</dt>
            <dd className="mt-1">{item.address_text}</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{t('admin.owner')}</dt>
          <dd className="mt-1">
            {item.owner?.full_name}
            <br />
            <a className="text-teal-text underline" href={`mailto:${item.owner?.email}`}>
              {item.owner?.email}
            </a>
            {item.contact_phone && (
              <>
                <br />
                {item.contact_phone}
              </>
            )}
          </dd>
        </div>
      </dl>

      {item.review_note && (
        <Notice type="warning">
          <span className="font-semibold">{t('admin.lastNote')}:</span> {item.review_note}
        </Notice>
      )}

      <div>
        <h3 className="mb-2 font-semibold">{t('admin.documents')}</h3>
        <DocumentList documents={item.documents || []} emptyText={t('admin.noDocuments')} />
      </div>

      {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}

      {item.verification_status === 'pending' && (
        <div className="space-y-3 border-t border-line pt-4">
          {rejecting ? (
            <>
              <TextArea label={t('admin.reason')} value={reason} onChange={(e) => setReason(e.target.value)} error={reasonError} maxLength={500} />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="danger" onClick={() => decide('reject')} disabled={busy}>
                  {t('admin.confirmReject')}
                </Button>
                <Button variant="secondary" onClick={() => setRejecting(false)} disabled={busy}>
                  {t('common.cancel')}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => decide('approve')} disabled={busy}>
                {t('admin.approve')}
              </Button>
              <Button variant="danger" onClick={() => setRejecting(true)} disabled={busy}>
                {t('admin.reject')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function VerificationQueue() {
  const { t } = useI18n()
  const [status, setStatus] = useState('pending')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState(null)
  const detailRef = useRef(null)

  const fetchQueue = useCallback(() => api.get('/admin/verifications', { params: { status, type } }), [status, type])

  // Reload the list whenever the status or type filter changes
  useEffect(() => {
    let cancelled = false
    fetchQueue()
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setError(null)
      })
      .catch((err) => !cancelled && setError(errorCode(err)))
    return () => {
      cancelled = true
    }
  }, [fetchQueue])

  // 'Try again' after a failed load
  function retry() {
    setError(null)
    load().catch((err) => setError(errorCode(err)))
  }

  async function load() {
    const res = await fetchQueue()
    setData(res.data)
  }

  async function open(item) {
    setNotice(null)
    try {
      const res = await api.get(`/admin/verifications/${item.type}/${item.id}`)
      setSelected(res.data.item)
      // The details are below the table: scroll to them
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (err) {
      setNotice({ type: 'error', text: t(`errors.${errorCode(err)}`) })
    }
  }

  async function onDecided() {
    setNotice({ type: 'success', text: t('admin.decided') })
    const res = await api.get(`/admin/verifications/${selected.type}/${selected.id}`)
    setSelected(res.data.item)
    await load()
  }

  const counts = data?.counts || {}
  const statusOptions = STATUSES.map((s) => ({
    value: s,
    label: s === 'all' ? t('table.allStatuses') : t(`admin.${s}`),
    count: s === 'all' ? (counts.pending || 0) + (counts.approved || 0) + (counts.rejected || 0) : counts[s] || 0,
  }))
  const typeOptions = TYPE_FILTERS.map((f) => ({ value: f.value, label: t(f.label) }))
  const items = data?.items || []
  const rows = items.filter((item) => matches(search, item.name, item.owner?.email, item.owner?.full_name, item.sector))

  const columns = [
    { key: 'name', header: t('table.name'), primary: true, render: (item) => item.name },
    { key: 'email', header: t('table.email'), render: (item) => <span className="break-all">{item.owner?.email}</span> },
    {
      key: 'type',
      header: t('table.type'),
      render: (item) => (item.org_type ? `${t(`admin.${item.type}`)} · ${t(`orgTypes.${item.org_type}`)}` : t(`admin.${item.type}`)),
    },
    { key: 'district', header: t('table.district'), render: (item) => `${t(`districts.${item.district}`)}, ${item.sector}` },
    { key: 'registered', header: t('table.registered'), render: (item) => <span className="whitespace-nowrap">{formatDate(item.created_at)}</span> },
    { key: 'status', header: t('table.status'), render: (item) => <VerificationBadge status={item.verification_status} /> },
    {
      key: 'actions',
      header: t('table.actions'),
      full: true,
      render: (item) => (
        // The spoken name includes the organisation, so each "Open" button is unique
        <Button variant="secondary" onClick={() => open(item)} aria-label={`${t('table.open')}: ${item.name}`}>
          {t('table.open')}
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('admin.queueTitle')} meta={data && countLabel(t, rows.length)} />
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('table.searchNameEmail')} />
        <FilterSelect label={t('table.byStatus')} value={status} onChange={setStatus} options={statusOptions} />
        <FilterSelect label={t('table.byType')} value={type} onChange={setType} options={typeOptions} />
      </Toolbar>

      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      {error && <ErrorState code={error} onRetry={retry} />}

      <WithFilters
        panel={
          <FilterPanel
            groups={[
              { label: t('table.byStatus'), value: status, onChange: setStatus, options: statusOptions },
              { label: t('table.byType'), value: type, onChange: setType, options: typeOptions },
            ]}
          />
        }
      >
        {!data && !error && <PageLoader />}
        {data && (
          <DataTable
            caption={t('admin.queueTitle')}
            columns={columns}
            rows={rows}
            rowKey={(item) => `${item.type}-${item.id}`}
            empty={search ? t('table.noMatch') : t('admin.empty')}
          />
        )}
        <div ref={detailRef} className="scroll-mt-20">
          {selected && (
            <Detail
              key={`${selected.type}-${selected.id}-${selected.verification_status}`}
              item={selected}
              onDecided={onDecided}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </WithFilters>
    </div>
  )
}
