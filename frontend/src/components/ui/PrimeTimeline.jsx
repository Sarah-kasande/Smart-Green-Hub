// Prime-window timeline (UI.md 5.4): one bar per batch from planting to the end of its prime window
// (best time to sell), with today marked. It shows at a glance which batches must be sold soon.
// Each row also says it in words ("Prime window ends 15/11/2026 · 23 days"), so colour is not needed.
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { formatDate } from '../../utils/format'
import { StatusBadge } from './Badges'

const DAY = 24 * 60 * 60 * 1000
const toTime = (date) => new Date(`${date}T00:00:00`).getTime()

export default function PrimeTimeline({ batches, limit = 6 }) {
  const { t } = useI18n()
  const today = new Date(new Date().toDateString()).getTime()
  const rows = batches
    .filter((b) => b.planting_date && b.prime_end_date && b.stage !== 'cleared')
    .sort((a, b) => toTime(a.prime_end_date) - toTime(b.prime_end_date))
    .slice(0, limit)
  if (rows.length === 0) return <p className="text-ink-soft">{t('batches.empty')}</p>

  // The time window shown: from the oldest planting date to the latest prime-window end (and today)
  const start = Math.min(today, ...rows.map((b) => toTime(b.planting_date)))
  const end = Math.max(today + 7 * DAY, ...rows.map((b) => toTime(b.prime_end_date)))
  const pct = (time) => `${((time - start) / (end - start)) * 100}%`
  const todayLeft = pct(today)

  return (
    <ul className="space-y-4">
      {rows.map((b) => {
        const planted = toTime(b.planting_date)
        const ready = toTime(b.expected_ready_date || b.prime_end_date)
        const primeEnd = toTime(b.prime_end_date)
        const daysLeft = Math.round((primeEnd - today) / DAY)
        return (
          <li key={b.id || b.client_uuid}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link to={b.id ? `/operator/batches/${b.id}` : '/operator/batches'} className="min-w-0 font-semibold hover:text-teal-text">
                {b.species?.common_name} {b.id ? `#${b.id}` : ''}
              </Link>
              <StatusBadge group="stages" status={b.stage} />
            </div>
            {/* The bar: growing time (light) and prime window (green); the dark line is today */}
            <div className="relative mt-2 h-3 rounded-full bg-canvas" aria-hidden="true">
              <span className="absolute inset-y-0 rounded-l-full bg-teal-light" style={{ left: pct(planted), width: `calc(${pct(ready)} - ${pct(planted)})` }} />
              <span className="absolute inset-y-0 rounded-r-full bg-leaf/70" style={{ left: pct(ready), width: `calc(${pct(primeEnd)} - ${pct(ready)})` }} />
              <span className="absolute -inset-y-1 w-0.5 rounded bg-ink" style={{ left: todayLeft }} />
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">
              {t('dashboard.primeEnds', { date: formatDate(b.prime_end_date) })} ·{' '}
              <span className={daysLeft <= 7 ? 'font-semibold text-risk-high-text' : ''}>
                {daysLeft > 0 ? t('alerts.daysLeft', { n: daysLeft }) : daysLeft === 0 ? t('dashboard.primeToday') : t('dashboard.primeOver')}
              </span>
            </p>
          </li>
        )
      })}
      <li className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-teal-light" /> {t('dashboard.legendGrowing')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-leaf/70" /> {t('dashboard.legendPrime')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-ink" /> {t('dashboard.legendToday')}
        </span>
      </li>
    </ul>
  )
}
