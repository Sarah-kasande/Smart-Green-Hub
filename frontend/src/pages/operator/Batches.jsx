// Batch inventory (FR04): list with stage filter.
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useBatches } from '../../offline/useOfflineData'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import { Pill, StatusBadge } from '../../components/ui/Badges'
import { EmptyState, PageHeader, Segmented } from '../../components/ui/Layout'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { formatDate, formatNumber, formatRWF } from '../../utils/format'

const STAGES = ['', 'seedling', 'growing', 'ready', 'overgrown', 'cleared']

export function BatchCard({ batch }) {
  const { t } = useI18n()
  const content = (
    <Card className="flex h-full flex-col gap-3 hover:border-teal">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{batch.species?.common_name}</p>
          <p className="text-sm text-ink-soft">{batch.id ? `#${batch.id}` : t('sync.notYetSynced')} · {t('batches.planted', { date: formatDate(batch.planting_date) })}</p>
        </div>
        <StatusBadge group="stages" status={batch.stage} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-ink-soft">{t('batches.inStock')}</dt>
          <dd className="text-lg font-bold">{formatNumber(batch.quantity_current)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">{t('batches.availableLabel')}</dt>
          <dd className="text-lg font-bold">{formatNumber(batch.available ?? batch.quantity_current)}</dd>
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
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <Icon name="info" size={16} />
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
  const { batches, offline } = useBatches(stage === 'cleared' ? 'cleared' : stage)
  const notice = useLocation().state?.notice

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={t('batches.title')}
        intro={t('batches.intro')}
        actions={
          <Link to="/operator/batches/new" className={buttonClasses('primary')}>
            <Icon name="sprout" />
            {t('batches.add')}
          </Link>
        }
      />
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      {offline && <Notice type="warning">{t('sync.offlineCopy')}</Notice>}
      <Segmented
        label={t('batches.stage')}
        value={stage}
        onChange={setStage}
        options={STAGES.map((s) => ({ value: s, label: s ? t(`stages.${s}`) : t('batches.allActive') }))}
      />
      {!batches && <PageLoader />}
      {batches && batches.length === 0 && (
        <EmptyState
          icon="sprout"
          title={t('batches.empty')}
          text={t('batches.emptyText')}
          action={
            <Link to="/operator/batches/new" className={buttonClasses('primary')}>
              {t('batches.add')}
            </Link>
          }
        />
      )}
      {batches && batches.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {batches.map((b) => (
            <li key={b.id || b.client_uuid}>
              <BatchCard batch={b} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
