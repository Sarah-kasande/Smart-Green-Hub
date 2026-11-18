// Administrator: receiving institutions (docs/DEVIATIONS.md W47). Same pattern as Nurseries: table with
// search, Active / Archived / All with counts, district and type filters, detail view, safe edit,
// Archive (history kept, open requests cancelled), Unarchive, and Delete only when nothing is linked.
import { useRef, useState } from 'react'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import VerificationBadge from '../../components/ui/VerificationBadge'
import { Fact, PageHeader } from '../../components/ui/Layout'
import { DataTable, FilterSelect, SearchBox, Toolbar } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { ArchivedPill, LinksList, RecordButtons, RecordEditForm } from '../../components/admin/RecordTools'
import { recordStatusOptions } from '../../components/admin/recordStatus'
import { useRecordActions } from '../../components/admin/useRecordActions'
import { DISTRICTS } from '../../utils/options'
import { formatDate, formatNumber } from '../../utils/format'

const ORG_TYPES = ['school', 'sector_office', 'church', 'hotel', 'community_group']

function Detail({ id, actions, onClose, onSaved }) {
  const { t } = useI18n()
  const { data, error, reload } = useApi(`/admin/institutions/${id}`)
  const [editing, setEditing] = useState(false)
  const item = data?.item
  if (error) return <ErrorState code={error} onRetry={reload} />
  if (!item) return <PageLoader />
  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{item.name}</h2>
          <p className="text-sm text-ink-soft">
            {t(`orgTypes.${item.org_type}`)} · {t('records.registeredOn', { date: formatDate(item.created_at) })}
          </p>
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
        </Fact>
        <Fact label={t('records.contactPerson')}>
          {item.user?.full_name}
          <span className="block text-sm font-normal text-ink-soft">{item.user?.email}</span>
          {item.user?.phone && <span className="block text-sm font-normal text-ink-soft">{item.user.phone}</span>}
        </Fact>
        {item.contact_phone && <Fact label={t('auth.contactPhone')}>{item.contact_phone}</Fact>}
      </dl>
      <div>
        <p className="mb-1 text-sm font-semibold">{t('records.linked')}</p>
        <LinksList links={item.links} />
      </div>
      {editing ? (
        <RecordEditForm
          path="institutions"
          item={item}
          initial={{
            name: item.name,
            org_type: item.org_type,
            district: item.district,
            sector: item.sector,
            contact_phone: item.contact_phone || '',
            user_full_name: item.user?.full_name || '',
            user_phone: item.user?.phone || '',
          }}
          fields={[
            { name: 'name', label: t('auth.orgName'), max: 160 },
            { name: 'org_type', label: t('auth.orgType'), type: 'select', options: ORG_TYPES.map((o) => ({ value: o, label: t(`orgTypes.${o}`) })) },
            { name: 'district', label: t('auth.district'), type: 'select', options: DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) })) },
            { name: 'sector', label: t('auth.sector'), max: 60 },
            { name: 'contact_phone', label: t('auth.contactPhone'), type: 'tel', max: 20, optional: true },
            { name: 'user_full_name', label: t('records.contactPerson'), max: 120 },
            { name: 'user_phone', label: t('records.phone'), type: 'tel', max: 20, optional: true },
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

export default function AdminInstitutions() {
  const { t } = useI18n()
  const [status, setStatus] = useState('active')
  const [district, setDistrict] = useState('')
  const [orgType, setOrgType] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [detailVersion, setDetailVersion] = useState(0)
  const detailRef = useRef(null)
  const { data, error, reload } = useApi(`/admin/institutions${qs({ status, district, org_type: orgType })}`)
  const actions = useRecordActions('institution', 'institutions', (change) => {
    if (change?.deleted) setSelectedId(null)
    setDetailVersion((v) => v + 1)
    reload()
  })

  function open(item) {
    setSelectedId(item.id)
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const rows = (data?.items || []).filter((i) => matches(search, i.name, i.sector, i.user?.full_name, i.user?.email))
  const columns = [
    {
      key: 'name',
      header: t('auth.orgName'),
      primary: true,
      render: (i) => (
        <>
          {i.name}
          <span className="block text-sm font-normal text-ink-soft">{t(`orgTypes.${i.org_type}`)}</span>
        </>
      ),
    },
    { key: 'district', header: t('auth.district'), render: (i) => `${t(`districts.${i.district}`)}, ${i.sector}` },
    { key: 'requests', header: t('records.requests'), align: 'right', render: (i) => formatNumber(i.request_count) },
    { key: 'status', header: t('table.status'), render: (i) => (i.archived_at ? <ArchivedPill item={i} /> : <VerificationBadge status={i.verification_status} />) },
    {
      key: 'actions',
      header: t('table.actions'),
      full: true,
      render: (i) => (
        <Button variant="secondary" onClick={() => open(i)} aria-label={`${t('table.open')}: ${i.name}`}>
          {t('table.open')}
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {actions.askElement}
      <PageHeader title={t('records.institutions')} meta={data && countLabel(t, rows.length)} />
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('records.searchInstitution')} />
        <FilterSelect label={t('table.byStatus')} value={status} onChange={setStatus} options={recordStatusOptions(t, data?.counts)} />
        <FilterSelect
          label={t('table.byDistrict')}
          value={district}
          onChange={setDistrict}
          options={[{ value: '', label: t('table.allDistricts') }, ...DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))]}
        />
        <FilterSelect label={t('table.byType')} value={orgType} onChange={setOrgType} options={[{ value: '', label: t('table.allTypes') }, ...ORG_TYPES.map((o) => ({ value: o, label: t(`orgTypes.${o}`) }))]} />
      </Toolbar>
      {actions.noticeElement}
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && <DataTable caption={t('records.institutions')} columns={columns} rows={rows} rowKey={(i) => i.id} empty={search ? t('table.noMatch') : t('records.empty')} />}
      <div ref={detailRef}>
        {selectedId && <Detail key={`${selectedId}-${detailVersion}`} id={selectedId} actions={actions} onClose={() => setSelectedId(null)} onSaved={reload} />}
      </div>
    </div>
  )
}
