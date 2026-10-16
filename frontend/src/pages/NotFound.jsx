import { Link } from 'react-router-dom'
import { buttonClasses } from '../components/ui/buttonStyles'
import { useI18n } from '../i18n/I18nProvider'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{t('notFound.title')}</h1>
      <p className="mt-2 text-ink-soft">{t('notFound.text')}</p>
      <Link to="/" className={`${buttonClasses('primary')} mt-6`}>
        {t('notFound.home')}
      </Link>
    </div>
  )
}
