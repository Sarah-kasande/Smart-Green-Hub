// Administrator: sales of every nursery (docs/DEVIATIONS.md W45).
// Everything on this page comes from GET /admin/sales, which reads the SALES table on the server:
// the totals, the breakdowns by nursery and by species, and the rows all use the same filters, and the
// totals are calculated over EVERY matching sale (not just the rows shown). Sales synced from offline
// phones are the same rows; a sale the nursery removed (mistake or refund) is no longer counted.
// "Export CSV" downloads every matching sale; each export is recorded in the audit log.
import { useEffect, useState } from 'react'
import api, { errorCode } from '../../api/client'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader, SectionTitle, StatCard } from '../../components/ui/Layout'
import { DataTable, FilterSelect, SearchBox, Toolbar } from '../../components/ui/DataView'
import { TextField } from '../../components/ui/Fields'
import { formatDate, formatDateTime, formatNumber, formatRWF } from '../../utils/format'

const PERIODS = ['today', 'week', 'month', 'year', 'custom', 'all']

// The search box waits until typing stops (300 ms) before asking the server again
function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function AdminSales() {
  const { t } = useI18n()
  const [period, setPeriod] = useState('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [nurseryId, setNurseryId] = useState('')
  const [speciesId, setSpeciesId] = useState('')
  const [search, setSearch] = useState('')
  const q = useDebounced(search)
  const [notice, setNotice] = useState(null)
  const [exporting, setExporting] = useState(false)

  const custom = period === 'custom'
  const filters = qs({ period, from: custom ? from : '', to: custom ? to : '', nursery_id: nurseryId, species_id: speciesId, q })
  const { data, error, reload } = useApi(`/admin/sales${filters}`)
  const choices = useApi('/admin/filter-options').data

  async function exportCsv() {
    setExporting(true)
    setNotice(null)
    try {
      const res = await api.get(`/admin/sales/export${filters}`, { responseType: 'blob' })
      const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')?.[1] || 'sales.csv'
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setNotice(`errors.${errorCode(err)}`)
    } finally {
      setExporting(false)
    }
  }

  const periodOptions = PERIODS.map((p) => ({ value: p, label: t(`adminSales.periods.${p}`) }))
  const nurseryOptions = [{ value: '', label: t('adminListings.allNurseries') }, ...(choices?.nurseries || []).map((n) => ({ value: String(n.id), label: n.name }))]
  const speciesOptions = [{ value: '', label: t('board.allSpecies') }, ...(choices?.species || []).map((s) => ({ value: String(s.id), label: s.name }))]
  const totals = data?.totals

  const columns = [
    { key: 'date', header: t('sales.date'), render: (r) => <span className="whitespace-nowrap">{formatDateTime(r.sold_at)}</span> },
    { key: 'species', header: t('batches.species'), primary: true, render: (r) => r.species.name },
    { key: 'nursery', header: t('impact.nursery'), render: (r) => `${r.nursery.name} (${r.nursery.district})` },
    { key: 'quantity', header: t('adminSales.quantity'), align: 'right', render: (r) => formatNumber(r.quantity) },
    { key: 'price', header: t('batches.unitPrice'), align: 'right', render: (r) => formatRWF(r.unit_price) },
    { key: 'total', header: t('sales.totalLabel'), align: 'right', render: (r) => <span className="font-semibold">{formatRWF(r.total)}</span> },
    { key: 'note', header: t('adminSales.note'), render: (r) => r.customer_note || '–' },
  ]
  const breakdownColumns = (nameHeader) => [
    { key: 'name', header: nameHeader, primary: true, render: (r) => (r.district ? `${r.name} (${r.district})` : r.name) },
    { key: 'sales', header: t('adminSales.count'), align: 'right', render: (r) => formatNumber(r.sales) },
    { key: 'plants', header: t('adminSales.plants'), align: 'right', render: (r) => formatNumber(r.plants) },
    { key: 'amount', header: t('adminSales.amount'), align: 'right', render: (r) => <span className="font-semibold">{formatRWF(r.amount)}</span> },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title={t('adminSales.title')}
        actions={
          <Button variant="secondary" icon="file" onClick={exportCsv} disabled={exporting || !data}>
            {t('adminSales.export')}
          </Button>
        }
      />
      <p className="text-ink-soft">{t('adminSales.intro')}</p>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('adminSales.search')} />
        <FilterSelect label={t('sales.period')} value={period} onChange={setPeriod} options={periodOptions} />
        <FilterSelect label={t('impact.nursery')} value={nurseryId} onChange={setNurseryId} options={nurseryOptions} />
        <FilterSelect label={t('board.bySpecies')} value={speciesId} onChange={setSpeciesId} options={speciesOptions} />
      </Toolbar>
      {custom && (
        <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
          <TextField label={t('adminSales.from')} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          <TextField label={t('adminSales.to')} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}
      {notice && <Notice type="error">{t(notice)}</Notice>}
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && (
        <>
          <p className="text-sm text-ink-soft">
            {data.from || data.to ? t('adminSales.range', { from: data.from ? formatDate(data.from) : '…', to: data.to ? formatDate(data.to) : '…' }) : t('adminSales.periods.all')}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t('adminSales.amount')} value={formatRWF(totals.amount)} />
            <StatCard label={t('adminSales.count')} value={formatNumber(totals.sales)} />
            <StatCard label={t('adminSales.plants')} value={formatNumber(totals.plants)} />
          </div>

          <SectionTitle>{t('adminSales.records')}</SectionTitle>
          {data.rows.length < totals.sales && <p className="text-sm text-ink-soft">{t('adminSales.limited', { n: formatNumber(data.rows.length), total: formatNumber(totals.sales) })}</p>}
          <DataTable caption={t('adminSales.records')} columns={columns} rows={data.rows} rowKey={(r) => r.id} empty={search ? t('table.noMatch') : t('adminSales.empty')} />

          {totals.sales > 0 && (
            <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
              <section className="space-y-3">
                <SectionTitle>{t('adminSales.byNursery')}</SectionTitle>
                <DataTable caption={t('adminSales.byNursery')} columns={breakdownColumns(t('impact.nursery'))} rows={data.by_nursery} rowKey={(r) => r.id} empty="" />
              </section>
              <section className="space-y-3">
                <SectionTitle>{t('adminSales.bySpecies')}</SectionTitle>
                <DataTable caption={t('adminSales.bySpecies')} columns={breakdownColumns(t('batches.species'))} rows={data.by_species} rowKey={(r) => r.id} empty="" />
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}
