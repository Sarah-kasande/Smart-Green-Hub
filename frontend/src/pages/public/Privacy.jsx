// Privacy Policy (Rwanda Law N° 058/2021, Article 42: information given when personal data is collected).
// Public page, linked from the footer, the registration form and Settings. The text lives in i18n
// (privacyPolicy.*) so it is shown in English and Kinyarwanda. Every promise here matches what the code does:
// keep both in step when either changes.
import { useI18n } from '../../i18n/I18nProvider'

const SECTIONS = ['who', 'collect', 'why', 'see', 'where', 'keep', 'rights', 'alerts', 'security', 'storage', 'changes']

export default function Privacy() {
  const { t } = useI18n()
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">{t('privacyPolicy.title')}</h1>
      <p className="mt-1 text-sm text-ink-soft">{t('privacyPolicy.updated')}</p>
      <p className="mt-4">{t('privacyPolicy.intro')}</p>
      {SECTIONS.map((key, index) => (
        <section key={key} className="mt-8" aria-labelledby={`privacy-${key}`}>
          <h2 id={`privacy-${key}`} className="text-lg font-semibold">
            {index + 1}. {t(`privacyPolicy.${key}.title`)}
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {t(`privacyPolicy.${key}.points`)
              .split('\n')
              .map((point) => (
                <li key={point}>{point}</li>
              ))}
          </ul>
        </section>
      ))}
    </article>
  )
}
