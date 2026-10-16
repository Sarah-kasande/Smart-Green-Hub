import { useI18n } from '../../i18n/I18nProvider'

export default function PageLoader() {
  const { t } = useI18n()
  return (
    <div role="status" className="grid min-h-[50vh] place-items-center text-ink-soft">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-leaf border-t-transparent" aria-hidden="true" />
        {t('common.loading')}
      </div>
    </div>
  )
}
