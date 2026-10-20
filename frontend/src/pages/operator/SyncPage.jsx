// What is waiting on this phone, and what the server refused (FR13, NFR06).
import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useSync } from '../../offline/SyncProvider'
import { db } from '../../offline/db'
import { discard, subscribe } from '../../offline/sync'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import { Pill } from '../../components/ui/Badges'
import { EmptyState, PageHeader } from '../../components/ui/Layout'
import { formatDateTime, formatNumber, formatRWF } from '../../utils/format'

function describe(t, row) {
  const d = row.data
  if (row.type === 'sale') return t('sync.describe.sale', { n: formatNumber(d.quantity) })
  if (row.type === 'expense') return t('sync.describe.expense', { amount: formatRWF(d.amount), category: t(`expenseCategories.${d.category}`) })
  if (row.type === 'batch') return t('sync.describe.batch', { n: formatNumber(d.quantity) })
  return t('sync.describe.stock_adjustment', { n: d.quantity_change, reason: d.reason })
}

export default function SyncPage() {
  const { t } = useI18n()
  const { online, syncNow, lastResult, syncing } = useSync()
  const [rows, setRows] = useState([])

  useEffect(() => {
    const load = () => db.outbox.orderBy('id').toArray().then(setRows)
    load()
    return subscribe(load)
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={t('sync.title')}
        intro={t('sync.intro')}
        actions={
          <Button icon="clock" onClick={syncNow} disabled={!online || syncing}>
            {t('sync.syncNow')}
          </Button>
        }
      />
      {!online && <Notice type="warning">{t('sync.offlineNow')}</Notice>}
      {lastResult && !lastResult.error && (
        <Notice type="success">{t('sync.lastResult', { applied: lastResult.applied, skipped: lastResult.skipped, conflicts: lastResult.conflicts, time: formatDateTime(lastResult.at) })}</Notice>
      )}
      {rows.length === 0 ? (
        <EmptyState icon="check" title={t('sync.allSynced')} />
      ) : (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{describe(t, row)}</p>
                  <p className="text-sm text-ink-soft">{formatDateTime(row.created_at)}</p>
                  {row.status === 'conflict' && <p className="text-sm text-risk-high-text">{t(`errors.${row.error}`, { available: row.details?.available ?? '' })}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {row.status === 'pending' ? (
                    <Pill tone="amber" icon="clock">
                      {t('sync.waitingOne')}
                    </Pill>
                  ) : (
                    <>
                      <Pill tone="red" icon="alert">
                        {t('sync.refused')}
                      </Pill>
                      <Button variant="ghost" icon="close" onClick={() => discard(row.id)}>
                        {t('sync.discard')}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-sm text-ink-soft">{t('sync.serverWins')}</p>
    </div>
  )
}
