// Shown when data could not be loaded: a clear message and a "Try again" button.
// Every page uses this instead of showing "Loading..." forever.
import Button from './Button'
import Notice from './Notice'
import { useI18n } from '../../i18n/I18nProvider'

export default function ErrorState({ code, onRetry, className = '' }) {
  const { t } = useI18n()
  return (
    <Notice type="error" className={className}>
      <p>{t(`errors.${code}`)}</p>
      {onRetry && (
        <Button variant="secondary" icon="clock" onClick={onRetry} className="mt-2">
          {t('common.tryAgain')}
        </Button>
      )}
    </Notice>
  )
}
