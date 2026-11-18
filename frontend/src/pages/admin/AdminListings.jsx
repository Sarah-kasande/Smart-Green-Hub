// Listings and plants (FR15; docs/DEVIATIONS.md W46). Two views:
//  - Surplus listings: every Surplus Board listing (all statuses by default, so history stays visible).
//    The administrator can withdraw one with a reason (e.g. a duplicate or a mistake); open requests are
//    cancelled automatically.
//  - Available plants: EVERY batch of every approved nursery, with stock, the free quantity, the price
//    per plant if set, and whether institutions can see it under "Available plants" right now.
// Search works on the loaded rows; nursery, species, status and stage filters are applied by the server.
import { useState } from 'react'
import api, { errorCode } from '../../api/client'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import { useAsk } from '../../components/ui/AskDialog'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill, StatusBadge } from '../../components/ui/Badges'
import { PageHeader } from '../../components/ui/Layout'
import { DataTable, FilterPanel, FilterSelect, SearchBox, TabBar, Toolbar, ViewToggle, WithFilters } from '../../components/ui/DataView'
import { countLabel, matches, useViewMode } from '../../components/ui/dataViewTools'
import { formatDate, formatNumber, formatRWF } from '../../utils/format'

const LISTING_FILTERS = ['all', 'active', 'reserved', 'fulfilled', 'expired', 'withdrawn']
const STAGES = ['all', 'seedling', 'growing', 'ready', 'overgrown', 'cleared']
const VISIBILITY = ['all', 'shown', 'hidden']

// Nursery and species choices, shared by both views
function useFilterChoices() {
  const { t } = useI18n()
  const { data } = useApi('/admin/filter-options')
  return {
    nurseries: [{ value: '', label: t('adminListings.allNurseries') }, ...(data?.nurseries || []).map((n) => ({ value: String(n.id), label: n.name }))],
    species: [{ value: '', label: t('board.allSpecies') }, ...(data?.species || []).map((s) => ({ value: String(s.id), label: s.name }))],
  }
}

function ListingsView({ nurseryId, speciesId, search, view, extraFilters, toggle }) {
  const { t } = useI18n()
  const [status, setStatus] = useState('all')
  const { data, error, reload } = useApi(`/admin/listings${qs({ status, nursery_id: nurseryId, species_id: speciesId })}`)
  const [notice, setNotice] = useState(null)
  const [askElement, ask] = useAsk()

  async function withdraw(listing) {
    const reason = await ask({ title: t('listings.withdraw'), label: t('adminListings.reason'), required: true, confirmLabel: t('listings.withdraw'), danger: true })
    if (!reason) return
    try {
      await api.post(`/admin/listings/${listing.id}/withdraw`, { reason })
      setNotice({ type: 'success', text: 'listings.withdrawn' })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  const statusOptions = LISTING_FILTERS.map((f) => ({ value: f, label: f === 'all' ? t('table.allStatuses') : t(`listingStatus.${f}`) }))
  const rows = (data?.listings || []).filter((l) => matches(search, l.species?.name, l.nursery?.name, l.nursery?.district))
  const columns = [
    {
      key: 'species',
      header: t('batches.species'),
      primary: true,
      render: (l) => (
        <>
          {l.species?.name}
          <span className="block text-sm font-normal text-ink-soft">{l.offer_type === 'free' ? t('listings.free') : formatRWF(l.discounted_price)}</span>
        </>
      ),
    },
    { key: 'nursery', header: t('impact.nursery'), render: (l) => `${l.nursery?.name || ''} (${l.nursery?.district || ''})` },
    { key: 'offered', header: t('listings.offered'), align: 'right', render: (l) => formatNumber(l.quantity_offered) },
    { key: 'left', header: t('listings.remaining'), align: 'right', render: (l) => formatNumber(l.remaining) },
    { key: 'expires', header: t('listings.expiresAt'), render: (l) => <span className="whitespace-nowrap">{formatDate(l.expires_at)}</span> },
    { key: 'status', header: t('table.status'), render: (l) => <StatusBadge group="listingStatus" status={l.status} /> },
    {
      key: 'actions',
      header: t('table.actions'),
      full: true,
      render: (l) =>
        ['active', 'reserved'].includes(l.status) && (
          <Button variant="secondary" onClick={() => withdraw(l)}>
            {t('listings.withdraw')}
          </Button>
        ),
    },
  ]

  const statusFilter = { label: t('table.byStatus'), value: status, onChange: setStatus, options: statusOptions }
  return (
    <>
      {askElement}
      <Toolbar>
        {extraFilters}
        <FilterSelect label={t('table.byStatus')} value={status} onChange={setStatus} options={statusOptions} />
        {toggle}
      </Toolbar>
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      {error && <ErrorState code={error} onRetry={reload} />}
      <WithFilters panel={<FilterPanel groups={[statusFilter]} />}>
        {!data && !error && <PageLoader />}
        {data && (
          <>
            <p className="text-sm text-ink-soft">{countLabel(t, rows.length)}</p>
            <DataTable
              caption={t('adminListings.listings')}
              view={view}
              columns={columns}
              rows={rows}
              rowKey={(l) => l.id}
              empty={search ? t('table.noMatch') : t('listings.empty')}
            />
          </>
        )}
      </WithFilters>
    </>
  )
}

function PlantsView({ nurseryId, speciesId, search, view, extraFilters, toggle }) {
  const { t } = useI18n()
  const [stage, setStage] = useState('all')
  const [visibility, setVisibility] = useState('all')
  const { data, error, reload } = useApi(`/admin/plants${qs({ stage, visibility, nursery_id: nurseryId, species_id: speciesId })}`)

  const stageOptions = STAGES.map((s) => ({ value: s, label: s === 'all' ? t('adminListings.allStages') : t(`stages.${s}`) }))
  const visibilityOptions = VISIBILITY.map((v) => ({ value: v, label: t(`adminListings.visibility.${v}`) }))
  const rows = (data?.plants || []).filter((p) => matches(search, p.species?.name, p.nursery?.name, p.nursery?.district))
  const columns = [
    {
      key: 'species',
      header: t('batches.species'),
      primary: true,
      render: (p) => (
        <>
          {p.species?.name}
          <span className="block text-sm font-normal text-ink-soft">#{p.id}</span>
        </>
      ),
    },
    { key: 'nursery', header: t('impact.nursery'), render: (p) => `${p.nursery?.name || ''} (${p.nursery?.district || ''})` },
    { key: 'stage', header: t('adminListings.stage'), render: (p) => t(`stages.${p.stage}`) },
    { key: 'stock', header: t('adminListings.inStock'), align: 'right', render: (p) => formatNumber(p.quantity_current) },
    { key: 'free', header: t('adminListings.free'), align: 'right', render: (p) => formatNumber(p.free) },
    { key: 'price', header: t('batches.unitPrice'), align: 'right', render: (p) => (p.unit_price ? formatRWF(p.unit_price) : '–') },
    {
      key: 'shown',
      header: t('adminListings.shown'),
      render: (p) => (
        <>
          <Pill tone={p.visible ? 'green' : 'grey'} icon={p.visible ? 'check' : 'close'}>
            {p.visible ? t('adminListings.visibility.shown') : t('adminListings.visibility.hidden')}
          </Pill>
          {/* Why it is hidden, when the nursery switched it off */}
          {!p.show_to_institutions && <span className="block text-sm text-ink-soft">{t('adminListings.batchOff')}</span>}
          {p.show_to_institutions && !p.nursery_shows && <span className="block text-sm text-ink-soft">{t('adminListings.nurseryOff')}</span>}
        </>
      ),
    },
  ]

  return (
    <>
      <Toolbar>
        {extraFilters}
        <FilterSelect label={t('table.byStage')} value={stage} onChange={setStage} options={stageOptions} />
        <FilterSelect label={t('adminListings.shown')} value={visibility} onChange={setVisibility} options={visibilityOptions} />
        {toggle}
      </Toolbar>
      <p className="text-sm text-ink-soft">{t('adminListings.plantsIntro')}</p>
      {error && <ErrorState code={error} onRetry={reload} />}
      <WithFilters
        panel={
          <FilterPanel
            groups={[
              { label: t('table.byStage'), value: stage, onChange: setStage, options: stageOptions },
              { label: t('adminListings.shown'), value: visibility, onChange: setVisibility, options: visibilityOptions },
            ]}
          />
        }
      >
        {!data && !error && <PageLoader />}
        {data && (
          <>
            <p className="text-sm text-ink-soft">{countLabel(t, rows.length)}</p>
            <DataTable caption={t('board.available')} view={view} columns={columns} rows={rows} rowKey={(p) => p.id} empty={search ? t('table.noMatch') : t('adminListings.emptyPlants')} />
          </>
        )}
      </WithFilters>
    </>
  )
}

export default function AdminListings() {
  const { t } = useI18n()
  const [tab, setTab] = useState('listings')
  const [search, setSearch] = useState('')
  const [nurseryId, setNurseryId] = useState('')
  const [speciesId, setSpeciesId] = useState('')
  const [view, setView] = useViewMode('admin-listings')
  const choices = useFilterChoices()

  // Search, nursery and species: the same in both views
  const shared = (
    <>
      <SearchBox value={search} onChange={setSearch} label={t('table.searchBoard')} />
      <FilterSelect label={t('impact.nursery')} value={nurseryId} onChange={setNurseryId} options={choices.nurseries} />
      <FilterSelect label={t('board.bySpecies')} value={speciesId} onChange={setSpeciesId} options={choices.species} />
    </>
  )
  const toggle = (
    <ViewToggle
      value={view}
      onChange={setView}
      options={[
        { value: 'table', label: t('table.table') },
        { value: 'cards', label: t('table.cards') },
      ]}
    />
  )
  const props = { nurseryId, speciesId, search, view, extraFilters: shared, toggle }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('adminListings.title')} />
      <TabBar
        label={t('adminListings.title')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'listings', label: t('adminListings.listings') },
          { value: 'plants', label: t('board.available') },
        ]}
      />
      {tab === 'listings' ? <ListingsView {...props} /> : <PlantsView {...props} />}
    </div>
  )
}
