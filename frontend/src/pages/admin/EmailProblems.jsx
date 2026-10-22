// Email report for the administrator (FR14, docs/DEVIATIONS.md W20).
// Every email (confirmation codes, password-reset codes, notifications) is in the outbox with a
// status. This page shows the counts and every email that was NOT delivered:
//   failed   Brevo refused it or could not be reached (the exact error is shown)
//   skipped  not sent on purpose: no Brevo key (development), printed in the server console
import { useState } from 'react'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import { PageHeader, StatCard } from '../../components/ui/Layout'
import { DataTable, FilterPanel, FilterSelect, SearchBox, Toolbar, WithFilters } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { formatDateTime, formatNumber } from '../../utils/format'

export default function EmailProblems() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/admin/emails')
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')

  async function retry(item) {
    setBusyId(item.id)
    try {
      const res = await api.post(`/admin/emails/${item.id}/retry`)
      const r = res.data.result
      setNotice({ type: r.status === 'sent' ? 'success' : 'warning', text: r.new_code ? 'emailProblems.retriedNewCode' : 'emailProblems.retried', values: { status: t(`emailProblems.status.${r.status}`) } })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    } finally {
      setBusyId(null)
    }
  }

  // An unknown email type (e.g. from a newer server) is shown as its raw name
  const typeName = (type) => (t(`emailProblems.types.${type}`) === `emailProblems.types.${type}` ? type : t(`emailProblems.types.${type}`))
  const counts = data?.counts || {}
  const items = data?.items || []
  const statusOptions = [
    { value: 'all', label: t('table.allStatuses'), count: items.length },
    { value: 'failed', label: t('emailProblems.status.failed'), count: items.filter((i) => i.status === 'failed').length },
    { value: 'skipped', label: t('emailProblems.status.skipped'), count: items.filter((i) => i.status === 'skipped').length },
  ]
  const rows = items.filter((i) => (status === 'all' || i.status === status) && matches(search, i.recipient, typeName(i.type), i.error))

  const columns = [
    { key: 'time', header: t('emailProblems.time'), render: (item) => formatDateTime(item.time) },
    {
      key: 'type',
      header: t('emailProblems.type'),
      primary: true,
      render: (item) => (
        <>
          {typeName(item.type)}
          <span className="block break-all font-mono text-xs font-normal text-ink-soft">{item.recipient}</span>
        </>
      ),
    },
    {
      key: 'status',
      header: t('emailProblems.statusLabel'),
      render: (item) => (
        <>
          <Pill tone={item.status === 'failed' ? 'red' : 'amber'} icon={item.status === 'failed' ? 'alert' : 'clock'}>
            {t(`emailProblems.status.${item.status}`)}
          </Pill>
          <span className="mt-1 block text-xs text-ink-soft">
            {t('emailProblems.attemptsLabel')}: {item.attempts}
          </span>
        </>
      ),
    },
    { key: 'error', header: t('emailProblems.error'), full: true, render: (item) => <span className="block min-w-56 break-words text-risk-high-text">{item.error}</span> },
    {
      key: 'actions',
      header: t('table.actions'),
      full: true,
      render: (item) => (
        <Button variant="secondary" onClick={() => retry(item)} disabled={busyId === item.id}>
          {item.retry_issues_new_code ? t('emailProblems.retryNewCode') : t('emailProblems.retry')}
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('emailProblems.title')} meta={data && countLabel(t, rows.length)} />
      {notice && <Notice type={notice.type}>{t(notice.text, notice.values)}</Notice>}
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t('emailProblems.status.sent')} value={formatNumber(counts.sent || 0)} />
            <StatCard label={t('emailProblems.status.failed')} value={formatNumber(counts.failed || 0)} />
            <StatCard label={t('emailProblems.status.skipped')} value={formatNumber(counts.skipped || 0)} hint={t('emailProblems.skippedHint')} />
          </div>
          {counts.queued > 0 && <p className="text-sm text-ink-soft">{t('emailProblems.queued', { n: counts.queued })}</p>}
          <Toolbar>
            <SearchBox value={search} onChange={setSearch} />
            <FilterSelect label={t('table.byStatus')} value={status} onChange={setStatus} options={statusOptions} />
          </Toolbar>
          <WithFilters panel={<FilterPanel groups={[{ label: t('table.byStatus'), value: status, onChange: setStatus, options: statusOptions }]} />}>
            <DataTable
              caption={t('emailProblems.title')}
              columns={columns}
              rows={rows}
              rowKey={(item) => item.id}
              empty={search || status !== 'all' ? t('table.noMatch') : t('emailProblems.none')}
            />
          </WithFilters>
        </>
      )}
    </div>
  )
}
