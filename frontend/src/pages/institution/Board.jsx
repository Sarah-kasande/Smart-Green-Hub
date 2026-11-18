// Surplus Board for receiving institutions (FR10, docs/DEVIATIONS.md W42). Two views:
//   Surplus offers    listings a nursery posted (free or discounted), often after a risk alert
//   Available plants  ready batches nurseries can supply (only what is truly free, and only when the
//                     nursery has "Show to institutions" on)
// Both as cards or on the map, with the same filters, and the same "Request plants" form
// (quantity, purpose, preferred pickup date, message). Request-and-approve only: no cart, no payment.
import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorCode, fieldErrors } from '../../api/client'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import ResponsiveDialog from '../../components/ui/ResponsiveDialog'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import { EmptyState, PageHeader } from '../../components/ui/Layout'
import { TextArea, TextField } from '../../components/ui/Fields'
import { FilterPanel, FilterSelect, SearchBox, TabBar, Toolbar, ViewToggle, WithFilters } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { DISTRICTS } from '../../utils/options'
import { formatDate, formatNumber, formatRWF, todayIso } from '../../utils/format'

// The map library is large: load it only when a map is shown
const PointsMap = lazy(() => import('../../components/map/Maps').then((m) => ({ default: m.PointsMap })))

const CATEGORIES = ['flower', 'tree', 'shrub', 'other']

// Both kinds of item in one shape, so the cards, the map and the form are shared
function fromOffer(l) {
  return {
    key: `offer-${l.id}`,
    kind: 'offer',
    species: l.species,
    quantity: l.remaining,
    nursery: l.nursery,
    free: l.offer_type === 'free',
    price: l.offer_type === 'discounted' ? l.discounted_price : null,
    until: l.expires_at,
    note: l.pickup_note,
    requestUrl: `/institution/listings/${l.id}/requests`,
  }
}
function fromAvailable(p) {
  return {
    key: `plant-${p.id}`,
    kind: 'available',
    species: p.species,
    quantity: p.available,
    nursery: p.nursery,
    price: p.unit_price,
    from: p.available_from,
    requestUrl: `/institution/available-plants/${p.id}/requests`,
  }
}

function RequestForm({ item, onDone, onCancel }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ quantity: '', purpose: '', preferred_pickup_date: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post(item.requestUrl, {
        quantity: Number(form.quantity) || 0,
        purpose: form.purpose,
        preferred_pickup_date: form.preferred_pickup_date || null,
        message: form.message.trim() || null,
      })
      onDone(res.data.duplicate ? 'board.already' : 'board.sent')
    } catch (err) {
      setError({ code: errorCode(err), details: err.response?.data?.details })
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && error.code !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error.code}`, { remaining: error.details?.remaining ?? '' })}</Notice>}
      <TextField label={t('board.quantity')} type="number" min="1" max={item.quantity} value={form.quantity} onChange={set('quantity')} error={fields.quantity} hint={t('board.left', { n: formatNumber(item.quantity) })} />
      <TextField label={t('board.purpose')} value={form.purpose} onChange={set('purpose')} error={fields.purpose} maxLength={255} placeholder={t('board.purposeExample')} />
      <TextField label={t('board.pickupDate')} type="date" min={todayIso()} value={form.preferred_pickup_date} onChange={set('preferred_pickup_date')} error={fields.preferred_pickup_date} optional />
      <TextArea label={t('board.message')} value={form.message} onChange={set('message')} error={fields.message} maxLength={500} optional />
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

function ItemCard({ item, onRequested }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <Card className="flex h-full flex-col gap-3 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">{item.species?.name}</p>
          <p className="text-sm text-ink-soft">
            {item.species?.kinyarwanda_name ? `${item.species.kinyarwanda_name} · ` : ''}
            {t(`categories.${item.species?.category}`)}
          </p>
        </div>
        {item.kind === 'offer' && item.free && (
          <Pill tone="green" icon="check">
            {t('listings.free')}
          </Pill>
        )}
      </div>
      <p className="font-semibold">{t('board.left', { n: formatNumber(item.quantity) })}</p>
      {item.price ? <p className="text-sm">{t('board.priceEach', { price: formatRWF(item.price) })}</p> : null}
      <p className="text-sm text-ink-soft">
        {item.nursery?.name} · {t(`districts.${item.nursery?.district}`)}, {item.nursery?.sector}
      </p>
      <p className="text-sm text-ink-soft">
        {item.kind === 'offer' ? t('board.until', { date: formatDate(item.until) }) : t('board.pickupFrom', { date: formatDate(item.from) })}
        {item.note ? ` · ${item.note}` : ''}
      </p>
      <div className="mt-auto pt-1">
        <Button full onClick={() => setOpen(true)}>
          {t('board.request')}
        </Button>
      </div>
      {/* The request form: a dialog on wide screens, a bottom sheet on phones */}
      <ResponsiveDialog open={open} onOpenChange={setOpen} title={`${t('board.request')}: ${item.species?.name || ''}`} description={`${item.nursery?.name} · ${t('board.left', { n: formatNumber(item.quantity) })}`}>
        <RequestForm
          item={item}
          onCancel={() => setOpen(false)}
          onDone={(text) => {
            setOpen(false)
            onRequested(text)
          }}
        />
      </ResponsiveDialog>
    </Card>
  )
}

export default function Board() {
  const { t } = useI18n()
  const [kind, setKind] = useState('offer') // 'offer' = Surplus offers, 'available' = Available plants
  const [district, setDistrict] = useState('')
  const [category, setCategory] = useState('')
  const [speciesId, setSpeciesId] = useState('')
  const [minQuantity, setMinQuantity] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const [notice, setNotice] = useState(null)
  const filters = { district, category, species_id: speciesId }
  // Only the open view is loaded
  const offers = useApi(kind === 'offer' ? `/board${qs(filters)}` : null)
  const available = useApi(kind === 'available' ? `/institution/available-plants${qs(filters)}` : null)
  const speciesList = useApi('/species')
  const current = kind === 'offer' ? offers : available
  const raw = kind === 'offer' ? (offers.data?.listings || []).map(fromOffer) : (available.data?.plants || []).map(fromAvailable)
  const atLeast = Number(minQuantity) || 0
  const items = raw.filter((i) => i.quantity >= atLeast && matches(search, i.species?.name, i.species?.kinyarwanda_name, i.nursery?.name))

  // Several items from the same nursery share one point on the map
  const points = []
  for (const item of items) {
    if (!item.nursery) continue
    const existing = points.find((p) => p.id === item.nursery.id)
    const line = `${item.species?.name}: ${t('board.left', { n: formatNumber(item.quantity) })}`
    if (existing) existing.lines.push(line)
    else points.push({ id: item.nursery.id, lat: item.nursery.latitude, lng: item.nursery.longitude, title: item.nursery.name, lines: [line] })
  }
  const withoutLocation = items.filter((i) => i.nursery?.latitude === null).length

  const districtOptions = [{ value: '', label: t('table.allDistricts') }, ...DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))]
  const categoryOptions = [{ value: '', label: t('table.allPlantTypes') }, ...CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))]
  const speciesOptions = [{ value: '', label: t('board.allSpecies') }, ...(speciesList.data?.species || []).map((s) => ({ value: String(s.id), label: s.common_name }))]
  const loaded = Boolean(current.data)
  const emptyTitle = kind === 'offer' ? t('board.empty') : t('board.emptyAvailable')

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('board.title')} meta={loaded && countLabel(t, items.length)} />
      <TabBar
        label={t('board.title')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'offer', label: t('board.offers') },
          { value: 'available', label: t('board.available') },
        ]}
      />
      <p className="text-sm text-ink-soft">{kind === 'offer' ? t('board.offersIntro') : t('board.availableIntro')}</p>
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
        <FilterSelect label={t('board.bySpecies')} value={speciesId} onChange={setSpeciesId} options={speciesOptions} />
        <input
          type="number"
          min="1"
          inputMode="numeric"
          value={minQuantity}
          onChange={(e) => setMinQuantity(e.target.value)}
          aria-label={t('board.minQuantity')}
          placeholder={t('board.minQuantity')}
          className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink shadow-xs placeholder:text-ink-soft focus:border-teal focus:outline-none sm:w-44"
        />
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
      {current.error && <ErrorState code={current.error} onRetry={current.reload} />}
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
        {!loaded && !current.error && <PageLoader />}
        {loaded && items.length === 0 && <EmptyState title={search || atLeast ? t('table.noMatch') : emptyTitle} text={search || atLeast ? null : t('board.emptyText')} />}
        {items.length > 0 && view === 'map' && (
          <>
            <Suspense fallback={<PageLoader />}>
              <PointsMap points={points} label={t('board.map')} height={440} />
            </Suspense>
            {withoutLocation > 0 && <p className="text-sm text-ink-soft">{t('board.noLocation', { n: withoutLocation })}</p>}
          </>
        )}
        {items.length > 0 && view === 'list' && (
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((item) => (
              <li key={item.key}>
                <ItemCard
                  item={item}
                  onRequested={(text) => {
                    setNotice(text)
                    current.reload()
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
