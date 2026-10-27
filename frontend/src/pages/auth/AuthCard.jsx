// The card used by all sign-in / registration / code screens (UI.md 5.2).
// Wide screens: a photo of Kigali's hills with a short message beside the form.
// Phones: the form only, so it starts right at the top.
import Photo from '../../components/ui/Photo'
import { PHOTOS } from '../../content/photos'
import { useI18n } from '../../i18n/I18nProvider'

export default function AuthCard({ title, intro, children, wide = false }) {
  const { t } = useI18n()
  return (
    <div className={`mx-auto w-full px-3 py-6 sm:px-4 sm:py-10 ${wide ? 'max-w-6xl' : 'max-w-5xl'}`}>
      <div className={`grid overflow-hidden rounded-3xl border border-line bg-surface shadow-sm lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ${wide ? 'lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]' : ''}`}>
        <div className="relative hidden min-h-[32rem] lg:block">
          <Photo photo={PHOTOS.sunset} sizes="40vw" className="absolute inset-0 h-full w-full" decorative />
          <div className="hero-shade absolute inset-0" aria-hidden="true" />
          <div className="glass absolute inset-x-5 bottom-5 rounded-2xl p-5">
            <p className="text-lg font-bold leading-snug">{t('landing.title1')}</p>
            <p className="font-bold text-leaf-text">{t('landing.title2')}</p>
            <p className="mt-2 text-sm text-ink-soft">{t('landing.free')}</p>
          </div>
        </div>
        <div className="p-5 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {intro && <p className="mt-2 text-ink-soft">{intro}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
