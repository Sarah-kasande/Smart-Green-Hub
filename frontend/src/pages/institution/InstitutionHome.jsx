// Receiving institution dashboard (UI.md 5.5):
//  - 4 key numbers (plants received, hand-overs, planting sites, requests in progress)
//  - request tracker: each open request as steps Requested -> Approved -> Handed over -> You confirmed
//  - plants available near you (Surplus Board in the institution's district) and a small map
//  - plants received per month
// Everything comes from the existing API (dashboard, requests, board).
import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import Stepper from '../../components/ui/Stepper'
import useIdleReady from '../../components/ui/useIdleReady'
import VerificationBadge from '../../components/ui/VerificationBadge'
import { Pill, StatusBadge } from '../../components/ui/Badges'
import { PageHeader, SectionTitle, StatCard } from '../../components/ui/Layout'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { SimpleBarChart } from '../../components/charts'
import { Skeleton } from '@/components/shadcn/skeleton'
import { formatDate, formatMonth, formatNumber, formatRWF } from '../../utils/format'
import { greetingKey } from '../../utils/greeting'
import AccountHome from '../account/AccountHome'

// The map library is large: load it only when the map is shown
const PointsMap = lazy(() => import('../../components/map/Maps').then((m) => ({ default: m.PointsMap })))

function RequestTracker() {
  const { t } = useI18n()
  const { data } = useApi('/institution/requests?status=all')
  const open = (data?.requests || []).filter((r) => ['pending', 'approved'].includes(r.status)).slice(0, 4)
  return (
    <Card className="h-full">
      <SectionTitle
        actions={
          <Link to="/institution/requests" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-teal-text">
            {t('dashboard.viewAll')} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      >
        {t('institutionHome.tracker')}
      </SectionTitle>
      {!data ? (
        <Skeleton className="mt-4 h-24" />
      ) : open.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line p-5">
          <p className="font-semibold">{t('institutionHome.noOpen')}</p>
          <Link to="/institution/board" className={`${buttonClasses('primary')} mt-3`}>
            {t('institutionHome.browse')}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-5">
          {open.map((r) => {
            const waitingForUs = r.status === 'approved' && !r.institution_confirmed_at
            return (
              <li key={r.id} className="rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {formatNumber(r.quantity_requested)} × {r.species}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {r.nursery?.name} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  <StatusBadge group="requestStatus" status={r.status} />
                </div>
                <div className="mt-3">
                  <Stepper
                    label={t('institutionHome.tracker')}
                    steps={[
                      { label: t('institutionHome.stepRequested'), done: true },
                      { label: t('institutionHome.stepApproved'), done: r.status === 'approved' },
                      { label: t('institutionHome.stepHandedOver'), done: Boolean(r.nursery_confirmed_at) },
                      { label: t('institutionHome.stepReceived'), done: Boolean(r.institution_confirmed_at) },
                    ]}
                  />
                </div>
                {waitingForUs && (
                  <Link to="/institution/requests" className={`${buttonClasses('primary')} mt-3`}>
                    {t('requests.confirmReceipt')}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function NearYou({ district }) {
  const { t } = useI18n()
  const near = useApi(`/board${qs({ district })}`)
  const listings = (near.data?.listings || []).slice(0, 4)
  const points = []
  for (const l of near.data?.listings || []) {
    if (!l.nursery || points.some((p) => p.id === l.nursery.id)) continue
    points.push({ id: l.nursery.id, lat: l.nursery.latitude, lng: l.nursery.longitude, title: l.nursery.name, lines: [l.species?.name] })
  }
  return (
    <Card>
      <SectionTitle
        actions={
          <Link to="/institution/board" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-teal-text">
            {t('institutionHome.seeAll')} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      >
        {t('institutionHome.nearYou', { district: t(`districts.${district}`) })}
      </SectionTitle>
      {!near.data ? (
        <Skeleton className="mt-4 h-40" />
      ) : listings.length === 0 ? (
        <p className="mt-4 text-ink-soft">{t('board.empty')}</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {listings.map((l) => (
              <li key={l.id} className="flex flex-col rounded-2xl border border-line bg-canvas/60 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-semibold">{l.species?.name}</p>
                  {l.offer_type === 'free' ? (
                    <Pill tone="green" icon="check">
                      {t('listings.free')}
                    </Pill>
                  ) : (
                    <Pill tone="blue" icon="wallet">
                      {formatRWF(l.discounted_price)}
                    </Pill>
                  )}
                </div>
                <p className="mt-1 font-bold tabular-nums text-leaf-text">{t('board.left', { n: formatNumber(l.remaining) })}</p>
                <p className="mt-1 flex items-start gap-1 text-sm text-ink-soft">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {l.nursery?.name}
                </p>
                <p className="text-xs text-ink-soft">{t('board.until', { date: formatDate(l.expires_at) })}</p>
              </li>
            ))}
          </ul>
          <Suspense fallback={<Skeleton className="h-64" />}>
            <PointsMap points={points} label={t('board.map')} height={280} />
          </Suspense>
        </div>
      )}
    </Card>
  )
}

function Dashboard() {
  const { t } = useI18n()
  const { user, organisation } = useAuth()
  const { data, error, reload } = useApi('/institution/dashboard')
  const restReady = useIdleReady()
  if (error && !data) return <ErrorState code={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const requests = data.requests || {}
  const impact = data.impact || {}
  const monthly = impact.monthly || []

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t(greetingKey(), { name: user.full_name.split(' ')[0] })}
        meta={
          <span className="inline-flex flex-wrap items-center gap-2">
            {organisation.name}
            <VerificationBadge status={organisation.verification_status} />
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t('impact.plants')} count={impact.plants_redirected || 0} />
        <StatCard label={t('impact.handovers')} count={impact.handovers || 0} />
        <StatCard label={t('impact.sites')} count={impact.planting_sites || 0} />
        <StatCard label={t('institutionHome.inProgress')} count={(requests.pending || 0) + (requests.approved || 0)} hint={t('institutionHome.inProgressHint', { pending: requests.pending || 0, approved: requests.approved || 0 })} />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RequestTracker />
        </div>
        <Card className="lg:col-span-5">
          <SectionTitle>{t('impact.monthly')}</SectionTitle>
          <div className="mt-4">
            {monthly.length > 0 ? (
              <SimpleBarChart title={t('impact.monthly')} valueLabel={t('impact.plants')} data={monthly.map((m) => ({ label: formatMonth(m.month), value: m.plants }))} format={(v) => formatNumber(v)} color="var(--chart-2)" />
            ) : (
              <p className="text-ink-soft">{t('impact.emptyText')}</p>
            )}
          </div>
        </Card>
      </div>

      {/* The board and its map are drawn right after the first screen */}
      {restReady && <NearYou district={organisation.district} />}
    </div>
  )
}

export default function InstitutionHome() {
  const { organisation } = useAuth()
  if (organisation?.verification_status !== 'approved') return <AccountHome />
  return <Dashboard />
}
