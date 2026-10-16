import { Link } from 'react-router-dom'
import Icon from './Icon'
import { useI18n } from '../../i18n/I18nProvider'

export default function Logo({ to = '/', light = false }) {
  const { t } = useI18n()
  return (
    <Link to={to} className="inline-flex min-h-12 items-center gap-2">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-leaf text-white">
        <Icon name="leaf" size={22} />
      </span>
      <span className="leading-tight">
        <span className={`block font-bold ${light ? 'text-white' : 'text-ink'}`}>{t('app.name')}</span>
        <span className={`block text-xs ${light ? 'text-white/70' : 'text-ink-soft'}`}>{t('app.tagline')}</span>
      </span>
    </Link>
  )
}
