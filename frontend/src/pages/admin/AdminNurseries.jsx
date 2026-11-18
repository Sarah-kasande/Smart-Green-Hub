// Administrator: nurseries (docs/DEVIATIONS.md W47). Table (cards on phones) with search, the
// Active / Archived / All filter with counts, a district filter and a detail view. Edit changes only safe
// fields (names, contact, district, sector, address). Archive keeps all history; Delete is permanent and
// only possible when nothing is linked. Every action is in the audit log.
import { useRef, useState } from 'react'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import VerificationBadge from '../../components/ui/VerificationBadge'
import { Fact, PageHeader } from '../../components/ui/Layout'
import { DataTable, FilterSelect, SearchBox, Toolbar } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { ArchivedPill, LinksList, RecordButtons, RecordEditForm } from '../../components/admin/RecordTools'
import { recordStatusOptions } from '../../components/admin/recordStatus'
import { useRecordActions } from '../../components/admin/useRecordActions'
import { DISTRICTS } from '../../utils/options'
import { formatDate, formatNumber } from '../../utils/format'

function Detail({ id, actions, onClose, onSaved }) {
  const { t } = useI18n()
  const { data, error, reload } = useApi(`/admin/nurseries/${id}`)
  const [editing, setEditing] = useState(false)
  const item = data?.item
  if (error) return <ErrorState code={error} onRetry={reload} />
  if (!item) return <PageLoader />
  const districtOptions = DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))
  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{item.name}</h2>
          <p className="text-sm text-ink-soft">{t('records.registeredOn', { date: formatDate(item.created_at) })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ArchivedPill item={item} />
          <VerificationBadge status={item.verification_status} />
          <Button variant="ghost" onClick={onClose}>
            {t('table.closeDetails')}
          </Button>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Fact label={t('auth.district')}>
          {t(`districts.${item.district}`)}, {item.sector}
          {item.address_text && <span className="block text-sm font-normal text-ink-soft">{item.address_text}</span>}
        </Fact>
        <Fact label={t('records.owner')}>
          {item.owner?.full_name}
          <span className="block text-sm font-normal text-ink-soft">{item.owner?.email}</span>
          {item.owner?.phone && <span className="block text-sm font-normal text-ink-soft">{item.owner.phone}</span>}
        </Fact>
        <Fact label={t('homepage.consentTitle')}>{item.show_on_homepage ? t('homepage.consentYes') : t('homepage.consentNo')}</Fact>
      </dl>
      <div>
        <p className="mb-1 text-sm font-semibold">{t('records.linked')}</p>
        <LinksList links={item.links} />
      </div>
      {editing ? (
        <RecordEditForm
          path="nurseries"
          item={item}
          initial={{ name: item.name, district: item.district, sector: item.sector, address_text: item.address_text || '', owner_full_name: item.owner?.full_name || '', owner_phone: item.owner?.phone || '' }}
          fields={[
            { name: 'name', label: t('auth.nurseryName'), max: 160 },
            { name: 'district', label: t('auth.district'), type: 'select', options: districtOptions },
            { name: 'sector', label: t('auth.sector'), max: 60 },
            { name: 'address_text', label: t('auth.address'), max: 255, optional: true },
            { name: 'owner_full_name', label: t('records.ownerName'), max: 120 },
            { name: 'owner_phone', label: t('records.phone'), type: 'tel', max: 20, optional: true },
          ]}
          onSaved={() => {
            setEditing(false)
            reload()
            onSaved()
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="border-t border-line pt-4">
          <RecordButtons item={item} actions={actions} onEdit={() => setEditing(true)} />
        </div>
      )}
    </Card>
  )
}

export default function AdminNurseries() {
  const { t } = useI18n()
  const [status, setStatus] = useState('active')
  const [district, setDistrict] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const detailRef = useRef(null)
  const { data, error, reload } = useApi(`/admin/nurseries${qs({ status, district })}`)
  const [detailVersion, setDetailVersion] = useState(0)
  const actions = useRecordActions('nursery', 'nurseries', (change) => {
    if (change?.deleted) setSelectedId(null)
    setDetailVersion((v) => v + 1)
    reload()
  })

  function open(item) {
    setSelectedId(item.id)
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const rows = (data?.items || []).filter((n) => matches(search, n.name, n.sector, n.owner?.full_name, n.owner?.email))
  const columns = [
    {
      key: 'name',
      header: t('auth.nurseryName'),
      primary: true,
      render: (n) => (
        <>
          {n.name}
          <span className="block text-sm font-normal text-ink-soft">{n.owner?.full_name}</span>
        </>
      ),
    },
    { key: 'district', header: t('auth.district'), render: (n) => `${t(`districts.${n.district}`)}, ${n.sector}` },
    { key: 'batches', header: t('records.batches'), align: 'right', render: (n) => formatNumber(n.batch_count) },
    {
      key: 'status',
      header: t('table.status'),
      render: (n) => (
        <div className="flex flex-wrap gap-1.5">
          {n.archived_at ? <ArchivedPill item={n} /> : <VerificationBadge status={n.verification_status} />}
          {n.show_on_homepage && !n.archived_at && (
            <Pill tone="teal" icon="globe">
              {t('homepage.consentShort')}
            </Pill>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: t('table.actions'),
      full: true,
      render: (n) => (
        <Button variant="secondary" onClick={() => open(n)} aria-label={`${t('table.open')}: ${n.name}`}>
          {t('table.open')}
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {actions.askElement}
      <PageHeader title={t('records.nurseries')} meta={data && countLabel(t, rows.length)} />
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('records.searchNursery')} />
        <FilterSelect label={t('table.byStatus')} value={status} onChange={setStatus} options={recordStatusOptions(t, data?.counts)} />
        <FilterSelect
          label={t('table.byDistrict')}
          value={district}
          onChange={setDistrict}
          options={[{ value: '', label: t('table.allDistricts') }, ...DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))]}
        />
      </Toolbar>
      {actions.noticeElement}
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && <DataTable caption={t('records.nurseries')} columns={columns} rows={rows} rowKey={(n) => n.id} empty={search ? t('table.noMatch') : t('records.empty')} />}
      <div ref={detailRef}>
        {selectedId && <Detail key={`${selectedId}-${detailVersion}`} id={selectedId} actions={actions} onClose={() => setSelectedId(null)} onSaved={reload} />}
      </div>
    </div>
  )
}
