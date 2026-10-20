// Administrator: approve nurseries and institutions, or ask them to correct their details
// (FR02, FR15). Layout follows design/admin verification.png: list on the left, details on the right.
import { useCallback, useEffect, useRef, useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import VerificationBadge from '../../components/ui/VerificationBadge'
import { TextArea } from '../../components/ui/Fields'
import { formatDate } from '../../utils/format'
import { DocumentList } from '../account/Documents'

const STATUS_TABS = ['pending', 'approved', 'rejected', 'all']
const TYPE_FILTERS = [
  { value: 'all', label: 'admin.filterAll' },
  { value: 'nursery', label: 'admin.filterNursery' },
  { value: 'institution', label: 'admin.filterInstitution' },
]

function Detail({ item, onDecided }) {
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
    <Card className="space-y-4">
      <div className="rounded-xl bg-navy p-4 text-white">
        <p className="text-sm text-white/70">
          {t(`admin.${item.type}`)}
          {item.org_type && ` · ${t(`orgTypes.${item.org_type}`)}`}
        </p>
        <h2 className="text-xl font-bold">{item.name}</h2>
        <p className="mt-1 text-sm text-white/80">{t('admin.registered', { date: formatDate(item.created_at) })}</p>
      </div>
      <VerificationBadge status={item.verification_status} />

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">{t('auth.district')}</dt>
          <dd className="text-ink-soft">{t(`districts.${item.district}`)}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t('auth.sector')}</dt>
          <dd className="text-ink-soft">{item.sector}</dd>
        </div>
        {item.address_text && (
          <div className="sm:col-span-2">
            <dt className="font-semibold">{t('auth.address')}</dt>
            <dd className="text-ink-soft">{item.address_text}</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="font-semibold">{t('admin.owner')}</dt>
          <dd className="text-ink-soft">
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
        <h3 className="mb-2 font-bold">{t('admin.documents')}</h3>
        <DocumentList documents={item.documents || []} emptyText={t('admin.noDocuments')} />
      </div>

      {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}

      {item.verification_status === 'pending' && (
        <div className="space-y-3 border-t border-line pt-4">
          {rejecting ? (
            <>
              <TextArea label={t('admin.reason')} value={reason} onChange={(e) => setReason(e.target.value)} error={reasonError} maxLength={500} />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="danger" icon="alert" onClick={() => decide('reject')} disabled={busy}>
                  {t('admin.confirmReject')}
                </Button>
                <Button variant="secondary" icon="close" onClick={() => setRejecting(false)} disabled={busy}>
                  {t('common.cancel')}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button icon="check" onClick={() => decide('approve')} disabled={busy}>
                {t('admin.approve')}
              </Button>
              <Button variant="danger" icon="edit" onClick={() => setRejecting(true)} disabled={busy}>
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
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState(null)
  const detailRef = useRef(null)

  const fetchQueue = useCallback(() => api.get('/admin/verifications', { params: { status, type } }), [status, type])

  // Reload the list whenever the status tab or type filter changes
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
    const res = await api.get(`/admin/verifications/${item.type}/${item.id}`)
    setSelected(res.data.item)
    // On a phone the details are below the list: scroll to them
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function onDecided() {
    setNotice(t('admin.decided'))
    const res = await api.get(`/admin/verifications/${selected.type}/${selected.id}`)
    setSelected(res.data.item)
    await load()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('admin.queueTitle')}</h1>
        <p className="mt-1 text-ink-soft">{t('admin.queueIntro')}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('admin.queueTitle')}>
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={`min-h-12 rounded-xl px-4 font-semibold ${status === s ? 'bg-navy text-white' : 'border border-line bg-surface text-ink'}`}
          >
            {t(`admin.${s}`)}
            {data && s !== 'all' && (
              <span className={`ml-2 rounded-full px-2 text-sm ${status === s ? 'bg-white/20' : 'bg-canvas'}`}>{data.counts[s]}</span>
            )}
          </button>
        ))}
        <select
          aria-label={t('admin.filterAll')}
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="min-h-12 rounded-xl border border-line bg-surface px-3 font-semibold"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {t(f.label)}
            </option>
          ))}
        </select>
      </div>

      {notice && <Notice type="success">{notice}</Notice>}
      {error && <ErrorState code={error} onRetry={retry} />}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          {!data && !error && <PageLoader />}
          {data && data.items.length === 0 && (
            <Card className="flex items-center gap-3 text-ink-soft">
              <Icon name="check" className="text-leaf-text" />
              {t('admin.empty')}
            </Card>
          )}
          {data && data.items.length > 0 && (
            <ul className="space-y-3">
              {data.items.map((item) => {
                const active = selected && selected.type === item.type && selected.id === item.id
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => open(item)}
                      aria-current={active ? 'true' : undefined}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
                        active ? 'border-leaf bg-leaf-light/60' : 'border-line bg-surface hover:bg-canvas'
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-leaf-text">
                        <Icon name={item.type === 'nursery' ? 'sprout' : 'building'} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{item.name}</span>
                        <span className="block text-sm text-ink-soft">
                          {t(`admin.${item.type}`)}
                          {item.org_type && ` · ${t(`orgTypes.${item.org_type}`)}`} · {t(`districts.${item.district}`)}, {item.sector}
                        </span>
                        <span className="mt-2 block">
                          <VerificationBadge status={item.verification_status} />
                        </span>
                      </span>
                      <Icon name="arrowRight" className="mt-2 text-ink-soft" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div ref={detailRef} className="scroll-mt-20">
          {selected ? (
            <Detail key={`${selected.type}-${selected.id}-${selected.verification_status}`} item={selected} onDecided={onDecided} />
          ) : (
            <Card className="hidden text-ink-soft lg:block">{t('admin.select')}</Card>
          )}
        </div>
      </div>
    </div>
  )
}
