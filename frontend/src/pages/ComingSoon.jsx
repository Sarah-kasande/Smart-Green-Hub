// Placeholder for menu items that later phases will build.
import Card from '../components/ui/Card'
import Icon from '../components/ui/Icon'
import { useI18n } from '../i18n/I18nProvider'

export default function ComingSoon({ title }) {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">{t(title)}</h1>
      <Card className="flex items-center gap-3 text-ink-soft">
        <Icon name="clock" />
        {t('common.comingSoon')}
      </Card>
    </div>
  )
}
