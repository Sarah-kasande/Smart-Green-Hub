// Receiving institution dashboard: requests at a glance and plants received.
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader, StatCard } from '../../components/ui/Layout'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { formatNumber } from '../../utils/format'
import AccountHome from '../account/AccountHome'

function Dashboard() {
  const { t } = useI18n()
  const { organisation } = useAuth()
  const { data, error, reload } = useApi('/institution/dashboard')
  const requests = data?.requests || {}
  const impact = data?.impact || {}
  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t('nav.dashboard')} meta={organisation.name} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('institutionHome.pending')} value={formatNumber(requests.pending || 0)} />
        <StatCard label={t('institutionHome.approved')} value={formatNumber(requests.approved || 0)} hint={t('institutionHome.approvedHint')} />
        <StatCard label={t('impact.plants')} value={formatNumber(impact.plants_redirected || 0)} />
        <StatCard label={t('impact.sites')} value={formatNumber(impact.planting_sites || 0)} />
      </div>
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('institutionHome.findTitle')}</h2>
          <p className="text-ink-soft">{t('institutionHome.findText')}</p>
        </div>
        <Link to="/institution/board" className={buttonClasses('primary')}>
          {t('nav.surplusBoard')}
        </Link>
      </Card>
    </div>
  )
}

export default function InstitutionHome() {
  const { organisation } = useAuth()
  if (organisation?.verification_status !== 'approved') return <AccountHome />
  return <Dashboard />
}
