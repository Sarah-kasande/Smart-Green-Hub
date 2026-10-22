// Listing moderation (FR15): the administrator sees every Surplus Board listing and can withdraw
// one with a reason (e.g. a duplicate or a mistake). Open requests are cancelled automatically.
import { useState } from 'react'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/Badges'
import { PageHeader } from '../../components/ui/Layout'
import { DataTable, FilterPanel, FilterSelect, SearchBox, Toolbar, ViewToggle, WithFilters } from '../../components/ui/DataView'
import { countLabel, matches, useViewMode } from '../../components/ui/dataViewTools'
import { formatDate, formatNumber, formatRWF } from '../../utils/format'

const FILTERS = ['active', 'reserved', 'fulfilled', 'expired', 'withdrawn', 'all']

export default function AdminListings() {
  const { t } = useI18n()
  const [status, setStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [view, setView] = useViewMode('admin-listings')
  const { data, error, reload } = useApi(`/admin/listings?status=${status}`)
  const [notice, setNotice] = useState(null)

  async function withdraw(listing) {
    const reason = window.prompt(t('adminListings.reason'))
    if (!reason) return
    try {
      await api.post(`/admin/listings/${listing.id}/withdraw`, { reason })
      setNotice({ type: 'success', text: 'listings.withdrawn' })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  const statusOptions = FILTERS.map((f) => ({ value: f, label: f === 'all' ? t('table.allStatuses') : t(`listingStatus.${f}`) }))
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

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('adminListings.title')} meta={data && countLabel(t, rows.length)} />
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('table.searchBoard')} />
        <FilterSelect label={t('table.byStatus')} value={status} onChange={setStatus} options={statusOptions} />
        <ViewToggle
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: t('table.table') },
            { value: 'cards', label: t('table.cards') },
          ]}
        />
      </Toolbar>
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      {error && <ErrorState code={error} onRetry={reload} />}
      <WithFilters panel={<FilterPanel groups={[{ label: t('table.byStatus'), value: status, onChange: setStatus, options: statusOptions }]} />}>
        {!data && !error && <PageLoader />}
        {data && (
          <DataTable
            caption={t('adminListings.title')}
            view={view}
            columns={columns}
            rows={rows}
            rowKey={(l) => l.id}
            empty={search ? t('table.noMatch') : t('listings.empty')}
          />
        )}
      </WithFilters>
    </div>
  )
}
