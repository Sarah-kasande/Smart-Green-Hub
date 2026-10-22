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
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import { EmptyState, PageHeader } from '../../components/ui/Layout'
import { TextField } from '../../components/ui/Fields'
import { FilterPanel, FilterSelect, SearchBox, Toolbar, ViewToggle, WithFilters } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
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
        <Button type="submit" disabled={busy}>
          {t('board.send')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
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
          <p className="text-lg font-semibold">{listing.species?.name}</p>
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
          <Button onClick={() => setOpen(true)}>
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
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const { data, error, reload } = useApi(`/board${qs({ district, category })}`)
  const [notice, setNotice] = useState(null)

  const listings = (data?.listings || []).filter((l) => matches(search, l.species?.name, l.species?.kinyarwanda_name, l.nursery?.name))

  // Several listings from the same nursery share one point on the map
  const points = []
  for (const l of listings) {
    if (!l.nursery) continue
    const existing = points.find((p) => p.id === l.nursery.id)
    const line = `${l.species?.name}: ${t('board.left', { n: formatNumber(l.remaining) })}`
    if (existing) existing.lines.push(line)
    else points.push({ id: l.nursery.id, lat: l.nursery.latitude, lng: l.nursery.longitude, title: l.nursery.name, lines: [line] })
  }
  const withoutLocation = listings.filter((l) => l.nursery?.latitude === null).length

  const districtOptions = [{ value: '', label: t('table.allDistricts') }, ...DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))]
  const categoryOptions = [{ value: '', label: t('table.allPlantTypes') }, ...CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('board.title')} meta={data && countLabel(t, listings.length)} />
      {notice && (
        <Notice type="success">
          {t(notice)}{' '}
          <Link to="/institution/requests" className="font-semibold underline">
            {t('nav.myRequests')}
          </Link>
        </Notice>
      )}
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('table.searchBoard')} />
        <FilterSelect label={t('table.byDistrict')} value={district} onChange={setDistrict} options={districtOptions} />
        <FilterSelect label={t('table.byPlantType')} value={category} onChange={setCategory} options={categoryOptions} />
        <ViewToggle
          always
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: t('table.cards') },
            { value: 'map', label: t('board.map') },
          ]}
        />
      </Toolbar>
      {error && <ErrorState code={error} onRetry={reload} />}
      <WithFilters
        panel={
          <FilterPanel
            groups={[
              { label: t('table.byDistrict'), value: district, onChange: setDistrict, options: districtOptions },
              { label: t('table.byPlantType'), value: category, onChange: setCategory, options: categoryOptions },
            ]}
          />
        }
      >
        {!data && !error && <PageLoader />}
        {data && listings.length === 0 && <EmptyState title={search ? t('table.noMatch') : t('board.empty')} text={search ? null : t('board.emptyText')} />}
        {listings.length > 0 && view === 'map' && (
          <>
            <Suspense fallback={<PageLoader />}>
              <PointsMap points={points} label={t('board.map')} height={440} />
            </Suspense>
            {withoutLocation > 0 && <p className="text-sm text-ink-soft">{t('board.noLocation', { n: withoutLocation })}</p>}
          </>
        )}
        {listings.length > 0 && view === 'list' && (
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {listings.map((l) => (
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
      </WithFilters>
    </div>
  )
}
