// Planting recommendations (FR08): a suggested quantity per species with its basis, or
// "not enough sales history" instead of a number.
import { useState } from 'react'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import { Disclosure, EmptyState, PageHeader } from '../../components/ui/Layout'
import { formatDate, formatNumber } from '../../utils/format'

export default function Planting() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/operator/planting')
  const [notice, setNotice] = useState(null)

  async function decide(speciesId, status) {
    try {
      await api.post(`/operator/planting/${speciesId}`, { status })
      setNotice({ type: 'success', text: `planting.${status}` })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={t('planting.title')} intro={t('planting.intro')} />
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && data.recommendations.length === 0 && <EmptyState icon="calendar" title={t('planting.empty')} text={t('planting.emptyText')} />}
      {data && data.recommendations.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.recommendations.map((r) => (
            <li key={r.species_id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold">{r.species}</h2>
                  {r.last_decision && (
                    <Pill tone={r.last_decision.status === 'accepted' ? 'green' : 'grey'} icon={r.last_decision.status === 'accepted' ? 'check' : 'close'}>
                      {t(`planting.status.${r.last_decision.status}`)} · {formatDate(r.last_decision.at)}
                    </Pill>
                  )}
                </div>
                {r.enough_history ? (
                  <>
                    <p className="text-3xl font-bold">{t('planting.plantAbout', { n: formatNumber(r.quantity) })}</p>
                    <Disclosure summary={t('planting.basisTitle')}>
                      <ul className="space-y-1 text-sm">
                        <li>{t('planting.basis.sold', { n: formatNumber(r.basis.units_last_3_months), avg: formatNumber(r.basis.average_monthly, 1) })}</li>
                        <li>{t('planting.basis.cycle', { days: r.basis.days_to_ready, months: formatNumber(r.basis.cycle_months, 1) })}</li>
                        <li>{t('planting.basis.margin', { p: Math.round(r.basis.safety_margin * 100) })}</li>
                        <li>{t('planting.basis.pipeline', { n: formatNumber(r.basis.pipeline) })}</li>
                        <li className="font-semibold">
                          {t('planting.basis.formula', {
                            avg: formatNumber(r.basis.average_monthly, 1),
                            months: formatNumber(r.basis.cycle_months, 1),
                            m: formatNumber(1 + r.basis.safety_margin, 2),
                            pipeline: formatNumber(r.basis.pipeline),
                            n: formatNumber(r.quantity),
                          })}
                        </li>
                      </ul>
                    </Disclosure>
                    <div className="mt-auto flex flex-wrap gap-2">
                      <Button icon="check" onClick={() => decide(r.species_id, 'accepted')}>
                        {t('planting.accept')}
                      </Button>
                      <Button variant="ghost" icon="close" onClick={() => decide(r.species_id, 'dismissed')}>
                        {t('planting.dismiss')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Notice type="info">
                    <p className="font-semibold">{t('planting.notEnough')}</p>
                    <p>{t('planting.notEnoughText')}</p>
                    {r.basis.first_sale_date && <p className="mt-1">{t('planting.firstSale', { date: formatDate(r.basis.first_sale_date) })}</p>}
                  </Notice>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
