// Shown while a page loads: grey blocks in the shape of the page (skeleton), never an endless spinner.
// "Loading…" is still read out to screen readers.
import { Skeleton } from '@/components/shadcn/skeleton'
import { useI18n } from '../../i18n/I18nProvider'

export default function PageLoader() {
  const { t } = useI18n()
  return (
    <div role="status" className="space-y-4 py-2">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-8 w-56 max-w-full" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  )
}
