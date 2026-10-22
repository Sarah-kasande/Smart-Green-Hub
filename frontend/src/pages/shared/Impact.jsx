// Impact dashboard (FR12) for the signed-in role: totals, by district, by month and the records.
// Every number comes from confirmed hand-overs; with no records everything is 0.
import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import BarChart from '../../components/ui/BarChart'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { EmptyState, PageHeader, SectionTitle, StatCard } from '../../components/ui/Layout'
import { DataTable, SearchBox, Toolbar } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { formatDate, formatMonth, formatNumber } from '../../utils/format'

export function ImpactCards({ summary }) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label={t('impact.plants')} value={formatNumber(summary.plants_redirected || 0)} />
      <StatCard label={t('impact.handovers')} value={formatNumber(summary.handovers || 0)} />
      <StatCard label={t('impact.land')} value={`${formatNumber(summary.land_cleared_sqm || 0, 1)} m²`} />
      <StatCard label={t('impact.sites')} value={formatNumber(summary.planting_sites || 0)} />
    </div>
  )
}

export default function Impact() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { data, error, reload } = useApi(`/${user.role}/impact`)
  const [search, setSearch] = useState('')

  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const summary = data.summary || {}
  const records = data.records || []
  const showNursery = user.role !== 'operator'
  const showInstitution = user.role !== 'institution'
  const rows = records.filter((r) => matches(search, r.species, r.nursery, r.institution, r.planting_site, r.district))

  const columns = [
    { key: 'date', header: t('impact.date'), render: (r) => <span className="whitespace-nowrap">{formatDate(r.recorded_at)}</span> },
    { key: 'species', header: t('batches.species'), primary: true, render: (r) => r.species },
    { key: 'quantity', header: t('impact.quantity'), align: 'right', render: (r) => formatNumber(r.quantity_delivered) },
    showNursery && { key: 'nursery', header: t('impact.nursery'), render: (r) => r.nursery },
    showInstitution && { key: 'institution', header: t('impact.institution'), render: (r) => r.institution },
    { key: 'site', header: t('requests.plantingSite'), render: (r) => `${r.planting_site} (${r.district})` },
    { key: 'land', header: t('impact.landShort'), align: 'right', render: (r) => `${formatNumber(r.land_cleared_sqm, 1)} m²` },
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t('impact.title')} meta={countLabel(t, records.length)} />
      <ImpactCards summary={summary} />
      {!summary.handovers ? (
        <EmptyState title={t('impact.empty')} text={t('impact.emptyText')} />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold">{t('impact.monthly')}</h2>
              <BarChart title={t('impact.monthly')} data={(summary.monthly || []).map((m) => ({ label: formatMonth(m.month), value: m.plants }))} colorClass="fill-teal" />
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">{t('impact.byDistrict')}</h2>
              <BarChart title={t('impact.byDistrict')} data={(summary.by_district || []).map((d) => ({ label: d.district, value: d.plants }))} />
            </Card>
          </div>
          <section className="space-y-4">
            <SectionTitle>{t('impact.records')}</SectionTitle>
            <Toolbar>
              <SearchBox value={search} onChange={setSearch} />
            </Toolbar>
            <DataTable caption={t('impact.records')} columns={columns} rows={rows} rowKey={(r) => r.id} empty={t('table.noMatch')} />
          </section>
        </>
      )}
    </div>
  )
}
