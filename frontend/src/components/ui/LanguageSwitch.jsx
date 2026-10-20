// EN | Kinyarwanda switch, shown on every screen (FR18).
// For a signed-in user the choice is also saved on the account, so emails use it too.
import api from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import { useAuth } from '../../auth/AuthContext'

const OPTIONS = [
  { value: 'en', label: 'EN', full: 'English' },
  { value: 'rw', label: 'Kinyarwanda', full: 'Kinyarwanda' },
]

export default function LanguageSwitch({ className = '' }) {
  const { lang, setLang, t } = useI18n()
  const { user, refresh } = useAuth()

  async function choose(value) {
    if (value === lang) return
    setLang(value)
    if (user) {
      try {
        await api.patch('/me', { preferred_language: value })
        await refresh()
      } catch {
        // The screen already changed language; saving it on the account can be retried later.
      }
    }
  }

  return (
    <div role="group" aria-label={t('common.language')} className={`inline-flex rounded-xl border border-line bg-surface p-1 ${className}`}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          lang={option.value}
          aria-pressed={lang === option.value}
          // The spoken name starts with the visible text ("EN (English)"), as WCAG asks
          aria-label={option.label === option.full ? undefined : `${option.label} (${option.full})`}
          onClick={() => choose(option.value)}
          className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
            lang === option.value ? 'bg-navy text-white' : 'text-ink hover:bg-canvas'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
