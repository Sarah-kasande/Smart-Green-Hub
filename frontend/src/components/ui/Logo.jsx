import { Link } from 'react-router-dom'
import Icon from './Icon'
import { useI18n } from '../../i18n/I18nProvider'

// compact (signed-in top bar): no tagline, and on phones only the leaf mark is visible
// (the name stays readable for screen readers).
export default function Logo({ to = '/', light = false, compact = false }) {
  const { t } = useI18n()
  return (
    <Link to={to} className="inline-flex min-h-12 items-center gap-2">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-leaf text-white">
        <Icon name="leaf" size={22} />
      </span>
      <span className={`leading-tight ${compact ? 'sr-only sm:not-sr-only' : ''}`}>
        <span className={`block font-bold ${light ? 'text-white' : 'text-ink'}`}>{t('app.name')}</span>
        {!compact && <span className={`block text-xs ${light ? 'text-white/70' : 'text-ink-soft'}`}>{t('app.tagline')}</span>}
      </span>
    </Link>
  )
}
