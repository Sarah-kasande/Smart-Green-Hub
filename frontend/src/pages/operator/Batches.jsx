// Batch inventory (FR04): table or cards, with a stage filter and a search box.
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useBatches } from '../../offline/useOfflineData'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import { Pill, StatusBadge } from '../../components/ui/Badges'
import { EmptyState, PageHeader } from '../../components/ui/Layout'
import { DataTable, FilterPanel, FilterSelect, SearchBox, Toolbar, ViewToggle, WithFilters } from '../../components/ui/DataView'
import { countLabel, matches, useViewMode } from '../../components/ui/dataViewTools'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { formatDate, formatNumber, formatRWF } from '../../utils/format'

const STAGES = ['', 'seedling', 'growing', 'ready', 'overgrown', 'cleared']

export function BatchCard({ batch }) {
  const { t } = useI18n()
  const content = (
    <Card className="flex h-full flex-col gap-3 hover:border-teal">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{batch.species?.common_name}</p>
          <p className="text-sm text-ink-soft">{batch.id ? `#${batch.id}` : t('sync.notYetSynced')} · {t('batches.planted', { date: formatDate(batch.planting_date) })}</p>
        </div>
        <StatusBadge group="stages" status={batch.stage} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-ink-soft">{t('batches.inStock')}</dt>
          <dd className="text-lg font-semibold">{formatNumber(batch.quantity_current)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">{t('batches.availableLabel')}</dt>
          <dd className="text-lg font-semibold">{formatNumber(batch.available ?? batch.quantity_current)}</dd>
        </div>
        {batch.prime_end_date && (
          <div>
            <dt className="text-ink-soft">{t('batches.primeEnd')}</dt>
            <dd className="font-semibold">{formatDate(batch.prime_end_date)}</dd>
          </div>
        )}
        <div>
          <dt className="text-ink-soft">{t('batches.unitPrice')}</dt>
          <dd className="font-semibold">{formatRWF(batch.unit_price)}</dd>
        </div>
      </dl>
      {batch.pending && (
        <Pill tone="amber" icon="clock">
          {t('sync.waitingOne')}
        </Pill>
      )}
      {!batch.pending && batch.suggested_stage && batch.suggested_stage !== batch.stage && (
        <p className="text-sm text-ink-soft">
          {t('batches.suggested', { stage: t(`stages.${batch.suggested_stage}`) })}
        </p>
      )}
    </Card>
  )
  return batch.id ? (
    <Link to={`/operator/batches/${batch.id}`} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  )
}

export default function Batches() {
  const { t } = useI18n()
  const [stage, setStage] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useViewMode('batches')
  const { batches, offline } = useBatches(stage === 'cleared' ? 'cleared' : stage)
  const notice = useLocation().state?.notice

  const stageOptions = STAGES.map((s) => ({ value: s, label: s ? t(`stages.${s}`) : t('batches.allActive') }))
  const rows = (batches || []).filter((b) => matches(search, b.species?.common_name, b.species?.kinyarwanda_name, b.id && `#${b.id}`))
  const columns = [
    {
      key: 'batch',
      header: t('batches.species'),
      primary: true,
      render: (b) =>
        b.id ? (
          <Link to={`/operator/batches/${b.id}`} className="text-teal-text underline">
            {b.species?.common_name} #{b.id}
          </Link>
        ) : (
          `${b.species?.common_name} (${t('sync.notYetSynced')})`
        ),
    },
    { key: 'stage', header: t('batches.stage'), render: (b) => <StatusBadge group="stages" status={b.stage} /> },
    { key: 'stock', header: t('batches.inStock'), align: 'right', render: (b) => formatNumber(b.quantity_current) },
    { key: 'free', header: t('batches.availableLabel'), align: 'right', render: (b) => formatNumber(b.available ?? b.quantity_current) },
    { key: 'prime', header: t('batches.primeEnd'), render: (b) => <span className="whitespace-nowrap">{b.prime_end_date ? formatDate(b.prime_end_date) : ''}</span> },
    { key: 'price', header: t('batches.unitPrice'), align: 'right', render: (b) => formatRWF(b.unit_price) },
    {
      key: 'sync',
      header: t('table.status'),
      render: (b) =>
        b.pending && (
          <Pill tone="amber" icon="clock">
            {t('sync.waitingOne')}
          </Pill>
        ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title={t('batches.title')}
        meta={batches && countLabel(t, rows.length)}
        actions={
          <Link to="/operator/batches/new" className={buttonClasses('primary')}>
            {t('batches.add')}
          </Link>
        }
      />
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      {offline && <Notice type="warning">{t('sync.offlineCopy')}</Notice>}
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('table.searchPlants')} />
        <FilterSelect label={t('table.byStage')} value={stage} onChange={setStage} options={stageOptions} />
        <ViewToggle
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: t('table.table') },
            { value: 'cards', label: t('table.cards') },
          ]}
        />
      </Toolbar>
      <WithFilters panel={<FilterPanel groups={[{ label: t('table.byStage'), value: stage, onChange: setStage, options: stageOptions }]} />}>
        {!batches && <PageLoader />}
        {batches && batches.length === 0 && !search ? (
          <EmptyState title={t('batches.empty')} text={t('batches.emptyText')} />
        ) : (
          batches && (
            <DataTable
              caption={t('batches.title')}
              view={view}
              columns={columns}
              rows={rows}
              rowKey={(b) => b.id || b.client_uuid}
              empty={t('table.noMatch')}
              renderCard={(b) => <BatchCard batch={b} />}
            />
          )
        )}
      </WithFilters>
    </div>
  )
}
