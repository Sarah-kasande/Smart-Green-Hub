// Public landing page. Phase 5 adds the nursery directory and aggregate impact figures
// (from real impact records only; never invented numbers).
import { Link } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { useI18n } from '../../i18n/I18nProvider'

const PILLARS = [
  { key: 'Predict', icon: 'bell', tone: 'bg-risk-medium text-risk-medium-text' },
  { key: 'Redirect', icon: 'board', tone: 'bg-teal-light text-teal' },
  { key: 'Plan', icon: 'calendar', tone: 'bg-info text-ink' },
  { key: 'Measure', icon: 'chart', tone: 'bg-leaf-light text-leaf-dark' },
]

export default function Landing() {
  const { t } = useI18n()
  return (
    <>
      <section className="bg-gradient-to-b from-leaf-light/60 to-canvas">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            {t('landing.title1')}
            <span className="block text-leaf">{t('landing.title2')}</span>
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
            <Icon name="check" size={16} className="text-leaf" />
            {t('landing.free')}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">{t('landing.pillarsTitle')}</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <li key={p.key} className="rounded-2xl border border-line bg-white p-5">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${p.tone}`}>
                <Icon name={p.icon} size={16} />
                {t(`landing.pillar${p.key}`)}
              </span>
              <p className="mt-3 text-ink-soft">{t(`landing.pillar${p.key}Text`)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
