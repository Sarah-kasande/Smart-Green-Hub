// Receiving institution dashboard: requests at a glance and plants received.
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/Layout'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { formatNumber } from '../../utils/format'
import AccountHome from '../account/AccountHome'

function Dashboard() {
  const { t } = useI18n()
  const { user, organisation } = useAuth()
  const { data, error, reload } = useApi('/institution/dashboard')
  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-leaf-text">{organisation.name}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('account.welcome', { name: user.full_name })}</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('institutionHome.pending')} value={formatNumber(data.requests.pending)} icon="clock" tone="amber" />
        <StatCard label={t('institutionHome.approved')} value={formatNumber(data.requests.approved)} hint={t('institutionHome.approvedHint')} icon="check" tone="teal" />
        <StatCard label={t('impact.plants')} value={formatNumber(data.impact.plants_redirected)} icon="sprout" />
        <StatCard label={t('impact.sites')} value={formatNumber(data.impact.planting_sites)} icon="home" tone="blue" />
      </div>
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">{t('institutionHome.findTitle')}</h2>
          <p className="text-ink-soft">{t('institutionHome.findText')}</p>
        </div>
        <Link to="/institution/board" className={buttonClasses('primary')}>
          <Icon name="board" />
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
