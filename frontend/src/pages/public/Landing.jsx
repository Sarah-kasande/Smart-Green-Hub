// Public landing page (UI.md 5.1), inspired by modern agriculture sites: calm heading, a full-width
// photo, a band of impact numbers, the four jobs as photo tiles, how it works, the nursery directory
// and a green call to action.
// Rules kept from before: the impact numbers come ONLY from confirmed hand-overs (never invented),
// and the directory lists only approved nurseries that agreed to be listed (FR03).
// Photos: free licences from Wikimedia Commons (src/content/photos.js, credits in the footer).
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, MapPin, Phone } from 'lucide-react'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import CountUp from '../../components/ui/CountUp'
import Photo from '../../components/ui/Photo'
import Reveal from '../../components/ui/Reveal'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { SelectField } from '../../components/ui/Fields'
import { Marquee } from '@/components/shadcn/marquee'
import { ShimmerButton } from '@/components/shadcn/shimmer-button'
import { Skeleton } from '@/components/shadcn/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { PHOTOS } from '../../content/photos'
import { DISTRICTS } from '../../utils/options'
import { formatNumber } from '../../utils/format'

// The map library is large: load it only when a map is shown
const PointsMap = lazy(() => import('../../components/map/Maps').then((m) => ({ default: m.PointsMap })))

const ORG_TYPES = ['school', 'church', 'sector_office', 'hotel', 'community_group']

function Hero() {
  const { t } = useI18n()
  const navigate = useNavigate()
  return (
    <section className="relative overflow-hidden">
      {/* A very light dot texture behind the heading (decorative) */}
      <div className="dot-pattern pointer-events-none absolute inset-0 [mask-image:radial-gradient(420px_circle_at_center,white,transparent)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-4 pb-10 pt-10 text-center sm:pt-16">
        <p className="glass mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-leaf-text">
          <span className="h-2 w-2 rounded-full bg-leaf" aria-hidden="true" />
          {t('landing.badge')}
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl">
          {t('landing.title1')}
          <span className="block text-leaf-text">{t('landing.title2')}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-soft text-pretty">{t('landing.intro')}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <ShimmerButton background="var(--color-leaf)" shimmerColor="#FFFFFF" className="min-h-12 px-6 text-base font-semibold" onClick={() => navigate('/register?role=operator')}>
            {t('landing.ctaNursery')}
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </ShimmerButton>
          <Link to="/register?role=institution" className={`${buttonClasses('secondary')} rounded-full px-6`}>
            {t('landing.ctaNeed')}
          </Link>
        </div>
        <p className="mt-4 text-sm text-ink-soft sm:hidden">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-teal-text underline">
            {t('common.signIn')}
          </Link>
        </p>
      </div>

      {/* Full-width photo with a caption on a dark shade */}
      <div className="px-3 sm:px-4">
        <div className="relative mx-auto h-[22rem] max-w-6xl overflow-hidden rounded-3xl sm:h-[32rem]">
          <Photo photo={PHOTOS.hero} sizes="(min-width: 1200px) 1150px, 100vw" priority className="absolute inset-0 h-full w-full" />
          <div className="hero-shade absolute inset-0" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8">
            <p className="max-w-md text-2xl font-bold leading-tight text-white sm:text-4xl">{t('landing.heroCaption')}</p>
            <a href="#directory" className="glass inline-flex min-h-12 items-center gap-2 self-start rounded-full px-5 font-semibold text-ink sm:self-auto">
              <MapPin className="size-4" aria-hidden="true" />
              {t('landing.heroLink')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// The four impact numbers, only from confirmed hand-overs (0 stays 0)
function ImpactBand() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/public/impact')
  const stats = [
    { label: t('impact.plants'), value: data?.plants_redirected },
    { label: t('impact.handovers'), value: data?.handovers },
    { label: t('impact.land'), value: data?.land_cleared_sqm, decimals: 1, suffix: ' m²' },
    { label: t('impact.sites'), value: data?.planting_sites },
  ]
  return (
    <section id="impact" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10" aria-labelledby="impact-title">
      <h2 id="impact-title" className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
        {t('landing.impactTitle')}
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-y-6 lg:grid-cols-4 lg:divide-x lg:divide-line">
        {stats.map((s) => (
          <li key={s.label} className="lg:px-6 lg:first:pl-0">
            <p className="text-3xl font-bold tracking-tight tabular-nums sm:text-5xl">
              {data ? (
                <>
                  <CountUp value={s.value} decimals={s.decimals || 0} />
                  {s.suffix || ''}
                </>
              ) : error ? (
                '—'
              ) : (
                <Skeleton className="h-10 w-24" />
              )}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">{s.label}</p>
          </li>
        ))}
      </ul>
      {error && <ErrorState code={error} onRetry={reload} className="mt-4" retryIcon="clock" />}
      {data && data.handovers === 0 && <p className="mt-4 text-sm text-ink-soft">{t('landing.impactEmpty')}</p>}
    </section>
  )
}

// The problem in one statement, and what changes for each group
function Why() {
  const { t } = useI18n()
  const groups = [
    ['nurseries', 'landing.forNurseries', 'landing.forNurseriesText'],
    ['institutions', 'landing.forInstitutions', 'landing.forInstitutionsText'],
    ['city', 'landing.forCity', 'landing.forCityText'],
  ]
  return (
    <section className="mx-auto grid max-w-6xl gap-8 border-t border-line px-4 py-12 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">{t('landing.problemLabel')}</p>
        <Tabs defaultValue="nurseries" className="mt-5">
          <TabsList className="h-auto flex-wrap rounded-full bg-canvas p-1">
            {groups.map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="min-h-10 rounded-full px-4">
                {t(label)}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map(([key, , text]) => (
            <TabsContent key={key} value={key} className="mt-4 text-ink-soft">
              {t(text)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <p className="text-2xl font-semibold leading-snug tracking-tight text-pretty sm:text-3xl">{t('landing.problemText')}</p>
    </section>
  )
}

// The four jobs as photo tiles (bento grid)
function Jobs() {
  const { t } = useI18n()
  const tiles = [
    { key: 'Predict', photo: PHOTOS.labelled, className: 'lg:col-span-2 lg:row-span-2' },
    { key: 'Redirect', photo: PHOTOS.planting, className: '' },
    { key: 'Plan', photo: PHOTOS.bags, className: '' },
    { key: 'Measure', photo: PHOTOS.hills, className: 'lg:col-span-2' },
  ]
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">{t('landing.pillarsTitle')}</h2>
        <p className="max-w-sm text-ink-soft">{t('landing.free')}</p>
      </div>
      <ul className="mt-8 grid auto-rows-[15rem] gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[14rem]">
        {tiles.map((tile, i) => (
          <li key={tile.key} className={tile.className}>
            <Reveal delay={60 * i} className="h-full">
              <article className="group relative h-full overflow-hidden rounded-3xl">
                <Photo photo={tile.photo} sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105" decorative />
                <div className="hero-shade absolute inset-0" aria-hidden="true" />
                <div className="glass absolute inset-x-3 bottom-3 rounded-2xl p-4">
                  <h3 className="font-bold">{t(`landing.pillar${tile.key}`)}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{t(`landing.pillar${tile.key}Text`)}</p>
                </div>
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Who receives the plants (the real institution types), as a slow moving strip
function Receivers() {
  const { t } = useI18n()
  return (
    <section className="mx-auto max-w-6xl px-4 py-6" aria-labelledby="receivers-title">
      <h2 id="receivers-title" className="text-center text-sm font-semibold uppercase tracking-wider text-ink-soft">
        {t('landing.receiversTitle')}
      </h2>
      <Marquee pauseOnHover className="mt-3 [--duration:30s] [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
        {ORG_TYPES.map((type) => (
          <span key={type} className="mx-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 font-semibold">
            <Check className="size-4 text-leaf-text" aria-hidden="true" />
            {t(`orgTypes.${type}`)}
          </span>
        ))}
      </Marquee>
    </section>
  )
}

function Steps() {
  const { t } = useI18n()
  return (
    <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="steps-title">
      <h2 id="steps-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
        {t('landing.howTitle')}
      </h2>
      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <li key={n} className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf-light font-bold text-leaf-text" aria-hidden="true">
              {n}
            </span>
            <h3 className="mt-4 font-bold">{t(`landing.step${n}`)}</h3>
            <p className="mt-1 text-sm text-ink-soft">{t(`landing.step${n}Text`)}</p>
          </li>
        ))}
      </ol>
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
    <section id="directory" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10" aria-labelledby="directory-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="directory-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('landing.directoryTitle')}
          </h2>
          <p className="mt-2 max-w-xl text-ink-soft">{t('landing.directoryIntro')}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-56">
            <SelectField label={t('auth.district')} value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t('common.all')} options={DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) }))} />
          </div>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} aria-label={t('board.view')} className="rounded-xl border border-line bg-surface p-1">
            <ToggleGroupItem value="list" className="min-h-10 rounded-lg px-4 font-semibold data-[state=on]:bg-navy data-[state=on]:text-white">
              {t('board.list')}
            </ToggleGroupItem>
            <ToggleGroupItem value="map" className="min-h-10 rounded-lg px-4 font-semibold data-[state=on]:bg-navy data-[state=on]:text-white">
              {t('board.map')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="mt-6">
        {error && <ErrorState code={error} onRetry={reload} retryIcon="clock" />}
        {!data && !error && <Skeleton className="h-40 rounded-3xl" />}
        {data && nurseries.length === 0 && <p className="rounded-3xl border border-dashed border-line bg-surface p-6 text-ink-soft">{t('landing.directoryEmpty')}</p>}
        {nurseries.length > 0 && view === 'list' && (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {nurseries.map((n) => (
              <li key={n.id} className="h-full rounded-3xl border border-line bg-surface p-5 shadow-xs">
                <p className="font-bold">{n.name}</p>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {t(`districts.${n.district}`)}, {n.sector}
                    {n.address_text ? ` · ${n.address_text}` : ''}
                  </span>
                </p>
                {n.contact_phone && (
                  <a href={`tel:${n.contact_phone}`} className="mt-3 inline-flex min-h-10 items-center gap-2 font-semibold text-teal-text underline">
                    <Phone className="size-4" aria-hidden="true" />
                    {n.contact_phone}
                  </a>
                )}
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
        {data && <p className="mt-3 text-sm text-ink-soft">{t('landing.directoryCount', { n: formatNumber(nurseries.length) })}</p>}
      </div>
    </section>
  )
}

// Green call-to-action band on a photo of Rwandan hills
function JoinBand() {
  const { t } = useI18n()
  return (
    <section className="px-3 py-10 sm:px-4">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl">
        <Photo photo={PHOTOS.hills} sizes="(min-width: 1200px) 1150px, 100vw" className="absolute inset-0 h-full w-full" decorative />
        <div className="photo-dim absolute inset-0" aria-hidden="true" />
        <div className="relative flex flex-col items-center px-5 py-14 text-center sm:py-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">{t('landing.ctaTitle')}</h2>
          <p className="mt-3 max-w-xl text-white/90">{t('landing.ctaText')}</p>
          <div className="glass mt-7 flex w-full max-w-md flex-col gap-2 rounded-3xl p-2 sm:flex-row sm:rounded-full">
            <Link to="/register?role=operator" className={`${buttonClasses('primary', true)} rounded-full`}>
              {t('landing.ctaNursery')}
            </Link>
            <Link to="/register?role=institution" className={`${buttonClasses('secondary', true)} rounded-full`}>
              {t('landing.ctaInstitution')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  // The top of the page is drawn first; the sections further down are built a moment later, when the
  // phone is idle. On slow phones this makes the first screen appear much sooner (NFR01).
  const [rest, setRest] = useState(false)
  useEffect(() => {
    const show = () => setRest(true)
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(show, { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(show, 300)
    return () => clearTimeout(id)
  }, [])

  return (
    <>
      <Hero />
      <ImpactBand />
      {rest ? (
        // "below-fold": the browser skips drawing these until they come near the screen
        <div className="below-fold">
          <Why />
          <Jobs />
          <Receivers />
          <Steps />
          <Directory />
          <JoinBand />
        </div>
      ) : (
        <div className="min-h-[60rem]" aria-hidden="true" />
      )}
    </>
  )
}
