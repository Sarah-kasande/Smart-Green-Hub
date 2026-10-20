// Audit log viewer (FR16): who did what, when and why. Records are never deleted.
import { useState } from 'react'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader } from '../../components/ui/Layout'
import { SelectField, TextField } from '../../components/ui/Fields'
import { formatDateTime, formatNumber } from '../../utils/format'

export default function AuditLog() {
  const { t } = useI18n()
  const [filters, setFilters] = useState({ entity_type: '', action: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const { data, error } = useApi(`/admin/audit${qs({ ...filters, page })}`)
  const set = (k) => (e) => {
    setFilters({ ...filters, [k]: e.target.value })
    setPage(1)
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={t('audit.title')} intro={t('audit.intro')} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label={t('audit.entity')} value={filters.entity_type} onChange={set('entity_type')} placeholder={t('common.all')} options={(data?.entity_types || []).map((e) => ({ value: e, label: e }))} />
        <TextField label={t('audit.action')} value={filters.action} onChange={set('action')} placeholder="verification" />
        <TextField label={t('audit.from')} type="date" value={filters.from} onChange={set('from')} />
        <TextField label={t('audit.to')} type="date" value={filters.to} onChange={set('to')} />
      </div>
      {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      {!data && !error && <PageLoader />}
      {data && (
        <>
          <p className="text-sm text-ink-soft">{t('audit.count', { n: formatNumber(data.total) })}</p>
          <Card className="overflow-x-auto p-0 sm:p-0">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="p-3">{t('audit.when')}</th>
                  <th className="p-3">{t('audit.who')}</th>
                  <th className="p-3">{t('audit.action')}</th>
                  <th className="p-3">{t('audit.entity')}</th>
                  <th className="p-3">{t('audit.reason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap p-3">{formatDateTime(row.created_at)}</td>
                    <td className="p-3">{row.actor ? `${row.actor.full_name} (${t(`roles.${row.actor.role}`)})` : t('audit.system')}</td>
                    <td className="p-3 font-mono text-xs">{row.action}</td>
                    <td className="p-3">
                      {row.entity_type}
                      {row.entity_id ? ` #${row.entity_id}` : ''}
                    </td>
                    <td className="p-3 text-ink-soft">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
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
    </div>
  )
}
