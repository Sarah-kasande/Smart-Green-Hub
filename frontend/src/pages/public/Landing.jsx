// Public landing page (design/home landing page.png): what the platform does, aggregate impact
// figures (from real impact records only, never invented numbers) and the directory of approved
// nurseries that agreed to be listed (FR03). No risk information is ever shown here.
import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import Icon from '../../components/ui/Icon'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { SelectField } from '../../components/ui/Fields'
import { Segmented } from '../../components/ui/Layout'
import { DISTRICTS } from '../../utils/options'
import { formatNumber } from '../../utils/format'

// The map library is large: load it only when a map is shown
const PointsMap = lazy(() => import('../../components/map/Maps').then((m) => ({ default: m.PointsMap })))

const PILLARS = [
  { key: 'Predict', icon: 'bell', tone: 'bg-risk-medium text-risk-medium-text' },
  { key: 'Redirect', icon: 'board', tone: 'bg-teal-light text-teal-text' },
  { key: 'Plan', icon: 'calendar', tone: 'bg-info text-ink' },
  { key: 'Measure', icon: 'chart', tone: 'bg-leaf-light text-leaf-text' },
]

function ImpactStats() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/public/impact')
  const stats = [
    { label: t('impact.plants'), value: data ? formatNumber(data.plants_redirected) : error ? '—' : '…', icon: 'sprout' },
    { label: t('impact.handovers'), value: data ? formatNumber(data.handovers) : error ? '—' : '…', icon: 'check' },
    { label: t('impact.land'), value: data ? `${formatNumber(data.land_cleared_sqm, 1)} m²` : error ? '—' : '…', icon: 'board' },
    { label: t('impact.sites'), value: data ? formatNumber(data.planting_sites) : error ? '—' : '…', icon: 'home' },
  ]
  return (
    <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="impact-title">
      <h2 id="impact-title" className="text-2xl font-bold">
        {t('landing.impactTitle')}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Card className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink-soft">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-leaf-light text-leaf-text">
                <Icon name={s.icon} />
              </span>
            </Card>
          </li>
        ))}
      </ul>
      {error && <ErrorState code={error} onRetry={reload} className="mt-3" retryIcon="clock" />}
      {data && data.handovers === 0 && <p className="mt-3 text-sm text-ink-soft">{t('landing.impactEmpty')}</p>}
    </section>
  )
}

function Directory() {
  const { t } = useI18n()
  const [district, setDistrict] = useState('')
  const [view, setView] = useState('list')
  const { data, error, reload } = useApi(`/public/directory${qs({ district })}`)
  const nurseries = data?.nurseries || []

  return (
    <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="directory-title">
      <h2 id="directory-title" className="text-2xl font-bold">
        {t('landing.directoryTitle')}
      </h2>
      <p className="mt-1 text-ink-soft">{t('landing.directoryIntro')}</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <SelectField label={t('auth.district')} value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t('common.all')} options={DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))} />
        </div>
        <Segmented
          label={t('board.view')}
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: t('board.list') },
            { value: 'map', label: t('board.map') },
          ]}
        />
      </div>
      <div className="mt-4">
        {error && <ErrorState code={error} onRetry={reload} retryIcon="clock" />}
        {data && nurseries.length === 0 && <Card className="text-ink-soft">{t('landing.directoryEmpty')}</Card>}
        {nurseries.length > 0 && view === 'list' && (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {nurseries.map((n) => (
              <li key={n.id}>
                <Card className="h-full">
                  <p className="font-bold">{n.name}</p>
                  <p className="text-sm text-ink-soft">
                    {t(`districts.${n.district}`)}, {n.sector}
                    {n.address_text ? ` · ${n.address_text}` : ''}
                  </p>
                  {n.contact_phone && (
                    <a href={`tel:${n.contact_phone}`} className="mt-2 inline-flex min-h-10 items-center gap-2 font-semibold text-teal-text underline">
                      <Icon name="phone" size={18} />
                      {n.contact_phone}
                    </a>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
        {nurseries.length > 0 && view === 'map' && (
          <Suspense fallback={<PageLoader />}>
            <PointsMap
            label={t('landing.directoryTitle')}
            points={nurseries.map((n) => ({ id: n.id, lat: n.latitude, lng: n.longitude, title: n.name, lines: [`${n.district}, ${n.sector}`, n.contact_phone || ''] }))}
          />
          </Suspense>
        )}
      </div>
    </section>
  )
}

export default function Landing() {
  const { t } = useI18n()
  return (
    <>
      <section className="bg-gradient-to-b from-leaf-light/60 to-canvas">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            {t('landing.title1')}
            <span className="block text-leaf-text">{t('landing.title2')}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">{t('landing.intro')}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/register?role=operator" className={buttonClasses('primary')}>
              <Icon name="sprout" />
              {t('landing.ctaNursery')}
            </Link>
            <Link to="/register?role=institution" className={buttonClasses('secondary')}>
              <Icon name="building" />
              {t('landing.ctaInstitution')}
            </Link>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <Icon name="check" size={16} className="text-leaf-text" />
            {t('landing.free')}
          </p>
        </div>
      </section>

      <ImpactStats />

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-bold">{t('landing.pillarsTitle')}</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <li key={p.key} className="rounded-2xl border border-line bg-surface p-5">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${p.tone}`}>
                <Icon name={p.icon} size={16} />
                {t(`landing.pillar${p.key}`)}
              </span>
              <p className="mt-3 text-ink-soft">{t(`landing.pillar${p.key}Text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <Directory />
    </>
  )
}
