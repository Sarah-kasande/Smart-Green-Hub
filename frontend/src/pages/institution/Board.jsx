// Surplus Board for receiving institutions (FR10): browse active listings as a list or on the
// map, filter by plant type and district, and request a quantity with a planting purpose.
import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorCode, fieldErrors } from '../../api/client'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import { EmptyState, PageHeader, Segmented } from '../../components/ui/Layout'
import { SelectField, TextField } from '../../components/ui/Fields'
import { DISTRICTS } from '../../utils/options'
import { formatDate, formatNumber, formatRWF } from '../../utils/format'

// The map library is large: load it only when a map is shown
const PointsMap = lazy(() => import('../../components/map/Maps').then((m) => ({ default: m.PointsMap })))

const CATEGORIES = ['flower', 'tree', 'shrub', 'other']

function RequestForm({ listing, onDone, onCancel }) {
  const { t } = useI18n()
  const [quantity, setQuantity] = useState('')
  const [purpose, setPurpose] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post(`/institution/listings/${listing.id}/requests`, { quantity: Number(quantity) || 0, purpose })
      onDone(res.data.duplicate ? 'board.already' : 'board.sent')
    } catch (err) {
      setError({ code: errorCode(err), details: err.response?.data?.details })
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-canvas p-3" noValidate>
      {error && error.code !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error.code}`, { remaining: error.details?.remaining ?? '' })}</Notice>}
      <TextField label={t('board.quantity')} type="number" min="1" max={listing.remaining} value={quantity} onChange={(e) => setQuantity(e.target.value)} error={fields.quantity} hint={t('board.left', { n: formatNumber(listing.remaining) })} />
      <TextField label={t('board.purpose')} value={purpose} onChange={(e) => setPurpose(e.target.value)} error={fields.purpose} maxLength={255} placeholder={t('board.purposeExample')} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" icon="check" disabled={busy}>
          {t('board.send')}
        </Button>
        <Button variant="ghost" icon="close" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

function ListingCard({ listing, onRequested }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{listing.species?.name}</p>
          {listing.species?.kinyarwanda_name && <p className="text-sm text-ink-soft">{listing.species.kinyarwanda_name}</p>}
        </div>
        {listing.offer_type === 'free' ? (
          <Pill tone="green" icon="check">
            {t('listings.free')}
          </Pill>
        ) : (
          <Pill tone="blue" icon="wallet">
            {t('board.priceEach', { price: formatRWF(listing.discounted_price) })}
          </Pill>
        )}
      </div>
      <p className="font-semibold">{t('board.left', { n: formatNumber(listing.remaining) })}</p>
      <p className="text-sm text-ink-soft">
        {listing.nursery?.name} · {t(`districts.${listing.nursery?.district}`)}, {listing.nursery?.sector}
      </p>
      <p className="text-sm text-ink-soft">
        {t('board.until', { date: formatDate(listing.expires_at) })}
        {listing.pickup_note ? ` · ${listing.pickup_note}` : ''}
      </p>
      <div className="mt-auto">
        {open ? (
          <RequestForm
            listing={listing}
            onCancel={() => setOpen(false)}
            onDone={(text) => {
              setOpen(false)
              onRequested(text)
            }}
          />
        ) : (
          <Button icon="inbox" onClick={() => setOpen(true)}>
            {t('board.request')}
          </Button>
        )}
      </div>
    </Card>
  )
}

export default function Board() {
  const { t } = useI18n()
  const [district, setDistrict] = useState('')
  const [category, setCategory] = useState('')
  const [view, setView] = useState('list')
  const { data, error, reload } = useApi(`/board${qs({ district, category })}`)
  const [notice, setNotice] = useState(null)

  // Several listings from the same nursery share one point on the map
  const points = []
  for (const l of data?.listings || []) {
    const existing = points.find((p) => p.id === l.nursery.id)
    const line = `${l.species?.name}: ${t('board.left', { n: formatNumber(l.remaining) })}`
    if (existing) existing.lines.push(line)
    else points.push({ id: l.nursery.id, lat: l.nursery.latitude, lng: l.nursery.longitude, title: l.nursery.name, lines: [line] })
  }
  const withoutLocation = (data?.listings || []).filter((l) => l.nursery.latitude === null).length

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={t('board.title')} intro={t('board.intro')} />
      {notice && (
        <Notice type="success">
          {t(notice)}{' '}
          <Link to="/institution/requests" className="font-semibold underline">
            {t('nav.requests')}
          </Link>
        </Notice>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label={t('auth.district')} value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t('common.all')} options={DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))} />
        <SelectField label={t('board.plantType')} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('common.all')} options={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))} />
        <div className="flex items-end">
          <Segmented
            label={t('board.view')}
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: t('board.list') },
              { value: 'map', label: t('board.map') },
            ]}
          />
        </div>
      </div>
      {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      {!data && !error && <PageLoader />}
      {data && data.listings.length === 0 && <EmptyState icon="board" title={t('board.empty')} text={t('board.emptyText')} />}
      {data && data.listings.length > 0 && view === 'map' && (
        <>
          <Suspense fallback={<PageLoader />}>
            <PointsMap points={points} label={t('board.map')} height={440} />
          </Suspense>
          {withoutLocation > 0 && <p className="text-sm text-ink-soft">{t('board.noLocation', { n: withoutLocation })}</p>}
        </>
      )}
      {data && data.listings.length > 0 && view === 'list' && (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.listings.map((l) => (
            <li key={l.id}>
              <ListingCard
                listing={l}
                onRequested={(text) => {
                  setNotice(text)
                  reload()
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
