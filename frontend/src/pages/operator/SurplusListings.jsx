// The operator's Surplus Board listings (FR09): post plants from a batch, free or discounted,
// see what is reserved and handed over, and withdraw.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import { useBatches } from '../../offline/useOfflineData'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/Badges'
import { EmptyState, Fact, PageHeader } from '../../components/ui/Layout'
import { SelectField, TextField } from '../../components/ui/Fields'
import { addDaysIso, formatDate, formatNumber, formatRWF, todayIso } from '../../utils/format'

function NewListingForm({ initialBatch, onCreated, onCancel }) {
  const { t } = useI18n()
  const { batches } = useBatches()
  const options = (batches || []).filter((b) => b.id && b.stage !== 'cleared' && (b.available ?? 0) > 0)
  const [form, setForm] = useState({
    batch_id: initialBatch || '',
    quantity: '',
    offer_type: 'free',
    discounted_price: '',
    pickup_note: '',
    available_from: todayIso(),
    expires_at: addDaysIso(todayIso(), 14),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const chosen = options.find((b) => String(b.id) === String(form.batch_id))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    try {
      await api.post('/operator/listings', {
        batch_id: Number(form.batch_id) || 0,
        quantity: Number(form.quantity) || 0,
        offer_type: form.offer_type,
        discounted_price: form.offer_type === 'discounted' ? Number(form.discounted_price) || 0 : null,
        pickup_note: form.pickup_note || null,
        available_from: form.available_from,
        expires_at: form.expires_at,
      })
      onCreated()
    } catch (err) {
      setError({ code: errorCode(err), details: err.response?.data?.details })
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && error.code !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error.code}`, { available: error.details?.available ?? '' })}</Notice>}
      {options.length === 0 && batches && <Notice type="info">{t('listings.noBatches')}</Notice>}
      <SelectField
        label={t('sales.batch')}
        value={form.batch_id}
        onChange={set('batch_id')}
        error={fields.batch_id}
        placeholder={t('auth.choose')}
        options={options.map((b) => ({ value: b.id, label: `${b.species?.common_name} #${b.id} · ${t(`stages.${b.stage}`)} · ${t('batches.available', { n: formatNumber(b.available) })}` }))}
      />
      <TextField
        label={t('listings.quantity')}
        type="number"
        min="1"
        max={chosen?.available}
        value={form.quantity}
        onChange={set('quantity')}
        error={fields.quantity}
        hint={chosen ? t('batches.available', { n: formatNumber(chosen.available) }) : null}
      />
      <fieldset>
        <legend className="text-sm font-semibold">{t('listings.offerType')}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {['free', 'discounted'].map((type) => (
            <label key={type} className={`flex min-h-12 items-center gap-3 rounded-xl border-2 p-3 ${form.offer_type === type ? 'border-leaf bg-leaf-light/50' : 'border-line'}`}>
              <input type="radio" name="offer_type" value={type} checked={form.offer_type === type} onChange={set('offer_type')} className="h-5 w-5 accent-leaf" />
              {t(`listings.${type}`)}
            </label>
          ))}
        </div>
      </fieldset>
      {form.offer_type === 'discounted' && (
        <TextField label={t('listings.price')} type="number" min="1" value={form.discounted_price} onChange={set('discounted_price')} error={fields.discounted_price} hint={t('listings.priceHint')} />
      )}
      <TextField label={t('listings.pickupNote')} value={form.pickup_note} onChange={set('pickup_note')} maxLength={255} optional placeholder={t('listings.pickupExample')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('listings.availableFrom')} type="date" value={form.available_from} onChange={set('available_from')} error={fields.available_from} />
        <TextField label={t('listings.expiresAt')} type="date" value={form.expires_at} onChange={set('expires_at')} error={fields.expires_at} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" icon="board" disabled={busy}>
          {busy ? t('common.saving') : t('listings.publish')}
        </Button>
        <Button variant="secondary" icon="close" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

function ListingCard({ listing, onWithdraw }) {
  const { t } = useI18n()
  const open = ['active', 'reserved'].includes(listing.status)
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{listing.species?.name}</p>
          <p className="text-sm text-ink-soft">
            {t('listings.fromBatch', { id: listing.batch_id })} · {listing.offer_type === 'free' ? t('listings.free') : t('board.priceEach', { price: formatRWF(listing.discounted_price) })}
          </p>
        </div>
        <StatusBadge group="listingStatus" status={listing.status} />
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label={t('listings.offered')}>{formatNumber(listing.quantity_offered)}</Fact>
        <Fact label={t('listings.reservedLabel')}>{formatNumber(listing.reserved)}</Fact>
        <Fact label={t('listings.handedOver')}>{formatNumber(listing.fulfilled)}</Fact>
        <Fact label={t('listings.remaining')}>{formatNumber(listing.remaining)}</Fact>
      </dl>
      <p className="text-sm text-ink-soft">
        {t('listings.dates', { from: formatDate(listing.available_from), to: formatDate(listing.expires_at) })}
        {listing.pickup_note ? ` · ${listing.pickup_note}` : ''}
      </p>
      {open && (
        <Button variant="ghost" icon="close" onClick={() => onWithdraw(listing)}>
          {t('listings.withdraw')}
        </Button>
      )}
    </Card>
  )
}

export default function SurplusListings() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const creating = params.get('new') === '1'
  const { data, error, reload } = useApi('/operator/listings')
  const [notice, setNotice] = useState(null)

  async function withdraw(listing) {
    const reason = window.prompt(t('listings.withdrawReason'))
    if (reason === null) return
    try {
      await api.post(`/operator/listings/${listing.id}/withdraw`, { reason: reason || null })
      setNotice({ type: 'success', text: 'listings.withdrawn' })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={t('listings.title')}
        intro={t('listings.intro')}
        actions={
          !creating && (
            <Button icon="board" onClick={() => setParams({ new: '1' })}>
              {t('listings.new')}
            </Button>
          )
        }
      />
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      {creating && (
        <Card className="max-w-2xl">
          <h2 className="mb-3 text-lg font-bold">{t('listings.new')}</h2>
          <NewListingForm
            initialBatch={params.get('batch') || ''}
            onCreated={() => {
              setParams({})
              setNotice({ type: 'success', text: 'listings.created' })
              reload()
            }}
            onCancel={() => setParams({})}
          />
        </Card>
      )}
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && data.listings.length === 0 && !creating && <EmptyState icon="board" title={t('listings.empty')} text={t('listings.emptyText')} />}
      {data && data.listings.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.listings.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} onWithdraw={withdraw} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
