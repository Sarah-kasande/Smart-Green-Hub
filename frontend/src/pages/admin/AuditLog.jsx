// Audit log viewer (FR16): who did what, when and why. Records are never deleted.
// The search box filters by action name on the server (same "action" filter as before).
import { useState } from 'react'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/Layout'
import { TextField } from '../../components/ui/Fields'
import { DataTable, FilterPanel, FilterSelect, SearchBox, Toolbar, WithFilters } from '../../components/ui/DataView'
import { countLabel } from '../../components/ui/dataViewTools'
import { formatDateTime } from '../../utils/format'

export default function AuditLog() {
  const { t } = useI18n()
  const [filters, setFilters] = useState({ entity_type: '', action: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const { data, error, reload } = useApi(`/admin/audit${qs({ ...filters, page })}`)
  const set = (k) => (value) => {
    setFilters({ ...filters, [k]: value })
    setPage(1)
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1
  const entityOptions = [{ value: '', label: t('table.allEntities') }, ...(data?.entity_types || []).map((e) => ({ value: e, label: e }))]

  const columns = [
    { key: 'when', header: t('audit.when'), render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span> },
    { key: 'who', header: t('audit.who'), primary: true, render: (row) => (row.actor ? `${row.actor.full_name} (${t(`roles.${row.actor.role}`)})` : t('audit.system')) },
    { key: 'action', header: t('audit.action'), render: (row) => <span className="font-mono text-xs">{row.action}</span> },
    { key: 'entity', header: t('audit.entity'), render: (row) => `${row.entity_type}${row.entity_id ? ` #${row.entity_id}` : ''}` },
    { key: 'reason', header: t('audit.reason'), full: true, render: (row) => <span className="text-ink-soft">{row.reason}</span> },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('audit.title')} meta={data && countLabel(t, data.total || 0)} />
      <Toolbar>
        <SearchBox value={filters.action} onChange={set('action')} label={t('audit.action')} />
        <FilterSelect label={t('table.byEntity')} value={filters.entity_type} onChange={set('entity_type')} options={entityOptions} />
      </Toolbar>
      <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
        <TextField label={t('audit.from')} type="date" value={filters.from} onChange={(e) => set('from')(e.target.value)} />
        <TextField label={t('audit.to')} type="date" value={filters.to} onChange={(e) => set('to')(e.target.value)} />
      </div>
      {error && <ErrorState code={error} onRetry={reload} />}
      <WithFilters panel={<FilterPanel groups={[{ label: t('table.byEntity'), value: filters.entity_type, onChange: set('entity_type'), options: entityOptions }]} />}>
        {!data && !error && <PageLoader />}
        {data && (
          <>
            <DataTable caption={t('audit.title')} columns={columns} rows={data.items || []} rowKey={(row) => row.id} empty={t('table.noMatch')} />
            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('audit.previous')}
              </Button>
              <span className="text-sm text-ink-soft">{t('audit.page', { page, pages })}</span>
              <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                {t('audit.next')}
              </Button>
            </div>
          </>
        )}
      </WithFilters>
    </div>
  )
}
