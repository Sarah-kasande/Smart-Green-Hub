// Impact dashboard (FR12) for the signed-in role: totals, by district, by month and the records.
// Every number comes from confirmed hand-overs; with no records everything is 0.
import { useAuth } from '../../auth/AuthContext'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import BarChart from '../../components/ui/BarChart'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import { EmptyState, PageHeader, StatCard } from '../../components/ui/Layout'
import { formatDate, formatMonth, formatNumber } from '../../utils/format'

export function ImpactCards({ summary }) {
  const { t } = useI18n()
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label={t('impact.plants')} value={formatNumber(summary.plants_redirected)} icon="sprout" />
      <StatCard label={t('impact.handovers')} value={formatNumber(summary.handovers)} icon="check" tone="teal" />
      <StatCard label={t('impact.land')} value={`${formatNumber(summary.land_cleared_sqm, 1)} m²`} icon="board" tone="blue" />
      <StatCard label={t('impact.sites')} value={formatNumber(summary.planting_sites)} icon="home" tone="amber" />
    </div>
  )
}

export default function Impact() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { data, error } = useApi(`/${user.role}/impact`)

  if (error) return <Notice type="error">{t(`errors.${error}`)}</Notice>
  if (!data) return <PageLoader />
  const { summary, records } = data
  const showNursery = user.role !== 'operator'
  const showInstitution = user.role !== 'institution'

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={t('impact.title')} intro={t(`impact.intro.${user.role}`)} />
      <ImpactCards summary={summary} />
      {summary.handovers === 0 ? (
        <EmptyState icon="chart" title={t('impact.empty')} text={t('impact.emptyText')} />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-bold">{t('impact.monthly')}</h2>
              <BarChart title={t('impact.monthly')} data={summary.monthly.map((m) => ({ label: formatMonth(m.month), value: m.plants }))} colorClass="fill-teal" />
            </Card>
            <Card>
              <h2 className="mb-3 font-bold">{t('impact.byDistrict')}</h2>
              <BarChart title={t('impact.byDistrict')} data={summary.by_district.map((d) => ({ label: d.district, value: d.plants }))} />
            </Card>
          </div>
          <Card>
            <h2 className="mb-3 font-bold">{t('impact.records')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="py-2">{t('impact.date')}</th>
                    <th className="py-2">{t('batches.species')}</th>
                    <th className="py-2 text-right">{t('impact.quantity')}</th>
                    {showNursery && <th className="py-2">{t('impact.nursery')}</th>}
                    {showInstitution && <th className="py-2">{t('impact.institution')}</th>}
                    <th className="py-2">{t('requests.plantingSite')}</th>
                    <th className="py-2 text-right">{t('impact.landShort')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2">{formatDate(r.recorded_at)}</td>
                      <td className="py-2">{r.species}</td>
                      <td className="py-2 text-right font-semibold">{formatNumber(r.quantity_delivered)}</td>
                      {showNursery && <td className="py-2">{r.nursery}</td>}
                      {showInstitution && <td className="py-2">{r.institution}</td>}
                      <td className="py-2">
                        {r.planting_site} ({r.district})
                      </td>
                      <td className="py-2 text-right">{formatNumber(r.land_cleared_sqm, 1)} m²</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
