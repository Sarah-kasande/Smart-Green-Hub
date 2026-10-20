// Surplus requests (FR10, FR11), for both sides:
//  - operator: approve or decline, then confirm the hand-over (with land cleared)
//  - institution: cancel, then confirm receipt (with the planting site)
// Stock is reduced only when BOTH have confirmed.
import { useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import { Pill, StatusBadge } from '../../components/ui/Badges'
import { EmptyState, Fact, PageHeader, Segmented } from '../../components/ui/Layout'
import { SelectField, TextField } from '../../components/ui/Fields'
import { DISTRICTS } from '../../utils/options'
import { formatDate, formatDateTime, formatNumber, formatRWF } from '../../utils/format'

const FILTERS = ['pending', 'approved', 'fulfilled', 'all']

function Confirm({ request, side, institutionDistrict, onDone }) {
  const { t } = useI18n()
  const [land, setLand] = useState('')
  const [site, setSite] = useState('')
  const [district, setDistrict] = useState(institutionDistrict || '')
  const [busy, setBusy] = useState(false)
  const [fields, setFields] = useState({})

  async function submit(event) {
    event.preventDefault()
    if (side === 'institution' && !site.trim()) return setFields({ planting_site: 'required' })
    setBusy(true)
    try {
      const body = side === 'operator' ? { land_cleared_sqm: land === '' ? 0 : Number(land) } : { planting_site: site.trim(), planting_district: district || null }
      const res = await api.post(`/${side}/requests/${request.id}/confirm`, body)
      onDone({ type: 'success', text: res.data.completed ? 'requests.completed' : 'requests.confirmedWaiting' })
    } catch (err) {
      setFields(fieldErrors(err))
      onDone({ type: 'error', text: `errors.${errorCode(err)}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-canvas p-3" noValidate>
      <p className="font-semibold">{side === 'operator' ? t('requests.confirmHandoverTitle') : t('requests.confirmReceiptTitle')}</p>
      {side === 'operator' ? (
        <TextField label={t('requests.landCleared')} type="number" min="0" step="0.1" value={land} onChange={(e) => setLand(e.target.value)} hint={t('requests.landClearedHint')} optional />
      ) : (
        <>
          <TextField label={t('requests.plantingSite')} value={site} onChange={(e) => setSite(e.target.value)} error={fields.planting_site} maxLength={255} placeholder={t('requests.plantingSiteExample')} />
          <SelectField label={t('auth.district')} value={district} onChange={(e) => setDistrict(e.target.value)} options={DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))} />
        </>
      )}
      <Button type="submit" icon="check" disabled={busy}>
        {side === 'operator' ? t('requests.confirmHandover') : t('requests.confirmReceipt')}
      </Button>
    </form>
  )
}

function RequestCard({ request, side, institutionDistrict, onChanged }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const other = side === 'operator' ? request.institution : request.nursery
  const myConfirm = side === 'operator' ? request.nursery_confirmed_at : request.institution_confirmed_at
  const theirConfirm = side === 'operator' ? request.institution_confirmed_at : request.nursery_confirmed_at

  async function act(url, body, okText) {
    setBusy(true)
    try {
      await api.post(url, body)
      onChanged({ type: 'success', text: okText })
    } catch (err) {
      onChanged({ type: 'error', text: `errors.${errorCode(err)}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">
            {formatNumber(request.quantity_requested)} × {request.species}
          </p>
          <p className="text-sm text-ink-soft">
            {side === 'operator' ? request.institution?.name : request.nursery?.name} · {formatDateTime(request.created_at)}
          </p>
        </div>
        <StatusBadge group="requestStatus" status={request.status} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Fact label={t('requests.purpose')}>{request.purpose}</Fact>
        <Fact label={t('listings.offerType')}>{request.offer_type === 'free' ? t('listings.free') : t('board.priceEach', { price: formatRWF(request.discounted_price) })}</Fact>
        {side === 'operator' && request.institution && (
          <Fact label={t('requests.from')}>
            {t(`orgTypes.${request.institution.org_type}`)} · {t(`districts.${request.institution.district}`)}, {request.institution.sector}
          </Fact>
        )}
        {other?.contact_phone && (
          <Fact label={t('requests.contact')}>
            {other.contact_name} ·{' '}
            <a className="text-teal-text underline" href={`tel:${other.contact_phone}`}>
              {other.contact_phone}
            </a>
          </Fact>
        )}
        {side === 'institution' && request.pickup_note && <Fact label={t('listings.pickupNote')}>{request.pickup_note}</Fact>}
        {side === 'institution' && request.nursery && (
          <Fact label={t('requests.where')}>
            {t(`districts.${request.nursery.district}`)}, {request.nursery.sector}
            {request.nursery.address_text ? ` · ${request.nursery.address_text}` : ''}
          </Fact>
        )}
      </dl>
      {request.decision_reason && <Notice type={request.status === 'declined' ? 'warning' : 'info'}>{t('requests.reasonGiven', { reason: request.decision_reason })}</Notice>}

      {request.status === 'approved' && (
        <div className="flex flex-wrap gap-2">
          <Pill tone={request.nursery_confirmed_at ? 'green' : 'grey'} icon={request.nursery_confirmed_at ? 'check' : 'clock'}>
            {t('requests.nurseryConfirmed')}
          </Pill>
          <Pill tone={request.institution_confirmed_at ? 'green' : 'grey'} icon={request.institution_confirmed_at ? 'check' : 'clock'}>
            {t('requests.institutionConfirmed')}
          </Pill>
        </div>
      )}
      {request.status === 'fulfilled' && (
        <p className="flex items-center gap-2 text-sm text-leaf-text">
          <Icon name="check" size={16} />
          {t('requests.fulfilledOn', { date: formatDate(request.fulfilled_at), site: request.planting_site || '' })}
        </p>
      )}

      {side === 'operator' && request.status === 'pending' && (
        <div className="space-y-2 border-t border-line pt-3">
          <TextField label={t('requests.reason')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} optional />
          <div className="flex flex-wrap gap-2">
            <Button icon="check" disabled={busy} onClick={() => act(`/operator/requests/${request.id}/decision`, { decision: 'approve', reason: reason || null }, 'requests.approved')}>
              {t('requests.approve')}
            </Button>
            <Button variant="danger" icon="close" disabled={busy} onClick={() => act(`/operator/requests/${request.id}/decision`, { decision: 'decline', reason: reason || null }, 'requests.declined')}>
              {t('requests.decline')}
            </Button>
          </div>
        </div>
      )}

      {request.status === 'approved' && !myConfirm && <Confirm request={request} side={side} institutionDistrict={institutionDistrict} onDone={onChanged} />}
      {request.status === 'approved' && myConfirm && !theirConfirm && <Notice type="info">{t('requests.waitingOther')}</Notice>}

      {side === 'institution' && ['pending', 'approved'].includes(request.status) && !myConfirm && (
        <Button variant="ghost" icon="close" disabled={busy} onClick={() => window.confirm(t('requests.cancelConfirm')) && act(`/institution/requests/${request.id}/cancel`, {}, 'requests.cancelled')}>
          {t('requests.cancel')}
        </Button>
      )}
    </Card>
  )
}

export default function Requests() {
  const { t } = useI18n()
  const { user, organisation } = useAuth()
  const side = user.role === 'operator' ? 'operator' : 'institution'
  const [status, setStatus] = useState('pending')
  const { data, error, reload } = useApi(`/${side}/requests?status=${status}`)
  const [notice, setNotice] = useState(null)

  function changed(message) {
    setNotice(message)
    reload()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={t('requests.title')} intro={side === 'operator' ? t('requests.introOperator') : t('requests.introInstitution')} />
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      <Segmented label={t('requests.title')} value={status} onChange={setStatus} options={FILTERS.map((f) => ({ value: f, label: f === 'all' ? t('common.all') : t(`requestStatus.${f}`) }))} />
      {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      {!data && !error && <PageLoader />}
      {data && data.requests.length === 0 && <EmptyState icon="inbox" title={t('requests.empty')} />}
      {data && data.requests.length > 0 && (
        <ul className="space-y-4">
          {data.requests.map((r) => (
            <li key={r.id}>
              <RequestCard request={r} side={side} institutionDistrict={organisation?.district} onChanged={changed} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
